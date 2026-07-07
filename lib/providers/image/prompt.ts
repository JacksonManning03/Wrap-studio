import type { GenerateRequest } from "./types";
import { VEHICLE_CLASS_LABELS } from "@/lib/pricing/constants";
import { nearestTier } from "@/lib/pricing/pricing";

/**
 * Build the render brief, modeled on real sign-shop proofs:
 * mostly-clean base, one strong brand-colored graphic zone, logo reproduced
 * exactly, phone big, supporting text small and deliberate.
 */
export function buildPrompt(req: GenerateRequest): string {
  const { design: d, vehicle: v, scene } = req;
  const veh = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") ||
    VEHICLE_CLASS_LABELS[v.vehicleClass];
  const tier = nearestTier(d.coverage).label.toLowerCase();
  const b = d.branding;
  const lines = [
    `Professional sign-shop vehicle wrap proof: a ${veh} with a ${tier} printed vinyl wrap, ${d.finish.toLowerCase()} laminate, shown in exact broadside side profile, the full side of the vehicle facing the camera.`,
    "Plain blank grille — absolutely NO manufacturer badges, emblems, or logos anywhere on the vehicle body.",
    "Quality bar: this must read like a real professional wrap proof — crisp vector-style graphics, flawless panels, strong hierarchy, generous negative space, every word legible from 50 feet. Clean, not busy, not cluttered.",
    d.styleHint ? `Design direction for this concept: ${d.styleHint}.` : "",
    b.colors.length
      ? `STRICT brand palette — use EXACTLY these hex values and no others as the design colors: ${b.colors.join(", ")}.`
      : "",
    b.logoDataUrl
      ? "The company's exact logo is supplied as a reference image. Reproduce it EXACTLY — same shapes, same colors, same proportions — placed prominently on the front door area. Never redraw, restyle, distort, stretch or recolor it."
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
    `Coverage: roughly ${(d.coverage * 100).toFixed(0)}% of the body wrapped; the remainder shows the vehicle's own paint.`,
    scene
      ? `Setting: ${scene}.`
      : "Setting: isolated on a clean white studio background with a soft contact shadow, professional product-shot lighting.",
    "Spelling discipline: every word must be spelled EXACTLY as given above. No other text anywhere, no gibberish lettering, no watermarks.",
  ];
  return lines.filter(Boolean).join(" ");
}
