import type { GenerateRequest, GenerateResult, ImageProvider, QAResult } from "./types";
import { buildPrompt } from "./prompt";
import { placeholderProvider } from "./placeholder";
import { config } from "@/lib/config";

// Parse a data URL into a Blob plus its real file extension. Using the correct
// extension matters: OpenAI's edit endpoint rejects a JPEG sent as ".png".
function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const bin = Buffer.from(m[2], "base64");
  const ext = (mime.split("/")[1] || "png").replace("jpeg", "jpg");
  return { blob: new Blob([bin], { type: mime }), ext };
}

// Abort a few seconds before Vercel's 60s function limit so a slow generation
// degrades to the placeholder instead of a hard 504 timeout.
async function fetchWithTimeout(url: string, init: RequestInit, ms = 45000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Vision QA: a fast model inspects the render for the failures gpt-image-1
 * actually makes — misspelled text, mangled logos, manufacturer badges.
 * Never throws; a QA outage just returns undefined and the render ships.
 */
async function runQA(imageUrl: string, req: GenerateRequest, budgetMs: number): Promise<QAResult | undefined> {
  if (budgetMs < 6000) return undefined; // not enough time left in the lambda
  const b = req.design.branding;
  // The front fender (where the phone lives) is barely visible from the rear
  // 3/4 corner — checking its exact text there just produces false failures.
  const phoneVisible = (req.angle || "front34") === "front34";
  const checks = [
    b.businessName ? `the business name reads exactly "${b.businessName}"` : "",
    b.phone && phoneVisible ? `the phone number reads exactly "${b.phone}"` : "",
    b.website ? `the website reads exactly "${b.website}"` : "",
    b.logoDataUrl ? "the company logo looks clean and undistorted (not warped, smeared or redrawn)" : "",
    "there are NO manufacturer badges/emblems (Ford, Chevy, GMC, Toyota, Tesla logos etc.) anywhere on the vehicle",
    "there is no gibberish or misspelled lettering anywhere",
  ].filter(Boolean);
  try {
    const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `Inspect this AI-generated vehicle wrap mockup. Verify each item:\n${checks.map((c, i) => `${i + 1}. ${c}`).join("\n")}\nRespond as JSON: {"passed": boolean, "issues": string[]} — passed=true only if ALL items check out; issues lists each failure in plain words (max 8 words each).`,
            },
            { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
          ],
        }],
      }),
    }, Math.min(budgetMs, 10000));
    if (!res.ok) return undefined;
    const json = await res.json();
    const parsed = JSON.parse(json?.choices?.[0]?.message?.content || "{}");
    if (typeof parsed.passed !== "boolean") return undefined;
    return { passed: parsed.passed, issues: Array.isArray(parsed.issues) ? parsed.issues.map(String).slice(0, 6) : [] };
  } catch {
    return undefined;
  }
}

/**
 * OpenAI Images (gpt-image-1), 1536x1024. Quality is tiered by the request:
 * concepts render "low" (fast, cheap drafts), finalize renders "high".
 * - Photo/template available: image edit (keeps the exact vehicle), with the
 *   real logo attached as a second reference image.
 * - Otherwise: text-to-image on a class-appropriate stock vehicle.
 * Any failure falls back to the placeholder provider — the flow never dies.
 */
export const openaiProvider: ImageProvider = {
  name: "openai",
  async generate(req: GenerateRequest): Promise<GenerateResult> {
    if (!config.openaiKey) return placeholderProvider.generate(req);
    const prompt = buildPrompt(req);
    const quality = req.quality || "medium";
    const started = Date.now();
    try {
      let res: Response | null = null;

      // Prefer the AI-generated template for THIS angle; fall back to the raw
      // photo (the edit preserves the base image's camera angle, so a template
      // from the wrong corner would fight the requested framing).
      const baseImage = req.vehicle.templateUrls?.[req.angle || "front34"] || req.vehicle.photos[0];
      if (baseImage) {
        const parsed = dataUrlToBlob(baseImage);
        if (parsed) {
          // Attach the real logo as a second reference image so it's copied,
          // not invented. OpenAI edits reject SVG, so only raster formats go.
          const logoRaw = req.design.branding.logoDataUrl;
          const logoParsed = logoRaw ? dataUrlToBlob(logoRaw) : null;
          const logoOk = logoParsed && logoParsed.ext !== "svg+xml" && !logoParsed.blob.type.includes("svg");
          const form = new FormData();
          form.append("model", "gpt-image-1");
          form.append("prompt", `The first image is the vehicle to wrap${logoOk ? "; the second image is the company's exact logo — copy it onto the design faithfully" : ""}. Paint the vinyl wrap design onto the vehicle, preserving the exact vehicle, camera angle, white background and lighting. ${prompt}`);
          form.append("image[]", parsed.blob, `vehicle.${parsed.ext}`);
          if (logoOk) form.append("image[]", logoParsed.blob, `logo.${logoParsed.ext}`);
          form.append("size", "1536x1024");
          form.append("quality", quality);
          const editRes = await fetchWithTimeout("https://api.openai.com/v1/images/edits", {
            method: "POST",
            headers: { Authorization: `Bearer ${config.openaiKey}` },
            body: form,
          });
          if (editRes.ok) res = editRes;
          else console.warn("[image] edit rejected, using text-to-image:", editRes.status, await editRes.text());
        }
      }

      // No photo, or the edit was rejected: generate on a stock vehicle.
      if (!res) res = await this.textToImage(prompt, quality);

      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
      const json = await res.json();
      const b64 = json?.data?.[0]?.b64_json;
      const url = json?.data?.[0]?.url;
      const finalUrl = b64 ? `data:image/png;base64,${b64}` : url;
      if (!finalUrl) throw new Error("OpenAI returned no image");

      // Vision auto-check, inside whatever time remains in this invocation.
      const budget = 55000 - (Date.now() - started);
      const qa = await runQA(finalUrl, req, budget);
      return { url: finalUrl, provider: "openai", qa };
    } catch (err) {
      console.warn("[image] OpenAI failed, using placeholder:", err);
      const fb = await placeholderProvider.generate(req);
      return { ...fb, note: "Image service unavailable right now — showing a design preview instead." };
    }
  },
  async textToImage(prompt: string, quality = "medium"): Promise<Response> {
    return fetchWithTimeout("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1536x1024", quality, n: 1 }),
    });
  },
} as ImageProvider & { textToImage(p: string, quality?: string): Promise<Response> };
