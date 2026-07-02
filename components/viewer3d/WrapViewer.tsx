"use client";

import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { FlatDesign } from "@/lib/design/model";
import { composeFlatSVG } from "@/lib/design/composer";
import type { VehicleClass } from "@/lib/pricing/constants";
import manifest from "@/models/manifest.json";

/* ----------------------------- lighting rigs ----------------------------- */

export const LIGHTING_PRESETS = ["Studio", "Daylight", "Golden hour", "Night", "Overcast"] as const;
export type LightingPreset = (typeof LIGHTING_PRESETS)[number];

export const BACKGROUNDS = ["Studio", "Showroom", "City", "Outdoor"] as const;
export type Background = (typeof BACKGROUNDS)[number];

const BG_COLOR: Record<Background, string> = {
  Studio: "#e8eaee", Showroom: "#f7f7f8", City: "#232936", Outdoor: "#cfe3ee",
};

function Lights({ preset }: { preset: LightingPreset }) {
  switch (preset) {
    case "Daylight":
      return (<>
        <ambientLight intensity={0.8} />
        <directionalLight position={[8, 12, 6]} intensity={2.2} color="#fffbf2" castShadow />
        <directionalLight position={[-6, 4, -6]} intensity={0.6} color="#dfeaff" />
      </>);
    case "Golden hour":
      return (<>
        <ambientLight intensity={0.45} color="#ffd9b0" />
        <directionalLight position={[10, 3, 2]} intensity={2.6} color="#ffb063" />
        <directionalLight position={[-8, 6, -4]} intensity={0.4} color="#7f8fc9" />
      </>);
    case "Night":
      return (<>
        <ambientLight intensity={0.18} color="#5a6bcf" />
        <pointLight position={[6, 6, 4]} intensity={40} color="#9fc3ff" />
        <pointLight position={[-6, 3, -4]} intensity={25} color="#ff9d5c" />
      </>);
    case "Overcast":
      return (<>
        <ambientLight intensity={1.15} color="#e8ecf2" />
        <directionalLight position={[3, 10, 3]} intensity={0.9} color="#e8ecf2" />
      </>);
    default: // Studio
      return (<>
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 9, 6]} intensity={2} castShadow />
        <directionalLight position={[-7, 5, -5]} intensity={0.9} color="#dfe8ff" />
        <directionalLight position={[0, 4, -8]} intensity={0.7} />
      </>);
  }
}

/* --------------------------- design -> texture --------------------------- */

function useDesignTexture(design: FlatDesign): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const svg = useMemo(
    () => composeFlatSVG(design, { width: 2048, height: 1024 }),
    [design],
  );
  useEffect(() => {
    let alive = true;
    const img = new Image();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      if (!alive) return;
      const canvas = document.createElement("canvas");
      canvas.width = 2048; canvas.height = 1024;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 2048, 1024);
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      setTex(t);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    return () => { alive = false; URL.revokeObjectURL(url); };
  }, [svg]);
  return tex;
}

function wrapMaterial(tex: THREE.Texture | null, design: FlatDesign) {
  const roughness = design.finish === "Gloss" ? 0.18 : design.finish === "Satin" ? 0.38 : 0.62;
  return new THREE.MeshStandardMaterial({
    map: tex || undefined,
    color: tex ? "#ffffff" : (design.branding.colors[0] || "#0E8F86"),
    roughness, metalness: 0.25,
  });
}

/* ------------------------ tier 3: primitive proxies ----------------------- */

const DARK = new THREE.MeshStandardMaterial({ color: "#171b21", roughness: 0.45, metalness: 0.4 });
const GLASS = new THREE.MeshStandardMaterial({ color: "#20262e", roughness: 0.08, metalness: 0.7 });

