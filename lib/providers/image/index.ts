import { config } from "@/lib/config";
import type { ImageProvider } from "./types";
import { openaiProvider } from "./openai";
import { placeholderProvider } from "./placeholder";

/** Swappable via IMAGE_PROVIDER env — add new providers here. */
export function getImageProvider(): ImageProvider {
  switch (config.imageProvider) {
    case "placeholder": return placeholderProvider;
    case "openai":
    default: return openaiProvider;
  }
}
