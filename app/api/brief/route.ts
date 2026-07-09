import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * The brief-writer: a designer-brain step between the form and the image
 * model. Looks at the logo (vision), the scraped website text, and the form,
 * then writes one concise wrap brief per style direction in the language that
 * produced the Paradise Washing proof: flat-vector sign-shop proof style,
 * per-panel placements with exact strings in quotes, the logo described in
 * words, a motif tied to the trade, and explicit not-wrapped callouts.
 */

interface BriefRequest {
  businessName?: string;
  phone?: string;
  website?: string;
  colors: string[];
  fontNames: string[];
  logoDataUrl?: string;
  vehicleLabel: string;
  coverage: number;
  finish: string;
  customText?: string;
  direction?: string;
  siteText?: string;
  trade?: string;
  styleHints: string[];
}

const SYSTEM = `You are the senior wrap designer at a professional sign shop. You write image-generation briefs for vehicle wrap design proofs. Your briefs consistently produce output that looks like a real print-shop proof, not AI art.

Rules for every brief you write:
- Style is always: photorealistic vehicle on a white studio background, with the wrap graphics as crisp clean vector art on the body — a professional sign-shop proof, never "AI art".
- Put every piece of on-vehicle text in double quotes, exactly as supplied, and name the exact panel it sits on (doors, front fender, bed side, lower rear panel, rocker).
- Describe the logo in words (letterforms, colors, iconography) so the renderer can reproduce it, and state it must be copied exactly from the supplied reference image.
- Invent a subtle tone-on-tone background motif tied to the company's trade (e.g. water flow for pressure washing, shield pattern for pest control). Subtle means darker/lighter shade of the base color, never a new color.
- Always state what is NOT wrapped: "Bumpers, grille surround, and lower rocker panels remain factory silver — NOT wrapped. Windows dark gray/tinted."
- Use ONLY the supplied brand colors as design colors.
- Keep each brief under 170 words. No headers, no bullet lists — flowing prompt prose.`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BriefRequest;
    if (!config.openaiKey) return NextResponse.json({ briefs: [], logoDescription: null, trade: body.trade || null });

    const userText = [
      `Business: ${body.businessName || "unknown"}`,
      body.trade ? `Trade: ${body.trade}` : "",
      `Vehicle: ${body.vehicleLabel}`,
      `Coverage: about ${(body.coverage * 100).toFixed(0)}% of the body`,
      `Finish: ${body.finish}`,
      body.phone ? `Phone (goes on the front fender): "${body.phone}"` : "No phone supplied.",
      body.website ? `Website (goes on the lower rear panel / bed side): "${body.website}"` : "No website supplied.",
      body.customText ? `Additional required text (small, near the rear): "${body.customText}"` : "",
      body.colors.length ? `Brand colors (use EXACTLY these): ${body.colors.join(", ")}` : "No brand colors supplied — derive a palette from the logo.",
      body.fontNames.length ? `Brand fonts: ${body.fontNames.join(", ")}` : "",
      body.direction ? `Client's design notes: ${body.direction}` : "",
      body.siteText ? `Website text (use to understand the trade and tone):\n${body.siteText.slice(0, 3000)}` : "",
      "",
      `Write ${body.styleHints.length} briefs, one per design direction below. Also give a one-sentence written description of the logo, and the trade you detected.`,
      ...body.styleHints.map((s, i) => `Direction ${i + 1}: ${s}`),
      "",
      `Respond as JSON: {"trade": string, "logoDescription": string, "briefs": string[${body.styleHints.length}]}`,
    ].filter(Boolean).join("\n");

    const content: unknown[] = [{ type: "text", text: userText }];
    if (body.logoDataUrl && !body.logoDataUrl.includes("svg")) {
      content.push({ type: "image_url", image_url: { url: body.logoDataUrl, detail: "low" } });
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${config.openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0.8,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content },
          ],
        }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      console.warn("[api/brief] LLM rejected:", res.status, await res.text());
      return NextResponse.json({ briefs: [], logoDescription: null, trade: body.trade || null });
    }
    const json = await res.json();
    const parsed = JSON.parse(json?.choices?.[0]?.message?.content || "{}");
    const briefs = Array.isArray(parsed.briefs) ? parsed.briefs.map(String) : [];
    return NextResponse.json({
      briefs,
      logoDescription: parsed.logoDescription || null,
      trade: parsed.trade || body.trade || null,
    });
  } catch (e) {
    console.error("[api/brief]", e);
    return NextResponse.json({ briefs: [], logoDescription: null, trade: null });
  }
}
