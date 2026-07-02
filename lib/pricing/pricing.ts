import {
  AREA_TABLE, COVERAGE_TIERS, MIN_COVERAGE, MAX_COVERAGE,
  PRINTED_WRAP_RATE, COLOR_CHANGE_RATE, type JobType, type VehicleClass,
} from "./constants";

export function rateFor(jobType: JobType): number {
  return jobType === "color-change" ? COLOR_CHANGE_RATE : PRINTED_WRAP_RATE;
}

export function clampCoverage(f: number): number {
  return Math.min(MAX_COVERAGE, Math.max(MIN_COVERAGE, f));
}

/** One all-in total. No line items in the UI. */
export function priceFor(vc: VehicleClass, coverage: number, jobType: JobType): number {
  const area = AREA_TABLE[vc];
  return Math.round(area * clampCoverage(coverage) * rateFor(jobType));
}

/** budget -> coverage (inverse). */
export function coverageForBudget(budget: number, vc: VehicleClass, jobType: JobType): number {
  const affordableArea = budget / rateFor(jobType);
  return clampCoverage(affordableArea / AREA_TABLE[vc]);
}

/** Snap label to the nearest named tier; keep exact fraction for rendering. */
export function nearestTier(coverage: number): (typeof COVERAGE_TIERS)[number] {
  let best: (typeof COVERAGE_TIERS)[number] = COVERAGE_TIERS[0];
  for (const t of COVERAGE_TIERS) {
    if (Math.abs(t.fraction - coverage) < Math.abs(best.fraction - coverage)) best = t;
  }
  return best;
}

export function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
