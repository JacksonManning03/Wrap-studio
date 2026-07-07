"use client";

import { useMemo, useState } from "react";
import {
  COVERAGE_TIERS, FINISHES, VEHICLE_CLASSES, VEHICLE_CLASS_LABELS,
  type Finish, type VehicleClass,
} from "@/lib/pricing/constants";
import { coverageForBudget, fmtUSD, priceFor } from "@/lib/pricing/pricing";
import { uid, type Branding, type Vehicle } from "@/lib/design/model";

export interface IntakePayload {
  vehicles: Vehicle[];
  finish: Finish;
  coverage: number;
  budget?: number;
  branding: Branding;
  customText?: string;
  direction?: string;
  inspiration: string[];
}

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(f);
  });
}

/**
 * Normalize any logo (including SVG) to a PNG data URL. The image API only
 * accepts raster reference images, and an un-rasterized logo is why renders
 * used to invent/distort logos.
 */
function rasterizeLogoToPng(dataUrl: string, max = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || max;
      const h = img.naturalHeight || max;
      const scale = Math.min(1, max / Math.max(w, h));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w * scale));
      c.height = Math.max(1, Math.round(h * scale));
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      try { resolve(c.toDataURL("image/png")); } catch { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

interface DraftVehicle {
  id: string; vehicleClass: VehicleClass; photos: string[];
}
const newDraft = (): DraftVehicle => ({ id: uid("veh"), vehicleClass: "sedan", photos: [] });

interface ScrapeResult {
  businessName: string | null;
  phone: string | null;
  colors: string[];
  logoDataUrl: string | null;
}

export default function IntakeForm({ onSubmit }: { onSubmit: (p: IntakePayload) => void }) {
  const [vehicles, setVehicles] = useState<DraftVehicle[]>([newDraft()]);
  const [finish, setFinish] = useState<Finish>("Gloss");
  const [tierId, setTierId] = useState<string>("full");
  const [budget, setBudget] = useState<string>("");
  const [logo, setLogo] = useState<{ dataUrl: string; name: string } | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [colorDraft, setColorDraft] = useState("#0E8F86");
  const [fonts, setFonts] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [direction, setDirection] = useState("");
  const [inspiration, setInspiration] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");

  // Website branding scrape
  const [scraping, setScraping] = useState(false);
  const [scrape, setScrape] = useState<ScrapeResult | null>(null);
  const [scrapeResolved, setScrapeResolved] = useState(false);

  const tier = COVERAGE_TIERS.find((t) => t.id === tierId) || COVERAGE_TIERS[4];
  const vc = vehicles[0].vehicleClass;
  const budgetNum = parseFloat(budget);
  const coverage = useMemo(
    () => (budget && !isNaN(budgetNum) && budgetNum > 0
      ? coverageForBudget(budgetNum, vc, "printed")
      : tier.fraction),
    [budget, budgetNum, vc, tier],
  );
  const estimate = priceFor(vc, coverage, "printed");

  const photosMissing = vehicles.some((v) => v.photos.length === 0);

  const setVeh = (id: string, patch: Partial<DraftVehicle>) =>
    setVehicles((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const normPhone = (s: string) => s.replace(/\D/g, "").replace(/^1/, "");
  const scrapeConflicts = useMemo(() => {
    if (!scrape || scrapeResolved) return [];
    const out: { field: string; typed: string; found: string }[] = [];
    if (scrape.businessName && businessName && scrape.businessName.toLowerCase() !== businessName.toLowerCase())
      out.push({ field: "Business name", typed: businessName, found: scrape.businessName });
    if (scrape.phone && phone && normPhone(scrape.phone) !== normPhone(phone))
      out.push({ field: "Phone", typed: phone, found: scrape.phone });
    return out;
  }, [scrape, scrapeResolved, businessName, phone]);

  const runScrape = async () => {
    if (!website.trim() || scraping) return;
    setScraping(true);
    setScrapeResolved(false);
    try {
      const res = await fetch("/api/brand-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: website.trim() }),
      });
      const json = (await res.json()) as ScrapeResult & { ok?: boolean };
      if (!res.ok || json.ok === false) { setScrape(null); return; }
      setScrape(json);
      // Quietly fill anything the user left blank.
      if (json.businessName && !businessName) setBusinessName(json.businessName);
      if (json.phone && !phone) setPhone(json.phone);
      if (json.colors.length && colors.length === 0) setColors(json.colors);
      if (json.logoDataUrl && !logo) setLogo({ dataUrl: await rasterizeLogoToPng(json.logoDataUrl), name: "From your website" });
    } catch {
      setScrape(null);
    } finally {
      setScraping(false);
    }
  };

  const useScraped = async () => {
    if (!scrape) return;
    if (scrape.businessName) setBusinessName(scrape.businessName);
    if (scrape.phone) setPhone(scrape.phone);
    if (scrape.colors.length) setColors(scrape.colors);
    if (scrape.logoDataUrl) setLogo({ dataUrl: await rasterizeLogoToPng(scrape.logoDataUrl), name: "From your website" });
    setScrapeResolved(true);
  };

  const submit = () => {
    if (photosMissing) return;
    const finalVehicles: Vehicle[] = vehicles.map((v) => ({
      id: v.id, vehicleClass: v.vehicleClass, photos: v.photos,
      label: VEHICLE_CLASS_LABELS[v.vehicleClass],
    }));
    onSubmit({
      vehicles: finalVehicles, finish, coverage,
      budget: !isNaN(budgetNum) && budgetNum > 0 ? budgetNum : undefined,
      branding: {
        logoDataUrl: logo?.dataUrl, logoName: logo?.name,
        colors,
        fontNames: fonts.split(",").map((s) => s.trim()).filter(Boolean),
        businessName: businessName || undefined,
        phone: phone || undefined, website: website || undefined,
      },
      customText: customText.trim() || undefined,
      direction: direction || undefined,
      inspiration,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {/* Vehicles */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold">Your vehicle</h2>
          <p className="hint mb-4">
            Upload a photo of your vehicle — we turn it into a clean side-profile
            template, then design your wrap on it.
          </p>
          {vehicles.map((v, i) => (
            <div key={v.id} className={i > 0 ? "mt-5 border-t border-line pt-5" : ""}>
              {vehicles.length > 1 && (
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-muted">Vehicle {i + 1}</span>
                  <button className="text-[13px] text-muted underline" onClick={() => setVehicles((vs) => vs.filter((x) => x.id !== v.id))}>
                    Remove
                  </button>
                </div>
              )}
              <label className="label" htmlFor={`class-${v.id}`}>Vehicle type</label>
              <select id={`class-${v.id}`} className="field" value={v.vehicleClass}
                onChange={(e) => setVeh(v.id, { vehicleClass: e.target.value as VehicleClass })}>
                {VEHICLE_CLASSES.map((c) => (
                  <option key={c} value={c}>{VEHICLE_CLASS_LABELS[c]}</option>
                ))}
              </select>
              <div className="mt-3">
                <label className="label" htmlFor={`photos-${v.id}`}>
                  Photos of your vehicle <span className="text-red-600">*</span>
                </label>
                <input id={`photos-${v.id}`} type="file" accept="image/*" multiple className="field py-2"
                  onChange={async (e) => {
                    const fs = Array.from(e.target.files || []);
                    const urls = await Promise.all(fs.map(fileToDataUrl));
                    setVeh(v.id, { photos: [...v.photos, ...urls] });
                  }} />
                {v.photos.length === 0 && (
                  <p className="hint text-red-600">A photo is required — it&apos;s what we build your mockup from.</p>
                )}
                {v.photos.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {v.photos.map((p, pi) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={pi} src={p} alt="Vehicle" className="h-14 w-20 rounded-md object-cover border border-line" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <button className="btn-ghost mt-4 text-[14px]" onClick={() => setVehicles((vs) => [...vs, newDraft()])}>
            + Add another vehicle (fleet)
          </button>
        </section>

        {/* Coverage & finish */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold">Coverage & finish</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="finish">Finish</label>
              <select id="finish" className="field" value={finish} onChange={(e) => setFinish(e.target.value as Finish)}>
                {FINISHES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="tier">Coverage</label>
              <select id="tier" className="field" value={tierId} onChange={(e) => setTierId(e.target.value)}>
                {COVERAGE_TIERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="label" htmlFor="budget">Budget (optional)</label>
            <input id="budget" className="field max-w-[220px]" inputMode="numeric" placeholder="e.g. 3500"
              value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ""))} />
            <p className="hint">If you set a budget, we size the coverage to fit it. You can fine-tune later.</p>
          </div>
        </section>

        {/* Branding */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold">Your branding</h2>
          <p className="hint mb-4">
            Anything you add here is used exactly as supplied — your logo is never redrawn or recolored.
          </p>
          <div className="mb-4">
            <label className="label" htmlFor="bweb">Your website</label>
            <div className="flex gap-2">
              <input id="bweb" className="field" placeholder="e.g. truedetailaz.com"
                value={website} onChange={(e) => setWebsite(e.target.value)} onBlur={runScrape} />
              <button className="chip whitespace-nowrap" onClick={runScrape} disabled={scraping || !website.trim()}>
                {scraping ? "Checking…" : "Pull my branding"}
              </button>
            </div>
            <p className="hint">We&apos;ll pull your name, phone, colors and logo straight from your site.</p>
          </div>

          {scrapeConflicts.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="text-[14px] font-semibold">Your website says something different:</p>
              <ul className="mt-1 text-[13px]">
                {scrapeConflicts.map((c) => (
                  <li key={c.field}>
                    <b>{c.field}:</b> you typed &ldquo;{c.typed}&rdquo; — your site shows &ldquo;{c.found}&rdquo;
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <button className="chip chip-on" onClick={useScraped}>Use my website&apos;s info</button>
                <button className="chip" onClick={() => setScrapeResolved(true)}>Keep what I typed</button>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="logo">Logo (SVG or PNG preferred)</label>
              <input id="logo" type="file" accept=".svg,.png,.jpg,.jpeg,image/*" className="field py-2"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setLogo({ dataUrl: await rasterizeLogoToPng(await fileToDataUrl(f)), name: f.name });
                }} />
              {logo && (
                <div className="mt-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo.dataUrl} alt="Your logo" className="h-10 rounded border border-line bg-white p-1" />
                  <span className="text-[12px] text-muted">{logo.name}</span>
                </div>
              )}
            </div>
            <div>
              <label className="label" htmlFor="fonts">Brand fonts (names, comma-separated)</label>
              <input id="fonts" className="field" placeholder="e.g. Montserrat, Oswald"
                value={fonts} onChange={(e) => setFonts(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <span className="label">Brand colors</span>
            <div className="flex flex-wrap items-center gap-2">
              {colors.map((c, i) => (
                <button key={i} title="Remove color" className="flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[12px]"
                  onClick={() => setColors(colors.filter((_, x) => x !== i))}>
                  <span className="h-4 w-4 rounded-full border border-line" style={{ background: c }} />
                  {c} ✕
                </button>
              ))}
              <input type="color" aria-label="Pick a brand color" value={colorDraft}
                onChange={(e) => setColorDraft(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded border border-line bg-white p-0.5" />
              <button className="chip" onClick={() => setColors((cs) => [...cs, colorDraft])}>Add color</button>
            </div>
            <p className="hint">Hex or Pantone — these are locked into the design exactly.</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="bname">Business name</label>
              <input id="bname" className="field" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="bphone">Phone (on-vehicle)</label>
              <input id="bphone" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Direction */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold">Design direction</h2>
          <label className="label mt-3" htmlFor="direction">Describe the look you want</label>
          <textarea id="direction" className="field min-h-[90px]"
            placeholder="e.g. Bold and modern, dark base with sweeping teal accents, big clean logo on the doors"
            value={direction} onChange={(e) => setDirection(e.target.value)} />
          <p className="hint">The more specific the info, the better the result.</p>
          <div className="mt-3">
            <label className="label" htmlFor="inspo">Inspiration images (optional)</label>
            <input id="inspo" type="file" accept="image/*" multiple className="field py-2"
              onChange={async (e) => {
                const fs = Array.from(e.target.files || []);
                setInspiration([...inspiration, ...(await Promise.all(fs.map(fileToDataUrl)))]);
              }} />
          </div>
          <div className="mt-4">
            <label className="label" htmlFor="customText">
              Any specific text you&apos;d like included? (optional)
            </label>
            <textarea id="customText" className="field min-h-[60px]"
              placeholder="e.g. USDOT 1234567 · Family owned since 2009 · Free estimates"
              value={customText} onChange={(e) => setCustomText(e.target.value)} />
            <p className="hint">DOT numbers, taglines, license numbers — anything you need lettered on the vehicle.</p>
          </div>
        </section>
      </div>

      {/* Summary rail */}
      <aside className="lg:sticky lg:top-6 h-fit">
        <div className="card p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Estimate</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight">{fmtUSD(estimate)}</p>
          <p className="hint">
            One all-in price for a {Math.round(coverage * 100)}% coverage printed wrap
            on a {VEHICLE_CLASS_LABELS[vc].toLowerCase()} — design, material and install included.
          </p>
          <button className="btn-accent mt-4 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={submit} disabled={photosMissing}>
            {photosMissing ? "Add a vehicle photo to continue" : "Generate my wrap design"}
          </button>
          <p className="hint mt-2">
            We build a clean template of your vehicle first, then design on it — about a minute total.
          </p>
        </div>
      </aside>
    </div>
  );
}
