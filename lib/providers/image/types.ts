import type { FlatDesign, RenderAngle, Vehicle } from "@/lib/design/model";

export interface GenerateRequest {
  design: FlatDesign;
  vehicle: Vehicle;
  /** Optional background/scene override ("night city street", "showroom"...). */
  scene?: string;
  /** Render quality tier: concepts render "low", finalize renders "high". */
  quality?: "low" | "medium" | "high";
  /** Camera angle; defaults to front 3/4 driver's side (the reference framing). */
  angle?: RenderAngle;
}

export interface QAResult {
  passed: boolean;
  issues: string[];
}

export interface GenerateResult {
  /** Image as a data URL (or remote URL). */
  url: string;
  provider: "openai" | "placeholder";
  /** Human-readable note when a fallback was used. */
  note?: string;
  /** Vision auto-check verdict (spelling, logo fidelity, badge ban). */
  qa?: QAResult;
}

export interface ImageProvider {
  name: string;
  generate(req: GenerateRequest): Promise<GenerateResult>;
}
