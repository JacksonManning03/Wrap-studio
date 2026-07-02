"use client";

import { useMemo, useState } from "react";
import {
  COVERAGE_TIERS, FINISHES, MATERIALS, VEHICLE_CLASSES, VEHICLE_CLASS_LABELS,
  type Finish, type JobType, type VehicleClass,
} from "@/lib/pricing/constants";
import { coverageForBudget, fmtUSD, priceFor } from "@/lib/pricing/pricing";
import { uid, type Branding, type LegalText, type Vehicle } from "@/lib/design/model";

export interface IntakePayload {
  vehicles: Vehicle[];
  jobType: JobType;
  material: string;
  finish: Finish;
  coverage: number;
  budget?: number;
  branding: Branding;
  legal: LegalText;
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

interface DraftVehicle {
  id: string; vehicleClass: VehicleClass;
  year: string; make: string; model: string; trim: string; photos: string[];
}
const newDraft = (): DraftVehicle => ({
  id: uid("veh"), vehicleClass: "sedan", year: "", make: "", model: "", trim: "", photos: [],
});

export default function IntakeForm({ onSubmit }: { onSubmit: (p: IntakePayload) => void }) {
  const [vehicles, setVehicles] = useState<DraftVehicle[]>([newDraft()]);
  const [jobType, setJobType] = useState<JobType>("printed");
  const [material, setMaterial] = useState<string>(MATERIALS.printed[0]);
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
  const [legalOn, setLegalOn] = useState(false);
  const [usdot, setUsdot] = useState(""); const [mc, setMc] = useState(""); const [license, setLicense] = useState("");

  const tier = COVERAGE_TIERS.find((t) => t.id === tierId) || COVERAGE_TIERS[4];
  const vc = vehicles[0].vehicleClass;
  const budgetNum = parseFloat(budget);
  const coverage = useMemo(
    () => (budget && !isNaN(budgetNum) && budgetNum > 0
      ? coverageForBudget(budgetNum, vc, jobType)
      : tier.fraction),
    [budget, budgetNum, vc, jobType, tier],
  );
  const estimate = priceFor(vc, coverage, jobType);

  const setVeh = (id: string, patch: Partial<DraftVehicle>) =>
    setVehicles((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const submit = () => {
    const finalVehicles: Vehicle[] = vehicles.map((v) => ({
      id: v.id, vehicleClass: v.vehicleClass,
      year: v.year || undefined, make: v.make || undefined,
      model: v.model || undefined, trim: v.trim || undefined,
      photos: v.photos,
      label: [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") ||
        VEHICLE_CLASS_LABELS[v.vehicleClass],
    }));
    onSubmit({
      vehicles: finalVehicles, jobType, material, finish, coverage,
      budget: !isNaN(budgetNum) && budgetNum > 0 ? budgetNum : undefined,
      branding: {
        logoDataUrl: logo?.dataUrl, logoName: logo?.name,
        colors,
        fontNames: fonts.split(",").map((s) => s.trim()).filter(Boolean),
        businessName: businessName || undefined,
        phone: phone || undefined, website: website || undefined,
      },
      legal: { enabled: legalOn, usdot: usdot || undefined, mc: mc || undefined, license: license || undefined },
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
            The more detail you give, the better your result. A real photo of
            your vehicle gives the most accurate mockup — but everything here is optional.
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
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["year", "make", "model", "trim"] as const).map((k) => (
                  <div key={k}>
                    <label className="label capitalize" htmlFor={`${k}-${v.id}`}>{k}</label>
                    <input id={`${k}-${v.id}`} className="field" placeholder={k === "year" ? "2022" : ""}
                      value={v[k]} onChange={(e) => setVeh(v.id, { [k]: e.target.value } as Partial<DraftVehicle>)} />
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <label className="label" htmlFor={`photos-${v.id}`}>Photos of your vehicle</label>
                <input id={`photos-${v.id}`} type="file" accept="image/*" multiple className="field py-2"
                  onChange={async (e) => {
                    const fs = Array.from(e.target.files || []);
                    const urls = await Promise.all(fs.map(fileToDataUrl));
                    setVeh(v.id, { photos: [...v.photos, ...urls] });
                  }} />
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

        {/* Wrap type */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold">Wrap type</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["printed", "color-change"] as JobType[]).map((t) => (
              <button key={t} className={`chip ${jobType === t ? "chip-on" : ""}`}
                onClick={() => { setJobType(t); setMaterial(MATERIALS[t][0]); }}>
                {t === "printed" ? "Printed graphics wrap" : "Color-change wrap"}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="material">Material</label>
              <select id="material" className="field" value={material} onChange={(e) => setMaterial(e.target.value)}>
                {MATERIALS[jobType].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="logo">Logo (SVG or PNG preferred)</label>
              <input id="logo" type="file" accept=".svg,.png,.jpg,.jpeg,image/*" className="field py-2"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setLogo({ dataUrl: await fileToDataUrl(f), name: f.name });
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
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="bname">Business name</label>
              <input id="bname" className="field" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="bphone">Phone (on-vehicle)</label>
              <input id="bphone" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="bweb">Website (on-vehicle)</label>
              <input id="bweb" className="field" value={website} onChange={(e) => setWebsite(e.target.value)} />
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
          <div className="mt-4 flex items-center gap-2">
            <input id="legal" type="checkbox" checked={legalOn} onChange={(e) => setLegalOn(e.target.checked)}
              className="h-4 w-4 accent-teal" />
            <label htmlFor="legal" className="text-[14px] font-medium">
              Add DOT / USDOT / MC / licensing text
            </label>
          </div>
          {legalOn && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div><label className="label" htmlFor="usdot">USDOT #</label>
                <input id="usdot" className="field" value={usdot} onChange={(e) => setUsdot(e.target.value)} /></div>
              <div><label className="label" htmlFor="mc">MC #</label>
                <input id="mc" className="field" value={mc} onChange={(e) => setMc(e.target.value)} /></div>
              <div><label className="label" htmlFor="lic">License #</label>
                <input id="lic" className="field" value={license} onChange={(e) => setLicense(e.target.value)} /></div>
            </div>
          )}
        </section>
      </div>

      {/* Summary rail */}
      <aside className="lg:sticky lg:top-6 h-fit">
        <div className="card p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Estimate</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight">{fmtUSD(estimate)}</p>
          <p className="hint">
            One all-in price for a {Math.round(coverage * 100)}% coverage {jobType === "printed" ? "printed" : "color-change"} wrap
            on a {VEHICLE_CLASS_LABELS[vc].toLowerCase()} — design, material and install included.
          </p>
          <button className="btn-accent mt-4 w-full" onClick={submit}>
            Generate my wrap design
          </button>
          <p className="hint mt-2">Takes about 20 seconds. You can generate unlimited variations.</p>
        </div>
      </aside>
    </div>
  );
}
