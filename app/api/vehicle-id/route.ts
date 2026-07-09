import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Vehicle identification: vision reads the customer's photo and returns the
 * exact spec (year range, make, model, trim, body configuration, color).
 * The photo's job is identification — the user confirms/edits the spec, and
 * the TEMPLATE is generated from the spec, not re-imagined from the photo.
 */
export async function POST(req: NextRequest) {
  try {
    const { photo } = (await req.json()) as { photo?: string };
    if (!photo) return NextResponse.json({ error: "photo is required" }, { status: 400 });
    if (!config.openaiKey) return NextResponse.json({ ok: false });

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
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
                text: `Identify this vehicle precisely for a vehicle wrap quote. Respond as JSON:
{"year": "best-guess year or range like 2019-2022", "make": string, "model": string, "trim": "trim/series if visible else empty", "bodyConfig": "cab/bed/roof/wheelbase details plus accessories — e.g. 'crew cab short bed, camper shell, ladder rack' or 'high roof extended wheelbase cargo van' — empty if standard", "color": "factory body color in plain words", "confidence": "high"|"medium"|"low"}`,
              },
              { type: "image_url", image_url: { url: photo, detail: "high" } },
            ],
          }],
        }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      console.warn("[api/vehicle-id] rejected:", res.status, await res.text());
      return NextResponse.json({ ok: false });
    }
    const json = await res.json();
    const parsed = JSON.parse(json?.choices?.[0]?.message?.content || "{}");
    return NextResponse.json({
      ok: true,
      year: parsed.year || "",
      make: parsed.make || "",
      model: parsed.model || "",
      trim: parsed.trim || "",
      bodyConfig: parsed.bodyConfig || "",
      color: parsed.color || "",
      confidence: parsed.confidence || "low",
    });
  } catch (e) {
    console.error("[api/vehicle-id]", e);
    return NextResponse.json({ ok: false });
  }
}
