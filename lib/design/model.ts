import type { Finish, JobType, VehicleClass } from "@/lib/pricing/constants";

/**
 * THE FLAT DESIGN — single source of truth.
 * One flat, vector-composed design feeds all three outputs:
 *  1. photoreal render (reference for AI generation)
 *  2. 3D texture (applied to the model's wrap zones)
 *  3. print vector export (layer-editable, Illustrator-openable)
 */
export interface Branding {
  /** Uploaded logo, preserved exactly. data URL (SVG/PNG preferred). */
  logoDataUrl?: string;
  logoName?: string;
  /** Locked brand colors, hex. Order = priority. */
  colors: string[];
  /** Named or uploaded fonts. Names only in v0.1; files noted in job.json. */
  fontNames: string[];
  businessName?: string;
  phone?: string;
  website?: string;
}

export interface LegalText {
  enabled: boolean; // only render when the user asked for it
  usdot?: string;
  mc?: string;
  license?: string;
}

export interface Vehicle {
  id: string;
  vehicleClass: VehicleClass;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  /** Real photo(s) of the user's vehicle, data URLs. Improves render fidelity. */
  photos: string[];
  label: string;
}

export interface FlatDesign {
  id: string;
  jobType: JobType;
  material: string;
  finish: Finish;
  /** 0.05–1.00 exact fraction; drives coverage zones + price. */
  coverage: number;
  branding: Branding;
  legal: LegalText;
  /** Free-text style/vibe from the user. */
  direction?: string;
  /** Inspiration images (data URLs) — hook for the generator. */
  inspiration: string[];
  /** Deterministic seed; variant increments on "generate more". */
  seed: number;
  variant: number;
}

export interface JobSummary {
  jobId: string;
  design: FlatDesign;
  vehicle: Vehicle;
  price: number;
  coverageLabel: string;
  contact?: { name: string; email: string; phone: string };
  createdAt: string;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const DEFAULT_PALETTE = ["#0E8F86", "#171B21", "#F6F7F5"];
