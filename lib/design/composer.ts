import type { FlatDesign } from "./model";
import { SILHOUETTES } from "./silhouettes";
import type { VehicleClass } from "@/lib/pricing/constants";
import { DEFAULT_PALETTE } from "./model";

/** Deterministic PRNG so a (seed, variant) pair always yields the same art. */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function palette(d: FlatDesign): string[] {
  const p = d.branding.colors.filter(Boolean);
  return p.length ? p : DEFAULT_PALETTE;
}

/**
 * GRAPHICS LAYER — deterministic vector art from (seed, variant).
 * Styles rotate by variant so "generate more" visibly changes the concept.
 * Brand colors are used exactly as supplied — never altered.
 */
function graphicsFor(d: FlatDesign, W: number, H: number): string {
  const rnd = mulberry32(d.seed + d.variant * 7919);
  const cols = palette(d);
  const c = (i: number) => cols[i % cols.length];
  const style = d.variant % 4;
  const parts: string[] = [];

  if (style === 0) {
    // Sweeping speed bands
    for (let i = 0; i < 5; i++) {
      const y = H * (0.25 + i * 0.14) + rnd() * 20;
      const th = H * (0.05 + rnd() * 0.08);
      parts.push(
        `<path d="M0,${(y + th).toFixed(0)} C ${W * 0.3},${(y - th * (1 + rnd())).toFixed(0)} ${W * 0.6},${(y + th * 2).toFixed(0)} ${W},${(y - th).toFixed(0)} L ${W},${(y + th - th * 0.2).toFixed(0)} C ${W * 0.6},${(y + th * 3).toFixed(0)} ${W * 0.3},${(y - th * 0.4).toFixed(0)} 0,${(y + th * 2).toFixed(0)} Z" fill="${c(i)}" opacity="${(0.85 - i * 0.12).toFixed(2)}"/>`
      );
    }
  } else if (style === 1) {
    // Angular panels
    for (let i = 0; i < 6; i++) {
      const x = W * (i / 6) + rnd() * 40;
      const skew = 60 + rnd() * 120;
      parts.push(
        `<polygon points="${x},0 ${x + skew},0 ${x + skew - 90},${H} ${x - 90},${H}" fill="${c(i)}" opacity="${i % 2 ? 0.55 : 0.9}"/>`
      );
    }
  } else if (style === 2) {
    // Halftone fade
    const dot = c(0);
    for (let gx = 0; gx < 22; gx++) {
      for (let gy = 0; gy < 9; gy++) {
        const r = Math.max(0, (gx / 22) * 12 - rnd() * 3);
        if (r > 0.6)
          parts.push(`<circle cx="${(gx / 21) * W}" cy="${(gy / 8) * H}" r="${r.toFixed(1)}" fill="${dot}"/>`);
      }
    }
    parts.push(`<path d="M0,${H} L ${W * 0.55},${H} L ${W * 0.3},0 L 0,0 Z" fill="${c(1)}" opacity="0.92"/>`);
  } else {
    // Topographic waves
    for (let i = 0; i < 7; i++) {
      const y0 = H * (i / 7);
      let dPath = `M0,${y0.toFixed(0)}`;
      for (let x = 0; x <= W; x += W / 8) {
        dPath += ` Q ${(x + W / 16).toFixed(0)},${(y0 + (rnd() - 0.5) * 70).toFixed(0)} ${(x + W / 8).toFixed(0)},${y0.toFixed(0)}`;
      }
      parts.push(`<path d="${dPath}" fill="none" stroke="${c(i)}" stroke-width="${(3 + rnd() * 5).toFixed(1)}" opacity="0.8"/>`);
    }
  }
  return parts.join("\n      ");
}

