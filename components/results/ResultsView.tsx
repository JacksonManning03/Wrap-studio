"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { RenderMap } from "@/components/Studio";
import BudgetCoverageSlider from "@/components/pricing-slider/BudgetCoverageSlider";
import { composeMockupSVG, svgToDataUrl } from "@/lib/design/composer";
import { uid, type FlatDesign, type Vehicle } from "@/lib/design/model";
import { VEHICLE_CLASSES, VEHICLE_CLASS_LABELS, type VehicleClass } from "@/lib/pricing/constants";
import { fmtUSD, nearestTier, priceFor } from "@/lib/pricing/pricing";

const WrapViewer = dynamic(() => import("@/components/viewer3d/WrapViewer"), {
  ssr: false,
  loading: () => <div className="skeleton h-[380px] rounded-xl sm:h-[460px]" />,
});

const SCENES = ["Studio", "City street at dusk", "Showroom", "Open highway", "Job site"] as const;

interface Props {
  designs: FlatDesign[];
  vehicles: Vehicle[];
  activeDesignId: string;
  activeVehicleId: string;
  renders: RenderMap;
  contact: { name: string; email: string; phone: string } | null;
  onSelectDesign: (id: string) => void;
  onSelectVehicle: (id: string) => void;
  onAddVehicle: (v: Vehicle) => void;
  onRegenerate: () => void;
  onRerender: (scene?: string) => void;
  onUpdateDesign: (id: string, patch: Partial<FlatDesign>) => void;
}

