"use client";

import { useCallback, useRef, useState } from "react";
import IntakeForm, { type IntakePayload } from "@/components/intake/IntakeForm";
import ContactGate from "@/components/results/ContactGate";
import ResultsView from "@/components/results/ResultsView";
import { uid, type FlatDesign, type Vehicle } from "@/lib/design/model";
import { MATERIALS } from "@/lib/pricing/constants";
import { nearestTier, priceFor } from "@/lib/pricing/pricing";

export interface Render { url: string; provider: string; note?: string; loading?: boolean; }
export type RenderMap = Record<string, Render>; // key: designId:vehicleId:scene

export default function Studio() {
  const [step, setStep] = useState<"intake" | "gate" | "results">("intake");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [designs, setDesigns] = useState<FlatDesign[]>([]);
  const [activeDesignId, setActiveDesignId] = useState<string>("");
  const [activeVehicleId, setActiveVehicleId] = useState<string>("");
  const [renders, setRenders] = useState<RenderMap>({});
  const [contact, setContact] = useState<{ name: string; email: string; phone: string } | null>(null);
  const gateDone = useRef(false);

  const renderKey = (d: string, v: string, scene = "default") => `${d}:${v}:${scene}`;

  // Step 1: build a clean side-profile template from the client's photo.
  // Cached per vehicle; failures fall back to rendering on the raw photo.
  const ensureTemplate = useCallback(async (vehicle: Vehicle): Promise<Vehicle> => {
    if (vehicle.templateUrl || !vehicle.photos[0]) return vehicle;
    try {
      const res = await fetch("/api/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: vehicle.photos[0] }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) return vehicle;
      const withTemplate = { ...vehicle, templateUrl: json.url as string };
      setVehicles((vs) => vs.map((v) => (v.id === vehicle.id ? withTemplate : v)));
      return withTemplate;
    } catch {
      return vehicle;
    }
  }, []);

  // Step 2: paint the wrap design onto the template.
  const generate = useCallback(
    async (design: FlatDesign, vehicle: Vehicle, scene?: string) => {
      const key = renderKey(design.id, vehicle.id, scene || "default");
      setRenders((r) => ({ ...r, [key]: { url: "", provider: "", loading: true } }));
      try {
        const veh = await ensureTemplate(vehicle);
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ design, vehicle: veh, scene }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "generate failed");
        setRenders((r) => ({ ...r, [key]: { ...json, loading: false } }));
      } catch {
        setRenders((r) => ({
          ...r,
          [key]: {
            url: "", provider: "error", loading: false,
            note: "We couldn't render that one — try Generate again.",
          },
        }));
      }
    },
    [ensureTemplate],
  );

  const handleIntake = useCallback(
    (p: IntakePayload) => {
      const design: FlatDesign = {
        id: uid("dsn"),
        jobType: "printed",
        material: MATERIALS.printed[0],
        finish: p.finish,
        coverage: p.coverage,
        branding: p.branding,
        legal: { enabled: false },
        customText: p.customText,
        direction: p.direction,
        inspiration: p.inspiration,
        seed: Math.floor(Math.random() * 1e9),
        variant: 0,
      };
      setVehicles(p.vehicles);
      setDesigns([design]);
      setActiveDesignId(design.id);
      setActiveVehicleId(p.vehicles[0].id);
      // Start rendering NOW — the contact gate lives inside this wait.
      void generate(design, p.vehicles[0]);
      setStep("results"); // contact gate disabled for personal use — no lead capture
    },
    [generate],
  );

  const handleLead = useCallback(
    async (c: { name: string; email: string; phone: string }) => {
      setContact(c);
      gateDone.current = true;
      const design = designs.find((d) => d.id === activeDesignId);
      const vehicle = vehicles.find((v) => v.id === activeVehicleId);
      const price = design && vehicle ? priceFor(vehicle.vehicleClass, design.coverage, design.jobType) : 0;
      // Fire-and-forget: lead capture never blocks the reveal.
      void fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...c,
          jobSummary: design && vehicle
            ? {
                vehicle: vehicle.label,
                vehicleClass: vehicle.vehicleClass,
                coverage: nearestTier(design.coverage).label,
                coverageFraction: design.coverage,
                budgetOrPrice: price,
                designId: design.id,
                material: design.material,
                finish: design.finish,
              }
            : {},
        }),
      });
      setStep("results");
    },
    [designs, vehicles, activeDesignId, activeVehicleId],
  );

  const regenerate = useCallback(() => {
    const base = designs.find((d) => d.id === activeDesignId) || designs[designs.length - 1];
    const vehicle = vehicles.find((v) => v.id === activeVehicleId);
    if (!base || !vehicle) return;
    const next: FlatDesign = { ...base, id: uid("dsn"), variant: base.variant + 1 };
    setDesigns((d) => [...d, next]);
    setActiveDesignId(next.id);
    void generate(next, vehicle);
  }, [designs, vehicles, activeDesignId, activeVehicleId, generate]);

  const updateDesign = useCallback((id: string, patch: Partial<FlatDesign>) => {
    setDesigns((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-teal">
            Wrap Studio
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            See your vehicle, wrapped.
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-muted">
            Design a wrap on your own vehicle, spin it in 3D, and get one all-in
            price — in about two minutes.
          </p>
        </div>
      </header>

      {step === "intake" && <IntakeForm onSubmit={handleIntake} />}

      {step === "gate" && <ContactGate onSubmit={handleLead} />}

      {step === "results" && (
        <ResultsView
          designs={designs}
          vehicles={vehicles}
          activeDesignId={activeDesignId}
          activeVehicleId={activeVehicleId}
          renders={renders}
          contact={contact}
          onSelectDesign={setActiveDesignId}
          onSelectVehicle={(vid) => {
            setActiveVehicleId(vid);
            const d = designs.find((x) => x.id === activeDesignId);
            const v = vehicles.find((x) => x.id === vid);
            if (d && v && !renders[`${d.id}:${v.id}:default`]) void generate(d, v);
          }}
          onAddVehicle={(v) => setVehicles((vs) => [...vs, v])}
          onRegenerate={regenerate}
          onRerender={(scene) => {
            const d = designs.find((x) => x.id === activeDesignId);
            const v = vehicles.find((x) => x.id === activeVehicleId);
            if (d && v) void generate(d, v, scene);
          }}
          onUpdateDesign={updateDesign}
        />
      )}

      <footer className="mt-10 border-t border-line pt-4 text-[12px] text-muted">
        Mockups are visual concepts — final production art is prepared and
        confirmed by our design team before printing.
      </footer>
    </main>
  );
}
