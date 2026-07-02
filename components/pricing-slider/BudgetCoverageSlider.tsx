"use client";

import { useMemo } from "react";
import { AREA_TABLE, MIN_COVERAGE, type JobType, type VehicleClass } from "@/lib/pricing/constants";
import { coverageForBudget, fmtUSD, nearestTier, priceFor, rateFor } from "@/lib/pricing/pricing";

/**
 * The signature control: one strip of "vinyl" that is simultaneously the
 * budget and the coverage. Drag budget → coverage resizes (and the design's
 * coverage zones with it). Drag coverage → the price updates. One all-in total.
 */
export default function BudgetCoverageSlider({
  vehicleClass, jobType, coverage, onCoverage,
}: {
  vehicleClass: VehicleClass;
  jobType: JobType;
  coverage: number;
  onCoverage: (fraction: number) => void;
}) {
  const price = priceFor(vehicleClass, coverage, jobType);
  const maxBudget = useMemo(
    () => Math.ceil(AREA_TABLE[vehicleClass] * rateFor(jobType)),
    [vehicleClass, jobType],
  );
  const minBudget = Math.floor(maxBudget * MIN_COVERAGE);
  const tier = nearestTier(coverage);
  const pct = Math.round(coverage * 100);

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
            Your all-in price
          </p>
          <p className="text-3xl font-extrabold tracking-tight">{fmtUSD(price)}</p>
        </div>
        <div className="text-right">
          <p className="text-[13px] font-semibold">{tier.label}</p>
          <p className="text-[12px] text-muted">{pct}% of the body</p>
        </div>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="coverage-slider">Coverage</label>
        <input
          id="coverage-slider" type="range" className="vinyl"
          min={MIN_COVERAGE * 100} max={100} step={1}
          value={pct}
          style={{ ["--fill" as string]: `${pct}%` }}
          onChange={(e) => onCoverage(Number(e.target.value) / 100)}
          aria-valuetext={`${pct} percent coverage, ${fmtUSD(price)}`}
        />
      </div>

      <div className="mt-3">
        <label className="label" htmlFor="budget-slider">Budget</label>
        <input
          id="budget-slider" type="range" className="vinyl"
          min={minBudget} max={maxBudget} step={25}
          value={price}
          style={{ ["--fill" as string]: `${Math.round(((price - minBudget) / (maxBudget - minBudget)) * 100)}%` }}
          onChange={(e) =>
            onCoverage(coverageForBudget(Number(e.target.value), vehicleClass, jobType))
          }
          aria-valuetext={`Budget ${fmtUSD(price)}`}
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>{fmtUSD(minBudget)}</span>
          <span>{fmtUSD(maxBudget)} full wrap</span>
        </div>
      </div>

      <p className="hint mt-2">
        Design, material and installation included. Slide either bar — the
        design&apos;s coverage adjusts live in the previews.
      </p>
    </div>
  );
}