export default function ResultsView(p: Props) {
  const [tab, setTab] = useState<"photo" | "3d">("photo");
  const [scene, setScene] = useState<string>("Studio");
  const [proceeding, setProceeding] = useState(false);
  const [done, setDone] = useState<null | { location: string; path: string; vectorDataUrl: string; jobId: string }>(null);
  const [proceedErr, setProceedErr] = useState("");
  const [addingClass, setAddingClass] = useState<VehicleClass>("cargo-van");

  const design = p.designs.find((d) => d.id === p.activeDesignId) || p.designs[0];
  const vehicle = p.vehicles.find((v) => v.id === p.activeVehicleId) || p.vehicles[0];
  const key = `${design.id}:${vehicle.id}:${scene === "Studio" ? "default" : scene}`;
  const defaultKey = `${design.id}:${vehicle.id}:default`;
  const render = p.renders[key] || p.renders[defaultKey];
  const price = priceFor(vehicle.vehicleClass, design.coverage, design.jobType);
  const coverageLabel = nearestTier(design.coverage).label;

  /** Live coverage preview (always available, updates with the slider). */
  const livePreview = useMemo(
    () => svgToDataUrl(composeMockupSVG(design, vehicle.vehicleClass)),
    [design, vehicle.vehicleClass],
  );

  const proceed = async () => {
    setProceeding(true); setProceedErr("");
    try {
      const mockups = Object.entries(p.renders)
        .filter(([k, r]) => k.startsWith(`${design.id}:${vehicle.id}`) && r.url)
        .map(([, r]) => r.url);
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design, vehicle, price, coverageLabel, contact: p.contact, mockups }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDone(json);
    } catch {
      setProceedErr("We couldn't package the files just now — your design is saved, try again in a moment.");
    } finally {
      setProceeding(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button className={`chip ${tab === "photo" ? "chip-on" : ""}`} onClick={() => setTab("photo")}>
            Photo mockup
          </button>
          <button className={`chip ${tab === "3d" ? "chip-on" : ""}`} onClick={() => setTab("3d")}>
            3D view
          </button>
          <button className="btn-ghost ml-auto !px-4 !py-2 text-[14px]" onClick={p.onRegenerate}>
            ↻ Generate another
          </button>
        </div>

        {tab === "photo" ? (
          <div className="card overflow-hidden">
            {render?.loading || !render ? (
              <div className="skeleton flex h-[380px] items-end p-5 sm:h-[440px]">
                <p className="rounded-full bg-white/80 px-3 py-1.5 text-[13px] font-medium text-muted">
                  Painting your design onto the {VEHICLE_CLASS_LABELS[vehicle.vehicleClass].toLowerCase()}…
                </p>
              </div>
            ) : render.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={render.url} alt={`Wrap mockup on ${vehicle.label}`} className="max-h-[520px] w-full bg-[#e9ebee] object-contain" />
            ) : (
              <div className="flex h-[380px] flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-[15px] font-semibold">That render didn&apos;t come back.</p>
                <button className="btn-primary" onClick={() => p.onRerender()}>Try again</button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t border-line p-3">
              {render?.note && (
                <span className="rounded-full bg-vinyl/10 px-2.5 py-1 text-[12px] font-medium text-vinyl">
                  {render.note}
                </span>
              )}
              <label className="ml-auto text-[12px] font-semibold text-muted" htmlFor="scene">Setting</label>
              <select id="scene" className="field !w-auto !py-1.5 text-[13px]" value={scene}
                onChange={(e) => setScene(e.target.value)}>
                {SCENES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button className="btn-ghost !px-3 !py-1.5 text-[13px]"
                onClick={() => p.onRerender(scene === "Studio" ? undefined : scene)}>
                Re-render here
              </button>
            </div>
          </div>
        ) : (
          <WrapViewer design={design} vehicleClass={vehicle.vehicleClass} />
        )}

        {/* Coverage preview strip — the flat design, live */}
        <div className="card flex items-center gap-4 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={livePreview} alt="Coverage preview" className="h-20 w-auto rounded-lg border border-line bg-white" />
          <p className="text-[13px] text-muted">
            Live coverage preview — this updates instantly as you move the
            sliders. Use <span className="font-semibold text-ink">Re-render</span> to refresh the photo mockup at the new coverage.
          </p>
        </div>

        {/* Session gallery */}
        {p.designs.length > 1 && (
          <div>
            <p className="label">This session&apos;s variations</p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {p.designs.map((d) => {
                const r = p.renders[`${d.id}:${vehicle.id}:default`];
                const thumb = r?.url || svgToDataUrl(composeMockupSVG(d, vehicle.vehicleClass));
                return (
                  <button key={d.id} onClick={() => p.onSelectDesign(d.id)}
                    className={`shrink-0 overflow-hidden rounded-lg border-2 ${d.id === design.id ? "border-teal" : "border-line"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumb} alt={`Variation ${d.variant + 1}`} className="h-16 w-28 bg-white object-cover" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right rail */}
      <aside className="space-y-4 lg:sticky lg:top-6 h-fit">
        <BudgetCoverageSlider
          vehicleClass={vehicle.vehicleClass}
          jobType={design.jobType}
          coverage={design.coverage}
          onCoverage={(f) => p.onUpdateDesign(design.id, { coverage: f })}
        />

        {/* Vehicle switcher / try on other vehicles */}
        <div className="card p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
            Try this design on
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {p.vehicles.map((v) => (
              <button key={v.id} className={`chip ${v.id === vehicle.id ? "chip-on" : ""}`}
                onClick={() => p.onSelectVehicle(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <select className="field !py-2 text-[13px]" value={addingClass}
              aria-label="Vehicle type to add"
              onChange={(e) => setAddingClass(e.target.value as VehicleClass)}>
              {VEHICLE_CLASSES.map((c) => <option key={c} value={c}>{VEHICLE_CLASS_LABELS[c]}</option>)}
            </select>
            <button className="btn-ghost !px-3 !py-2 text-[13px]" onClick={() => {
              const v: Vehicle = {
                id: uid("veh"), vehicleClass: addingClass, photos: [],
                label: VEHICLE_CLASS_LABELS[addingClass],
              };
              p.onAddVehicle(v);
              p.onSelectVehicle(v.id);
            }}>
              Add
            </button>
          </div>
        </div>

        {/* Proceed */}
        <div className="card p-5">
          {done ? (
            <div>
              <p className="text-lg font-bold text-teal">You&apos;re on the books. ✓</p>
              <p className="hint mt-1">
                Your job files are packaged{done.location === "dropbox" ? " and delivered to our production Dropbox" : ""}.
                Our team will reach out to finalize production details.
              </p>
              <a className="btn-primary mt-3 w-full" href={done.vectorDataUrl}
                download={`wrap-${done.jobId}-EDITABLE.svg`}>
                Download vector art
              </a>
              <p className="hint mt-2">Layer-editable file — opens directly in Adobe Illustrator.</p>
            </div>
          ) : (
            <>
              <p className="text-[15px] font-semibold">Ready to make it real?</p>
              <p className="hint mt-1">
                {fmtUSD(price)} all-in · {coverageLabel} · {design.material} · {design.finish}
              </p>
              <button className="btn-accent mt-3 w-full" onClick={proceed} disabled={proceeding}>
                {proceeding ? "Packaging your files…" : "I want this wrap"}
              </button>
              {proceedErr && <p className="mt-2 text-[13px] font-medium text-vinyl">{proceedErr}</p>}
              <p className="hint mt-2">
                We assemble your print-ready vector art and job files, and our team confirms everything before production.
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
