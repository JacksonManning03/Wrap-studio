import type { FlatDesign, Vehicle } from "@/lib/design/model";
import { composeFlatSVG } from "@/lib/design/composer";
import { SILHOUETTES } from "@/lib/design/silhouettes";

/**
 * PATH C — assemble clean, don't trace.
 * Emits a layer-editable SVG that opens directly in Adobe Illustrator with
 * named layers (Illustrator maps top-level <g id> elements to layers).
 * We intentionally do NOT write the proprietary native .ai binary and do NOT
 * auto-trace the photoreal render.
 *
 * Print-ready specifics (bleed, cut/contour, Pantone vs CMYK, panel tiling)
 * are deferred — see PRINT_READY_CHECKLIST.md. Defaults below are sensible
 * and exposed as EXPORT_DEFAULTS config.
 */
export const EXPORT_DEFAULTS = {
  widthPx: 4096,       // working canvas; real-world scaling handled in prepress
  heightPx: 2048,
  bleedNote: "Add production bleed per printer spec — see PRINT_READY_CHECKLIST.md",
};

export function buildIllustratorSVG(design: FlatDesign, vehicle: Vehicle): string {
  const W = EXPORT_DEFAULTS.widthPx, H = EXPORT_DEFAULTS.heightPx;
  // Flat design with coverage zones ON (production needs to see them).
  const flat = composeFlatSVG(design, { width: W, height: H, showCoverageZones: true })
    .replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const sil = SILHOUETTES[vehicle.vehicleClass];
  // Cut-guide: vehicle body outline scaled onto the canvas as a spot-style stroke.
  const cutGuide = `<g id="cut-guide" transform="scale(${W / 1000}, ${H / 400})">
    <path d="${sil.body}" fill="none" stroke="#FF00FF" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
  </g>`;
  const meta = `<!--
  Wrap Studio vector export — layer-editable, opens in Adobe Illustrator.
  Layers: film-base / graphics / logo / text / coverage-zones / cut-guide
  Design ${design.id} · variant ${design.variant} · coverage ${(design.coverage * 100).toFixed(0)}%
  Vehicle: ${vehicle.label}
  ${EXPORT_DEFAULTS.bleedNote}
-->`;
  return `<?xml version="1.0" encoding="UTF-8"?>
${meta}
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${flat}
${cutGuide}
</svg>`;
}
