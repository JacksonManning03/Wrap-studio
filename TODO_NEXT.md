# TODO NEXT — session 2 worklist

## High value
- [ ] Drop in the **real rate card** → `lib/pricing/constants.ts` (rates, color-change rate, add-ons, boat/food-truck areas).
- [ ] Add `OPENAI_API_KEY` and QA photoreal output; tune `lib/providers/image/prompt.ts` per class (van vs box truck vs pickup read differently).
- [ ] Source 5 license-clean, UV-mapped GLBs (sedan, SUV, cargo van, box truck, pickup) → `public/models/` + manifest (workflow in models/HOW_TO_ADD_A_MODEL.md).
- [ ] Wire **inspiration images** into the OpenAI request (multi-image edits input).
- [ ] Connect real GHL webhook + Dropbox token and verify payload field mapping in the GHL workflow.

## Product polish
- [ ] Shareable result links (persist session designs server-side; `/d/{id}` route).
- [ ] Embed **uploaded font files** into the SVG (@font-face with data URL) so text renders in the true brand face everywhere.
- [ ] Send the flat-design SVG as a reference image to the image provider for tighter design↔render fidelity.
- [ ] Coverage zones as named per-panel regions (hood/sides/rear) instead of a single fraction band.
- [ ] Email the customer their mockup + price after the gate (GHL workflow or Resend).

## Infra
- [ ] Vercel disk is ephemeral: local-fallback leads/jobs don't persist between invocations. Either require GHL/Dropbox keys in prod, or add a KV/Blob store.
- [ ] Move export/generation to a queue if OpenAI latency pushes past `maxDuration`.
- [ ] Tighten `frame-ancestors` to the Webflow domain at go-live.
- [ ] Rate-limit /api/generate per session (unlimited variations should not mean unlimited spend).

## Prepress (with operator)
- [ ] Fill PRINT_READY_CHECKLIST.md; implement bleed/tiling/CMYK from it.
