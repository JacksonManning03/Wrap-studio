# ASSUMPTIONS — decisions made on the operator's behalf

1. **Persistence = filesystem, not SQLite/Prisma.** Spec §5 allowed the fallback if setup risked blocking; job JSON + leads write to disk and push to GHL/Dropbox. Zero-dep, works on any host with a writable disk. (On Vercel, disk is ephemeral — leads/jobs still reach GHL/Dropbox when keys are set; flagged in TODO_NEXT.)
2. **Coverage grows from the rear forward** on the flat design (common partial-wrap layout). Text/logo auto-position inside the covered zone so nothing is clipped.
3. **Seed 3D "library" ships as primitive proxies, no GLB binaries.** Sourcing license-clean, UV-mapped GLBs is a content task, not an overnight code task. The manifest, loader, wrap-zone mapping, error-boundary fallback, and add-a-model workflow are all built; drop a GLB in `public/models/` + one manifest line and it's live. Proxy tier covers sedan/SUV/van/high-roof/pickup/box shapes today, so the viewer works for every class.
4. **3D lighting presets are physical light rigs, not HDRI files** (studio/daylight/golden hour/night/overcast) and backgrounds are curated scene colors. Avoids shipping/fetching multi-MB HDRIs from third-party CDNs inside the client's site. HDRI upgrade noted in TODO_NEXT.
5. **Photoreal render does not silently re-render on slider moves** (each render costs money/time). The flat-design coverage preview and the 3D texture update live; a "Re-render" button refreshes the photo at the new coverage. This keeps price/coverage feedback instant and honest.
6. **`gpt-image-1` sizes:** 1536x1024 landscape for vehicle shots. Image *edits* endpoint is used when the user uploads a vehicle photo (keeps their exact vehicle/angle/lighting), generations otherwise.
7. **Brand font handling v0.1:** font *names* are passed into the design + prompt and recorded in job.json; uploaded font *files* are accepted in the UI hook but not yet rasterized into the SVG (needs font embedding — TODO_NEXT).
8. **GHL webhook payload** is flat JSON (firstName/lastName/email/phone + job summary fields) — inbound webhooks accept arbitrary JSON and map fields in the workflow. Secondary API path uses `services.leadconnectorhq.com` v2 with `Version: 2021-07-28`.
9. **Dropbox folder naming:** `/WrapJobs/{yyyy-mm-dd}-{lastname}-{jobid}` with `autorename: true` to avoid collisions.
10. **Vector deliverable is a layered SVG** (`wrap-{job}-EDITABLE.svg`) per spec Path C — opens directly in Illustrator, top-level groups map to named layers. Cut-guide uses a magenta spot-style stroke (industry convention).
11. **Boat/food-truck areas** seeded at 300/500 sq ft (spec left boat as "config"). Marked editable in `lib/pricing/constants.ts`.
12. **Frame-ancestors is `*`** so the Webflow embed works immediately; README tells the operator to tighten it to their domain at go-live.
13. **Inspiration images** are collected and stored on the design object (clean hook per §7.1) but not yet sent to the image API (needs multi-image input handling — TODO_NEXT).
14. **Contact gate validation** is deliberately light (name, plausible email, ≥7-digit phone) — a lead-gen form should never bounce a willing prospect.
