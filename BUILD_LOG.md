# BUILD LOG — overnight session 1 (2026-07-01)

All eight rungs of the §8 priority ladder were reached. The app builds clean
(`next build`), serves, and every fallback path was smoke-tested live.

1. **Scaffold** — Next.js 14 (App Router) + TypeScript + Tailwind; iframe-friendly headers; `.env.example` with every key documented.
2. **Pricing engine** (`lib/pricing/`) — single constants file (rates, area table, tiers, materials, finishes) + bidirectional budget↔coverage math with tier snapping. Rung 4 core.
3. **Flat design model + composer** (`lib/design/`) — the one-source-of-truth layered vector design; deterministic seeded graphics (4 style families rotating per variant); exact-logo embedding; legal text only when enabled; per-class vehicle silhouettes; coverage clipping with content auto-positioned inside the covered zone (fixed after visual QA).
4. **Image provider layer** (`lib/providers/image/`) — swappable interface; OpenAI `gpt-image-1` (photo → image-edit path, otherwise text-to-image) with brand-obedience prompt builder; placeholder provider that paints the real flat design into a silhouette. Rung 3.
5. **Lead capture** (`lib/leads/ghl.ts` + `/api/leads`) — GHL webhook → GHL API v2 → local JSON file, in that order; never throws at the user. Rung 2. ✔ smoke-tested (local path).
6. **Intake UI** (`components/intake/`) — multi-vehicle (fleet), photos, class, y/m/m/t, wrap type/material/finish (fixed lists only), coverage tier, budget, full branding block, direction, inspiration uploads, legal-text toggle, live estimate rail. Rung 1.
7. **Contact gate** — renders *while* the first mockup generates; lead fires non-blocking; reveal on submit. Rung 2.
8. **Results view** — photo/3D tabs, session variation gallery, "Generate another" (unlimited variants), scene re-render selector, live coverage preview strip, friendly error states. Rungs 3/8.
9. **Budget↔coverage slider** (`components/pricing-slider/`) — two linked vinyl-strip sliders (budget ⇄ coverage), one all-in total, tier snap labels, live design update. Rung 4.
10. **3D viewer** (`components/viewer3d/`) — R3F + drei; orbit/zoom/pan + auto-spin; 5 lighting rigs; 4 backgrounds; flat design → CanvasTexture applied to wrap meshes; finish drives roughness; GLB manifest loader with error-boundary → class proxy ladder (tier badge shown). Rung 5.
11. **Vector export** (`lib/export/illustrator.ts` + `/api/export`) — assembles real vector pieces into layered, Illustrator-openable SVG with named layers `film-base/graphics/logo/text/coverage-zones/cut-guide` + magenta cut-guide from the class silhouette. No tracing, no native .ai binary. Rung 6. ✔ smoke-tested.
12. **Dropbox delivery** (`lib/files/dropbox.ts`) — per-job folder upload with local `output/jobs/` fallback; package = editable vector + job.json + session mockups. Rung 7. ✔ smoke-tested (local path).
13. **Multi-vehicle try-on** — apply the active design to any added vehicle; renders cached per design×vehicle×scene. Rung 8.
14. **Visual QA** — rendered placeholder mockup + vector export to PNG, caught and fixed text clipping outside the coverage zone, re-verified.
15. **Docs** — README (run + embed + env matrix), ASSUMPTIONS, TODO_NEXT, PRINT_READY_CHECKLIST stub, HOW_TO_ADD_A_MODEL.

**Fallbacks exercised this session:** placeholder image provider ✔, local leads file ✔, local job delivery ✔, proxy 3D tier ✔ (no GLBs shipped).
