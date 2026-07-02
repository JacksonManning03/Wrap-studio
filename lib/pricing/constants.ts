// ============================================================================
// PRICING CONSTANTS — SEED VALUES.
// >>> REPLACE WITH THE SHOP'S REAL RATE CARD BEFORE GO-LIVE. <<<
// Every number the pricing engine uses lives in this file.
// ============================================================================

export type JobType = "printed" | "color-change";

/** USD per sq ft, all-in (print + material + install + design). Seed value. */
export const PRINTED_WRAP_RATE = 24;

/** TBD — awaiting rate card. Defaults to the printed rate until provided. */
export const COLOR_CHANGE_RATE = PRINTED_WRAP_RATE;

/** Optional add-ons (USD, flat). Default 0 until the rate card lands. */
export const ADDONS = { removal: 0, prep: 0, rush: 0 };

export const VEHICLE_CLASSES = [
  "coupe-compact","sedan","small-suv","full-suv","minivan","pickup",
  "cargo-van","high-roof-van","box-truck-16","box-truck-24","bus",
  "semi-trailer","motorcycle","boat","food-truck","other",
] as const;
export type VehicleClass = (typeof VEHICLE_CLASSES)[number];

export const VEHICLE_CLASS_LABELS: Record<VehicleClass, string> = {
  "coupe-compact": "Coupe / compact", sedan: "Sedan", "small-suv": "Small SUV",
  "full-suv": "Full-size SUV", minivan: "Minivan / passenger van", pickup: "Pickup (crew)",
  "cargo-van": "Cargo van", "high-roof-van": "High-roof / extended van",
  "box-truck-16": "Box truck (16 ft)", "box-truck-24": "Box truck (24–26 ft)",
  bus: "Bus", "semi-trailer": "Semi trailer (53 ft)", motorcycle: "Motorcycle",
  boat: "Boat", "food-truck": "Food truck", other: "Other",
};

/** Full-wrap wrappable area by class, sq ft. Editable seed values. */
export const AREA_TABLE: Record<VehicleClass, number> = {
  "coupe-compact": 210, sedan: 250, "small-suv": 275, "full-suv": 310,
  minivan: 300, pickup: 290, "cargo-van": 350, "high-roof-van": 430,
  "box-truck-16": 650, "box-truck-24": 900, bus: 1200, "semi-trailer": 1500,
  motorcycle: 25,
  boat: 300,         // config — confirm per hull
  "food-truck": 500, // treated like a mid box truck; confirm
  other: 250,
};

export const COVERAGE_TIERS = [
  { id: "spot", label: "Spot decals", fraction: 0.10 },
  { id: "partial", label: "Partial wrap", fraction: 0.30 },
  { id: "half", label: "Half wrap", fraction: 0.50 },
  { id: "three-quarter", label: "Three-quarter wrap", fraction: 0.75 },
  { id: "full", label: "Full wrap", fraction: 1.00 },
] as const;

export const MIN_COVERAGE = 0.05;
export const MAX_COVERAGE = 1.0;

/** Fixed materials list — present only these. */
export const MATERIALS = {
  printed: ["Avery 1105"],
  "color-change": ["3M 2080", "Avery SW900"],
} as const;

export const FINISHES = ["Gloss", "Matte", "Satin", "Window perf"] as const;
export type Finish = (typeof FINISHES)[number];
