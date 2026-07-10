# Reference outputs — what "done" looks like

Known-good renders that define the quality bar for the mockup generator.
`lib/providers/image/prompt.ts`, `app/api/brief/route.ts` (the brief-writer),
and the vision QA checklist in `lib/providers/image/openai.ts` are all
calibrated against these. When tuning prompts or QA, compare candidate output
against this folder — not against memory.

## paradise-washing-proof.png — THE golden reference

1536×1024, gpt-image-1. A GMC Sierra crew cab for "Paradise Washing"
(soft-wash/pressure-washing, Phoenix AZ). Every design/mockup we ship should
hit this level. What makes it pass:

**Photorealism & integration**
- The vehicle reads as a real photograph: correct proportions, believable
  gloss reflections, sun direction consistent between vehicle, shadow, and
  scene. Nothing about the truck itself looks AI-generated.
- Scene sells the trade in its real market: residential driveway, desert
  landscaping, palm trees — the customer this business actually serves.
  (Note: the current prompt defaults to a white studio broadside and takes
  `scene` as an optional override; this reference is a 3/4 front view in a
  scene. The bar is the *polish*, in both framings.)

**Wrap design quality**
- Solid brand-orange base with a **tone-on-tone motif tied to the trade**:
  darker-orange palm-tree silhouettes, subtle, same hue family — never a new
  color. Visual interest without busyness; generous negative space.
- Strong hierarchy: logo dominates the doors, phone number secondary on the
  front fender, supporting lines smallest on the bed side. Everything legible
  at a glance / "from 50 feet".

**Brand & text discipline**
- Logo reproduced as real vector art on the body: white script "Paradise"
  with black outline, a palm tree standing in for the "i", "Washing" in
  orange script beneath — crisp edges, no warping or repainting.
- Per-panel placement exactly as the brief language specifies:
  - Doors: "Paradise Washing" logo, large
  - Front fender: "480.712.5740"
  - Bed side: "Soft Wash Specialists" + "ParadiseWashing.com"
- Every word spelled exactly; no gibberish, no watermarks.

**Vehicle honesty**
- Chrome grille, bumpers, mirrors, and lower black trim NOT wrapped —
  reads like a real install, not a paint-bucket fill.
- Windows dark/tinted; wrap does not cover glass.
- No manufacturer badges or emblems anywhere (grille is badge-free).

**Known blemish (acceptable, but don't regress further):** a faint ghosted
logo repeat on the hood/front-fender area. The main-panel text and logo are
the non-negotiables; a subtle artifact in a secondary area is the outer edge
of acceptable.

## How to use this folder

- Adding a new reference: drop the PNG here with a short section above —
  what job produced it and why it passes (or, for a known-bad example,
  prefix the filename with `FAIL-` and say what's wrong).
- The vision QA pass (`runQA` in `lib/providers/image/openai.ts`) is the
  machine-checkable subset of this bar: exact text, clean logo, no badges,
  no gibberish. Composition/photorealism judgment still needs a human (or a
  stronger vision pass) — use this image as the comparison anchor.
