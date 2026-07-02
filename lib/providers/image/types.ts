import type { FlatDesign, Vehicle } from "@/lib/design/model";

export interface GenerateRequest {
  design: FlatDesign;
  vehicle: Vehicle;
  /** Optional background/scene override ("night city street", "showroom"...). */
  scene?: string;
}

export interface GenerateResult {
  /** Image as a data URL (or remote URL). */
  url: string;
  provider: "openai" | "placeholder";
  /** Human-readable note when a fallback was used. */
  note?: string;
}

export interface ImageProvider {
  name: string;
  generate(req: GenerateRequest): Promise<GenerateResult>;
}
