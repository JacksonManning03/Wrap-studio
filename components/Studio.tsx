"use client";

import { useCallback, useRef, useState } from "react";
import IntakeForm, { type IntakePayload } from "@/components/intake/IntakeForm";
import ContactGate from "@/components/results/ContactGate";
import ResultsView from "@/components/results/ResultsView";
import { uid, type FlatDesign, type RenderAngle, type Vehicle } from "@/lib/design/model";
import { MATERIALS } from "@/lib/pricing/constants";
import { nearestTier, priceFor } from "@/lib/pricing/pricing";

export interface Render {
  url: string; provider: string; note?: string; loading?: boolean;
  qa?: { passed: boolean; issues: string[] };
  finalized?: boolean;
}
export type RenderMap = Record<string, Render>; // key: designId:vehicleId:scene:angle

/** Five deliberately different first-pass concepts, refined from there. */
const STYLE_DIRECTIONS = [
  "Clean & corporate — body stays mostly the base color or white, huge clean logo and lettering, generous negative space, one thin accent stripe",
  "Bold color-block — large angled panels of the brand colors sweeping front to rear, business name knocked out big and white on the doors",
  "Premium dark — deep black or charcoal base, brand colors as sharp accent lines, understated and high-end",
  "Dynamic flow — sweeping curved brand-color graphics that follow the body lines from fender to rear, energetic but clean",
  "Full themed graphic — edge-to-edge artwork themed to the company's trade, with the text zones kept clean and readable on solid areas",
];

