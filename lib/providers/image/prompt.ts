import type { GenerateRequest } from "./types";
import type { RenderAngle } from "@/lib/design/model";
import { VEHICLE_CLASS_LABELS } from "@/lib/pricing/constants";
import { nearestTier } from "@/lib/pricing/pricing";

/** Camera framings, calibrated to the reference proof (front 3/4, driver side). */
const ANGLE_LINES: Record<RenderAngle, string> = {
  front34:
    "shown from a front three-quarter view on the driver's side — the front end and the full driver side of the vehicle both clearly visible, vehicle filling the frame, centered",
  rear34:
    "shown from a rear three-quarter view on the passenger's side — the rear end and the full passenger side of the vehicle both clearly visible, vehicle filling the frame, centered",
};

/**
 * Build the render brief in the language that produced the Paradise Washing
 * proof: flat-vector sign-shop proof style, exact quoted strings per panel,
 * logo described in words AND supplied as reference, not-wrapped callouts.
 * When the brief-writer LLM has produced a designer brief, that brief drives
 * the design and this wrapper only adds the hard constraints around it.
 */
export function buildPrompt(req: GenerateRequest): string {
  const { design: d, vehicle: v, scene } = req;
  const veh = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") ||
    VEHICLE_CLASS_LABELS[v.vehicleClass];
  const tier = nearestTier(d.coverage).label.toLowerCase();
  const b = d.branding;

  const angle = req.angle || "front34";
  const hardOpen = [
    `Professional vehicle wrap design proof: a ${veh} with a ${tier} printed vinyl wrap (${d.finish.toLowerCase()} laminate), ${ANGLE_LINES[angle]}.`,
    angle === "rear34"
      ? "The same wrap design runs on both sides of the vehicle — mirror the layout onto the passenger side, and carry the design onto the rear/tailgate with the logo or business name centered there."
      : "",
    "Generic blank grille and tailgate — absolutely NO manufacturer badges, emblems, or logos anywhere on the vehicle.",
  ].filter(Boolean);

  const hardClose = [
    scene
      ? `Setting: ${scene}.`
      : "Isolated on a clean white studio background with a soft contact shadow.",
    "Overall style: photorealistic vehicle render on white, like a professional sign-shop proof — the vehicle looks real, while the wrap graphics on it are crisp clean vector art, precisely aligned.",
    "Spelling discipline: every word of on-vehicle text must be spelled EXACTLY as quoted. No other text anywhere, no gibberish lettering, no watermarks.",
  ];

  // Brief-writer path: the LLM brief carries design, placements and motif.
  if (d.brief) {
    const logoLine = b.logoDataUrl
      ? `The company's exact logo is supplied as a reference image${d.logoDescription ? ` (${d.logoDescription})` : ""}. Copy it faithfully — never redraw, restyle, distort or recolor it.`
      : "";
    const palette = b.colors.length
      ? `STRICT brand palette — use EXACTLY these hex values and no others: ${b.colors.join(", ")}.`
      : "";
    return [...hardOpen, d.brief, logoLine, palette, ...hardClose].filter(Boolean).join(" ");
  }

  // Fallback path (brief-writer unavailable): assemble placements directly.
  const lines = [
    ...hardOpen,
    "Quality bar: this must read like a real professional wrap proof — strong hierarchy, generous negative space, every word legible from 50 feet. Clean, not busy.",
    d.styleHint ? `Design direction for this concept: ${d.styleHint}.` : "",
    b.colors.length
      ? `STRICT brand palette — use EXACTLY these hex values and no others as the design colors: ${b.colors.join(", ")}.`
      : "",
    b.logoDataUrl
      ? "The company's exact logo is supplied as a reference image. Reproduce it EXACTLY — same shapes, same colors, same proportions — placed prominently on the front door area. Never redraw, restyle, distort or recolor it."
      : "",
    b.businessName
      ? `The business name "${b.businessName}" in large, perfectly legible lettering on the doors${b.fontNames[0] ? `, set in the font ${b.fontNames[0]} — match its letterforms precisely` : ", in typography that matches the logo's style"}.`
      : "",
    b.phone ? `The phone number "${b.phone}" large and readable on the front fender.` : "",
    b.website ? `The website "${b.website}" on the lower rear panel.` : "",
    d.customText
      ? `Also include this exact supporting text, small and clean near the rear: "${d.customText}".`
      : "",
    d.direction ? `Client's design notes: ${d.direction}.` : "",
    "Bumpers, grille surround, and lower rocker panels remain factory silver — NOT wrapped. Windows dark gray/tinted.",
    `Coverage: roughly ${(d.coverage * 100).toFixed(0)}% of the body wrapped; the remainder shows the vehicle's own paint.`,
    ...hardClose,
  ];
  return lines.filter(Boolean).join(" ");
}
