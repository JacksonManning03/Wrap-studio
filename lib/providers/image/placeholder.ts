import type { GenerateRequest, GenerateResult, ImageProvider } from "./types";
import { composeMockupSVG, svgToDataUrl } from "@/lib/design/composer";

/**
 * Zero-dependency fallback: paints the real flat design into a vehicle
 * silhouette. Always works; clearly labeled in the UI.
 */
export const placeholderProvider: ImageProvider = {
  name: "placeholder",
  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const svg = composeMockupSVG(req.design, req.vehicle.vehicleClass);
    return {
      url: svgToDataUrl(svg),
      provider: "placeholder",
      note: "Preview placeholder — add OPENAI_API_KEY for photoreal renders.",
    };
  },
};
