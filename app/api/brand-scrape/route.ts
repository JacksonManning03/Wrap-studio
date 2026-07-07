import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Scrape a client's website for branding: business name, phone, brand colors,
 * and logo. Best-effort — every field is optional and failures return empty
 * fields rather than errors, so the form never blocks on this.
 */

const FETCH_TIMEOUT = 8000;
const UA = "Mozilla/5.0 (compatible; WrapStudioBot/1.0)";

async function fetchText(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Download an image and return it as a data URL (capped at 2 MB). */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") || "image/png";
    if (!mime.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 2 * 1024 * 1024) return null;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const meta = (html: string, name: string): string | undefined => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, "i");
  return html.match(re)?.[1] || html.match(re2)?.[1];
};

function extractPhone(html: string): string | undefined {
  const tel = html.match(/href=["']tel:([^"']+)["']/i)?.[1];
  if (tel) return decodeURIComponent(tel).trim();
  // Visible US-format number in text as a fallback.
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ");
  return text.match(/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/)?.[0]?.trim();
}

function extractColors(html: string): string[] {
  const found = new Map<string, number>();
  const themeColor = meta(html, "theme-color");
  if (themeColor?.startsWith("#")) found.set(normalizeHex(themeColor), 1000);
  const re = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const hex = normalizeHex(`#${m[1]}`);
    // Skip near-white / near-black / grays — they're layout, not brand.
    if (isGrayish(hex)) continue;
    found.set(hex, (found.get(hex) || 0) + 1);
  }
  return Array.from(found.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h]) => h);
}

function normalizeHex(h: string): string {
  let v = h.replace("#", "").toUpperCase();
  if (v.length === 3) v = v.split("").map((c) => c + c).join("");
  return `#${v}`;
}

function isGrayish(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max - min < 24 || max > 245 || max < 25;
}

function extractLogoUrl(html: string, base: URL): string | undefined {
  const candidates = [
    html.match(/<img[^>]+(?:src|data-src)=["']([^"']*logo[^"']*)["']/i)?.[1],
    html.match(/<img[^>]+class=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i)?.[1],
    meta(html, "og:image"),
    html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)?.[1],
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    try { return new URL(c, base).href; } catch { /* skip bad URLs */ }
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    let { url } = (await req.json()) as { url?: string };
    if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    let base: URL;
    try { base = new URL(url); } catch {
      return NextResponse.json({ error: "invalid url" }, { status: 400 });
    }

    const html = await fetchText(base.href);
    if (!html) return NextResponse.json({ businessName: null, phone: null, colors: [], logoDataUrl: null, ok: false });

    const businessName =
      meta(html, "og:site_name") ||
      html.match(/<title[^>]*>([^<|–-]+)/i)?.[1]?.trim() ||
      undefined;
    const phone = extractPhone(html);

    // Brand colors usually live in external stylesheets — pull the first two.
    let cssText = "";
    const linkRe = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']|<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/gi;
    const cssUrls: string[] = [];
    let lm: RegExpExecArray | null;
    while ((lm = linkRe.exec(html)) !== null && cssUrls.length < 2) {
      try { cssUrls.push(new URL(lm[1] || lm[2], base).href); } catch { /* skip */ }
    }
    for (const cssUrl of cssUrls) {
      cssText += (await fetchText(cssUrl)) || "";
    }
    const colors = extractColors(html + cssText);
    const logoUrl = extractLogoUrl(html, base);
    const logoDataUrl = logoUrl ? await fetchImageAsDataUrl(logoUrl) : null;

    return NextResponse.json({
      ok: true,
      businessName: businessName || null,
      phone: phone || null,
      colors,
      logoDataUrl,
    });
  } catch (e) {
    console.error("[api/brand-scrape]", e);
    return NextResponse.json({ error: "scrape failed" }, { status: 500 });
  }
}
