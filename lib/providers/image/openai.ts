import type { GenerateRequest, GenerateResult, ImageProvider } from "./types";
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
async function fetchWithTimeout(url: string, init: RequestInit, ms = 55000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * OpenAI Images (gpt-image-1), 1536x1024 / medium to fit Vercel Hobby's 60s.
 * - Photo uploaded: try an image edit (keeps the exact vehicle). If OpenAI
 *   rejects the file, fall through to text-to-image rather than failing.
 * - No photo: text-to-image on a class-appropriate stock vehicle.
 * Any failure falls back to the placeholder provider — the flow never dies.
 */
export const openaiProvider: ImageProvider = {
  name: "openai",
  async generate(req: GenerateRequest): Promise<GenerateResult> {
    if (!config.openaiKey) return placeholderProvider.generate(req);
    const prompt = buildPrompt(req);
    try {
      let res: Response | null = null;

      const photo = req.vehicle.photos[0];
      if (photo) {
        const parsed = dataUrlToBlob(photo);
        if (parsed) {
          const form = new FormData();
          form.append("model", "gpt-image-1");
          form.append("prompt", `Apply this wrap design to the vehicle in the photo, preserving the exact vehicle, angle and lighting. ${prompt}`);
          form.append("image", parsed.blob, `vehicle.${parsed.ext}`);
          form.append("size", "1536x1024");
          form.append("quality", "medium");
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
      if (!res) res = await this.textToImage(prompt);

      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
      const json = await res.json();
      const b64 = json?.data?.[0]?.b64_json;
      const url = json?.data?.[0]?.url;
      if (b64) return { url: `data:image/png;base64,${b64}`, provider: "openai" };
      if (url) return { url, provider: "openai" };
      throw new Error("OpenAI returned no image");
    } catch (err) {
      console.warn("[image] OpenAI failed, using placeholder:", err);
      const fb = await placeholderProvider.generate(req);
      return { ...fb, note: "Image service unavailable right now — showing a design preview instead." };
    }
  },
  async textToImage(prompt: string): Promise<Response> {
    return fetchWithTimeout("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1536x1024", quality: "medium", n: 1 }),
    });
  },
} as ImageProvider & { textToImage(p: string): Promise<Response> };
