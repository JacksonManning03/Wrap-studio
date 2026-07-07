import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Step 1 of the two-step render: turn the client's real vehicle photo into a
 * clean, badge-free, broadside side-profile "template" shot on white. Step 2
 * (/api/generate) then paints the wrap design onto this template.
 */
const TEMPLATE_PROMPT = [
  "Recreate the exact vehicle in this photo as a professional studio product photograph:",
  "exact broadside side profile, the full side of the vehicle facing the camera, centered in frame.",
  "Isolated on a clean white studio background with a soft contact shadow, professional product-shot lighting.",
  "The body is in its plain original paint, unwrapped, with clean panels — a blank canvas for a vinyl wrap mockup.",
  "Plain blank grille — absolutely NO manufacturer badges, emblems, or logos anywhere on the vehicle body.",
  "No text, no watermarks, photoreal, high detail.",
].join(" ");

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const bin = Buffer.from(m[2], "base64");
  const ext = (mime.split("/")[1] || "png").replace("jpeg", "jpg");
  return { blob: new Blob([bin], { type: mime }), ext };
}

export async function POST(req: NextRequest) {
  try {
    const { photo } = (await req.json()) as { photo?: string };
    if (!photo) return NextResponse.json({ error: "photo is required" }, { status: 400 });
    if (!config.openaiKey) return NextResponse.json({ error: "image service not configured" }, { status: 503 });

    const parsed = dataUrlToBlob(photo);
    if (!parsed) return NextResponse.json({ error: "photo must be a data URL" }, { status: 400 });

    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", TEMPLATE_PROMPT);
    form.append("image", parsed.blob, `vehicle.${parsed.ext}`);
    form.append("size", "1536x1024");
    form.append("quality", "medium");

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 55000);
    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${config.openaiKey}` },
        body: form,
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      console.warn("[api/template] OpenAI rejected:", res.status, await res.text());
      return NextResponse.json({ error: "template generation failed" }, { status: 502 });
    }
    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return NextResponse.json({ error: "no image returned" }, { status: 502 });
    return NextResponse.json({ url: `data:image/png;base64,${b64}` });
  } catch (e) {
    console.error("[api/template]", e);
    return NextResponse.json({ error: "template generation failed" }, { status: 500 });
  }
}