export default function Studio() {
  const [step, setStep] = useState<"intake" | "gate" | "results">("intake");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [designs, setDesigns] = useState<FlatDesign[]>([]);
  const [activeDesignId, setActiveDesignId] = useState<string>("");
  const [activeVehicleId, setActiveVehicleId] = useState<string>("");
  const [renders, setRenders] = useState<RenderMap>({});
  const [contact, setContact] = useState<{ name: string; email: string; phone: string } | null>(null);
  const gateDone = useRef(false);

  const renderKey = (d: string, v: string, scene = "default", angle: RenderAngle = "front34") =>
    `${d}:${v}:${scene}:${angle}`;

  // Step 1: build a clean template from the client's photo, at the requested
  // camera angle. Cached per vehicle×angle; failures fall back to the raw photo.
  const ensureTemplate = useCallback(async (vehicle: Vehicle, angle: RenderAngle = "front34"): Promise<Vehicle> => {
    if (vehicle.templateUrls?.[angle] || !vehicle.photos[0]) return vehicle;
    try {
      const spec = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");
      const res = await fetch("/api/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo: vehicle.photos[0],
          spec: spec || undefined,
          bodyConfig: vehicle.bodyConfig,
          color: vehicle.baseColor,
          angle,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) return vehicle;
      const withTemplate: Vehicle = {
        ...vehicle,
        templateUrls: { ...vehicle.templateUrls, [angle]: json.url as string },
      };
      // Merge functionally — both angles can resolve in parallel.
      setVehicles((vs) => vs.map((v) =>
        v.id === vehicle.id ? { ...v, templateUrls: { ...v.templateUrls, [angle]: json.url as string } } : v,
      ));
      return withTemplate;
    } catch {
      return vehicle;
    }
  }, []);

  // Step 2: paint the wrap design onto the template. Concepts render at
  // quality "low" (drafts); finalize re-renders at "high". A failed vision
  // QA triggers ONE automatic retry, then the verdict is shown in the UI.
  const generate = useCallback(
    async (
      design: FlatDesign, vehicle: Vehicle, scene?: string,
      opts?: { quality?: "low" | "medium" | "high"; attempt?: number; finalized?: boolean; angle?: RenderAngle },
    ) => {
      const angle = opts?.angle || "front34";
      const key = renderKey(design.id, vehicle.id, scene || "default", angle);
      const attempt = opts?.attempt ?? 0;
      setRenders((r) => ({ ...r, [key]: { url: "", provider: "", loading: true } }));
      try {
        const veh = await ensureTemplate(vehicle, angle);
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ design, vehicle: veh, scene, quality: opts?.quality || "low", angle }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "generate failed");
        if (json.qa && !json.qa.passed && attempt === 0) {
          // Auto-retry once; keep the failed draft on screen while it runs.
          setRenders((r) => ({ ...r, [key]: { ...json, loading: true, finalized: opts?.finalized } }));
          return generate(design, vehicle, scene, { ...opts, attempt: 1 });
        }
        setRenders((r) => ({ ...r, [key]: { ...json, loading: false, finalized: opts?.finalized } }));
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

  /** Re-render the chosen concept at high quality for the client-facing proof — both corners. */
  const finalize = useCallback(() => {
    const design = designs.find((d) => d.id === activeDesignId);
    const vehicle = vehicles.find((v) => v.id === activeVehicleId);
    if (!design || !vehicle) return;
    void generate(design, vehicle, undefined, { quality: "high", finalized: true, angle: "front34" });
    void generate(design, vehicle, undefined, { quality: "high", finalized: true, angle: "rear34" });
  }, [designs, vehicles, activeDesignId, activeVehicleId, generate]);

  const handleIntake = useCallback(
    (p: IntakePayload) => {
      const newDesigns: FlatDesign[] = STYLE_DIRECTIONS.map((styleHint, i) => ({
        id: uid("dsn"),
        jobType: "printed",
        material: MATERIALS.printed[0],
        finish: p.finish,
        coverage: p.coverage,
        branding: p.branding,
        legal: { enabled: false },
        customText: p.customText,
        styleHint,
        direction: p.direction,
        inspiration: p.inspiration,
        seed: Math.floor(Math.random() * 1e9),
        variant: i,
      }));
      setVehicles(p.vehicles);
      setDesigns(newDesigns);
      setActiveDesignId(newDesigns[0].id);
      setActiveVehicleId(p.vehicles[0].id);
      // Template and designer briefs build in parallel, then all five
      // concepts fan out against the cached template with their briefs.
      void (async () => {
        const [veh, briefRes] = await Promise.all([
          ensureTemplate(p.vehicles[0]),
          fetch("/api/brief", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...p.branding,
              logoDataUrl: p.branding.logoDataUrl,
              vehicleLabel: p.vehicles[0].label,
              coverage: p.coverage,
              finish: p.finish,
              customText: p.customText,
              direction: p.direction,
              siteText: p.siteText,
              trade: p.trade,
              styleHints: STYLE_DIRECTIONS,
            }),
          }).then((r) => r.json()).catch(() => ({ briefs: [] })),
        ]);
        const briefed = newDesigns.map((d, i) => ({
          ...d,
          brief: briefRes.briefs?.[i] || undefined,
          logoDescription: briefRes.logoDescription || undefined,
        }));
        setDesigns(briefed);
        briefed.forEach((d) => void generate(d, veh));
      })();
      setStep("results"); // contact gate disabled for personal use — no lead capture
    },
    [generate, ensureTemplate],
  );

  /** Feedback loop: take the active concept, apply the client's note, re-render. */
  const refine = useCallback(
    (note: string) => {
      const base = designs.find((d) => d.id === activeDesignId);
      const vehicle = vehicles.find((v) => v.id === activeVehicleId);
      if (!base || !vehicle) return;
      const next: FlatDesign = {
        ...base,
        id: uid("dsn"),
        variant: designs.length,
        direction: [base.direction, `Revision request — apply this change while keeping everything else: ${note}`]
          .filter(Boolean).join(". "),
      };
      setDesigns((d) => [...d, next]);
      setActiveDesignId(next.id);
      void generate(next, vehicle);
    },
    [designs, vehicles, activeDesignId, activeVehicleId, generate],
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
            if (d && v && !renders[renderKey(d.id, v.id)]) void generate(d, v);
          }}
          onAddVehicle={(v) => setVehicles((vs) => [...vs, v])}
          onRegenerate={regenerate}
          onRefine={refine}
          onFinalize={finalize}
          onRerender={(scene, angle) => {
            const d = designs.find((x) => x.id === activeDesignId);
            const v = vehicles.find((x) => x.id === activeVehicleId);
            if (d && v) void generate(d, v, scene, { angle });
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