function textLayer(d: FlatDesign, W: number, H: number, x0 = 0): string {
  const b = d.branding;
  const font = b.fontNames[0] ? esc(b.fontNames[0]) : "Archivo, Arial, sans-serif";
  const cols = palette(d);
  const textCol = cols.length > 1 ? cols[1] : "#111111";
  const out: string[] = [];
  if (b.businessName)
    out.push(`<text x="${x0 + W * 0.05}" y="${H * 0.58}" font-family="${font}" font-weight="800" font-size="${Math.min(H * 0.2, ((W - x0) * 0.85) / Math.max(6, (b.businessName || "").length) * 1.7)}" fill="${textCol}" letter-spacing="2">${esc(b.businessName.toUpperCase())}</text>`);
  const sub = [b.phone, b.website].filter(Boolean).join("   •   ");
  if (sub)
    out.push(`<text x="${x0 + W * 0.05}" y="${H * 0.74}" font-family="${font}" font-weight="600" font-size="${H * 0.075}" fill="${textCol}" opacity="0.85">${esc(sub)}</text>`);
  // Legal text ONLY when the user asked for it.
  if (d.legal.enabled) {
    const legal = [
      d.legal.usdot && `USDOT ${d.legal.usdot}`,
      d.legal.mc && `MC ${d.legal.mc}`,
      d.legal.license && `LIC ${d.legal.license}`,
    ].filter(Boolean).join("   ");
    if (legal)
      out.push(`<text x="${x0 + W * 0.05}" y="${H * 0.93}" font-family="${font}" font-size="${H * 0.05}" fill="${textCol}" opacity="0.9">${esc(legal)}</text>`);
  }
  return out.join("\n      ");
}

function logoLayer(d: FlatDesign, W: number, H: number, x0 = 0): string {
  if (!d.branding.logoDataUrl) return "";
  // The supplied logo is embedded EXACTLY as uploaded — never redrawn or recolored.
  const s = H * 0.34;
  return `<image href="${d.branding.logoDataUrl}" x="${Math.max(x0 + 10, W - s * 1.9)}" y="${H * 0.12}" width="${s * 1.6}" height="${s}" preserveAspectRatio="xMidYMid meet"/>`;
}

export interface FlatOpts { width?: number; height?: number; showCoverageZones?: boolean; }

/**
 * OUTPUT SOURCE — the flat, layered livery panel.
 * Named layers match the print export: film-base / graphics / logo / text / coverage-zones.
 * Coverage clips the printed graphics from the rear forward.
 */
export function composeFlatSVG(d: FlatDesign, opts: FlatOpts = {}): string {
  const W = opts.width ?? 2048, H = opts.height ?? 1024;
  const cols = palette(d);
  const base = d.jobType === "color-change" ? cols[0] : "#FFFFFF";
  const covW = W * d.coverage;
  const covX = W - covW; // cover from the rear (right) forward
  const zones = opts.showCoverageZones
    ? `<g id="coverage-zones"><rect x="${covX}" y="0" width="${covW}" height="${H}" fill="none" stroke="#FF5A1F" stroke-width="4" stroke-dasharray="18 12"/></g>`
    : "";
  const printed = d.jobType !== "color-change";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs><clipPath id="cov"><rect x="${covX}" y="0" width="${covW}" height="${H}"/></clipPath></defs>
  <g id="film-base"><rect width="${W}" height="${H}" fill="${base}"/></g>
  ${printed ? `<g id="graphics" clip-path="url(#cov)">
      ${graphicsFor(d, W, H)}
    </g>
  <g id="logo" clip-path="url(#cov)">${logoLayer(d, W, H, covX)}</g>
  <g id="text" clip-path="url(#cov)">
      ${textLayer(d, W, H, covX)}
    </g>` : ""}
  ${zones}
</svg>`;
}

/**
 * PLACEHOLDER MOCKUP — the flat design painted into a vehicle silhouette.
 * Used when the image provider is unavailable; clearly labeled in the UI.
 */
export function composeMockupSVG(d: FlatDesign, vc: VehicleClass): string {
  const sil = SILHOUETTES[vc];
  const W = 1000, H = 460;
  const inner = composeFlatSVG(d, { width: 1000, height: 400 })
    .replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const wheels = sil.wheels
    .map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1c2026"/><circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="#8b929c"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#e9ebee"/>
  <ellipse cx="500" cy="356" rx="440" ry="26" fill="#000" opacity="0.10"/>
  <defs><clipPath id="body"><path d="${sil.body}"/></clipPath></defs>
  <g clip-path="url(#body)"><g transform="translate(0,-30) scale(1,0.92)">${inner}</g></g>
  <path d="${sil.body}" fill="none" stroke="#171B21" stroke-width="5" stroke-linejoin="round"/>
  ${wheels}
</svg>`;
}

export function svgToDataUrl(svg: string): string {
  const b64 = typeof Buffer !== "undefined"
    ? Buffer.from(svg, "utf8").toString("base64")
    : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${b64}`;
}