function Wheel({ x, z, r = 0.42 }: { x: number; z: number; r?: number }) {
  return (
    <group position={[x, r, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh material={DARK}><cylinderGeometry args={[r, r, 0.3, 24]} /></mesh>
      <mesh material={new THREE.MeshStandardMaterial({ color: "#8b929c", roughness: 0.3, metalness: 0.8 })}>
        <cylinderGeometry args={[r * 0.55, r * 0.55, 0.32, 24]} />
      </mesh>
    </group>
  );
}

/** Boxy vehicle proxies per class — the ladder's always-works bottom rung. */
function ProxyVehicle({ vehicleClass, mat }: { vehicleClass: VehicleClass; mat: THREE.Material }) {
  const kind = ((): "sedan" | "suv" | "van" | "box" | "pickup" => {
    if (["cargo-van", "minivan", "high-roof-van"].includes(vehicleClass)) return "van";
    if (["box-truck-16", "box-truck-24", "bus", "semi-trailer", "food-truck"].includes(vehicleClass)) return "box";
    if (vehicleClass === "pickup") return "pickup";
    if (["small-suv", "full-suv"].includes(vehicleClass)) return "suv";
    return "sedan";
  })();

  if (kind === "box") {
    return (
      <group>
        <mesh material={mat} position={[0.4, 1.35, 0]}><boxGeometry args={[3.6, 2.3, 1.9]} /></mesh>
        <mesh material={mat} position={[-2.05, 0.95, 0]}><boxGeometry args={[1.2, 1.5, 1.8]} /></mesh>
        <mesh material={GLASS} position={[-2.6, 1.25, 0]}><boxGeometry args={[0.12, 0.6, 1.6]} /></mesh>
        <Wheel x={-2} z={0.95} /><Wheel x={-2} z={-0.95} />
        <Wheel x={1.4} z={0.95} /><Wheel x={1.4} z={-0.95} />
      </group>
    );
  }
  if (kind === "van") {
    const h = vehicleClass === "high-roof-van" ? 2.15 : 1.75;
    return (
      <group>
        <mesh material={mat} position={[0, h / 2 + 0.25, 0]}><boxGeometry args={[4.4, h, 1.9]} /></mesh>
        <mesh material={GLASS} position={[-2.15, h * 0.72, 0]}><boxGeometry args={[0.14, 0.55, 1.6]} /></mesh>
        <Wheel x={-1.5} z={0.95} /><Wheel x={-1.5} z={-0.95} />
        <Wheel x={1.5} z={0.95} /><Wheel x={1.5} z={-0.95} />
      </group>
    );
  }
  if (kind === "pickup") {
    return (
      <group>
        <mesh material={mat} position={[-0.6, 0.75, 0]}><boxGeometry args={[3, 0.9, 1.85]} /></mesh>
        <mesh material={mat} position={[-1, 1.5, 0]}><boxGeometry args={[1.7, 0.7, 1.7]} /></mesh>
        <mesh material={mat} position={[1.35, 0.85, 0]}><boxGeometry args={[1.9, 0.7, 1.85]} /></mesh>
        <mesh material={GLASS} position={[-0.15, 1.5, 0]}><boxGeometry args={[0.12, 0.55, 1.55]} /></mesh>
        <Wheel x={-1.55} z={0.95} /><Wheel x={-1.55} z={-0.95} />
        <Wheel x={1.55} z={0.95} /><Wheel x={1.55} z={-0.95} />
      </group>
    );
  }
  const cabinH = kind === "suv" ? 0.85 : 0.7;
  const bodyH = kind === "suv" ? 1.0 : 0.85;
  return (
    <group>
      <mesh material={mat} position={[0, bodyH / 2 + 0.3, 0]}><boxGeometry args={[4.3, bodyH, 1.85]} /></mesh>
      <mesh material={mat} position={[-0.15, bodyH + 0.3 + cabinH / 2, 0]}>
        <boxGeometry args={[2.3, cabinH, 1.65]} />
      </mesh>
      <mesh material={GLASS} position={[-1.35, bodyH + 0.32 + cabinH / 2, 0]}>
        <boxGeometry args={[0.14, cabinH * 0.8, 1.5]} />
      </mesh>
      <Wheel x={-1.45} z={0.95} /><Wheel x={-1.45} z={-0.95} />
      <Wheel x={1.45} z={0.95} /><Wheel x={1.45} z={-0.95} />
    </group>
  );
}

/* --------------------- tiers 1–2: GLB model from library ------------------ */

interface ManifestEntry { class: string; file: string | null; wrapMeshes?: string[]; scale?: number; }

function findManifestEntry(vc: VehicleClass): ManifestEntry | null {
  const entries = (manifest as { models: ManifestEntry[] }).models;
  return entries.find((m) => m.class === vc && m.file) || null;
}

function GlbVehicle({ entry, mat }: { entry: ManifestEntry; mat: THREE.Material }) {
  const { scene } = useGLTF(entry.file as string);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const isWrapZone =
          !entry.wrapMeshes?.length || entry.wrapMeshes.some((n) => o.name.includes(n));
        if (isWrapZone) o.material = mat;
      }
    });
    const s = entry.scale ?? 1;
    c.scale.setScalar(s);
    return c;
  }, [scene, mat, entry]);
  return <primitive object={cloned} />;
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { console.warn("[viewer3d] GLB failed — using proxy tier"); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/* --------------------------------- viewer -------------------------------- */

export default function WrapViewer({ design, vehicleClass }: { design: FlatDesign; vehicleClass: VehicleClass }) {
  const [lighting, setLighting] = useState<LightingPreset>("Studio");
  const [bg, setBg] = useState<Background>("Studio");
  const [autoRotate, setAutoRotate] = useState(true);
  const tex = useDesignTexture(design);
  const mat = useMemo(() => wrapMaterial(tex, design), [tex, design]);
  const entry = findManifestEntry(vehicleClass);
  const tier = entry ? "Library model" : "Generic proxy";

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="relative h-[380px] sm:h-[460px]" style={{ background: BG_COLOR[bg] }}>
        <Canvas shadows camera={{ position: [5.2, 2.4, 5.6], fov: 40 }}>
          <color attach="background" args={[BG_COLOR[bg]]} />
          <Lights preset={lighting} />
          <Suspense fallback={<Html center><span className="text-[13px] text-muted">Loading model…</span></Html>}>
            {entry ? (
              <ModelBoundary fallback={<ProxyVehicle vehicleClass={vehicleClass} mat={mat} />}>
                <GlbVehicle entry={entry} mat={mat} />
              </ModelBoundary>
            ) : (
              <ProxyVehicle vehicleClass={vehicleClass} mat={mat} />
            )}
            <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={14} blur={2.4} far={4} />
          </Suspense>
          <OrbitControls
            autoRotate={autoRotate} autoRotateSpeed={1.1}
            enablePan minDistance={3} maxDistance={12} maxPolarAngle={Math.PI / 2.05}
          />
        </Canvas>
        <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-muted backdrop-blur">
          {tier} · drag to spin, scroll to zoom
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-white p-3">
        <label className="text-[12px] font-semibold text-muted" htmlFor="v3d-light">Lighting</label>
        <select id="v3d-light" className="field !w-auto !py-1.5 text-[13px]" value={lighting}
          onChange={(e) => setLighting(e.target.value as LightingPreset)}>
          {LIGHTING_PRESETS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <label className="ml-2 text-[12px] font-semibold text-muted" htmlFor="v3d-bg">Background</label>
        <select id="v3d-bg" className="field !w-auto !py-1.5 text-[13px]" value={bg}
          onChange={(e) => setBg(e.target.value as Background)}>
          {BACKGROUNDS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <button className={`chip ml-auto ${autoRotate ? "chip-on" : ""}`} onClick={() => setAutoRotate(!autoRotate)}>
          {autoRotate ? "Auto-spin on" : "Auto-spin off"}
        </button>
      </div>
    </div>
  );
}
