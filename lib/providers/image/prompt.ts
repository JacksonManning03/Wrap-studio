import type { GenerateRequest } from "./types";
import { VEHICLE_CLASS_LABELS } from "@/lib/pricing/constants";
import { nearestTier } from "@/lib/pricing/pricing";

/** Build the render brief. Brand obedience is stated as a hard constraint. */
export function buildPrompt(req: GenerateRequest): string {
  const { design: d, vehicle: v, scene } = req;
  const veh = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") ||
    VEHICLE_CLASS_LABELS[v.vehicleClass];
  const tier = nearestTier(d.coverage).label.toLowerCase();
  const lines = [
    `Professional automotive photograph of a ${veh} with a ${tier} vinyl vehicle wrap, three-quarter front view.`,
    d.jobType === "color-change"
      ? `Color-change wrap in ${d.branding.colors[0] || "deep teal"}, ${d.finish.toLowerCase()} finish, flawless panels.`
      : `Printed commercial wrap, ${d.finish.toLowerCase()} laminate.`,
    d.branding.colors.length
      ? `STRICT brand colors, use EXACTLY these hex values and no others as the design palette: ${d.branding.colors.join(", ")}.`
      : "",
    d.branding.businessName
      ? `The business name "${d.branding.businessName}" appears large on the side in clean typography${d.branding.fontNames[0] ? ` in the font ${d.branding.fontNames[0]}` : ""}.`
      : "",
    d.branding.logoDataUrl
      ? "The company logo (supplied as reference) is reproduced EXACTLY as provided — do not redraw, restyle, distort or recolor it."
      : "",
    d.direction ? `Design direction from the client: ${d.direction}.` : "",
    d.legal.enabled
      ? `Include small legal lettering: ${[d.legal.usdot && `USDOT ${d.legal.usdot}`, d.legal.mc && `MC ${d.legal.mc}`, d.legal.license && `LIC ${d.legal.license}`].filter(Boolean).join(", ")}.`
      : "Do NOT add any DOT/USDOT/MC or licensing text.",
    `Coverage: roughly ${(d.coverage * 100).toFixed(0)}% of the body wrapped; the remainder shows the vehicle's own paint.`,
    scene ? `Setting: ${scene}.` : "Setting: clean modern studio, soft key light, photoreal, high detail.",
    "No text other than what is specified. No watermarks.",
  ];
  return lines.filter(Boolean).join(" ");
}
