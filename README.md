# Wrap Studio

A client-facing, self-serve vehicle wrap design tool. A prospect describes (or
photographs) their vehicle, gets wrap design concepts, spins the design in 3D,
tunes a **budget ↔ coverage** slider with one all-in price, and — when they say
"I want this" — the backend assembles a **layer-editable, Illustrator-openable
vector file** and packages the whole job to Dropbox. Every user is captured as
a **GoHighLevel lead** before they see their first result.

## Run it

```bash
npm install
cp .env.example .env   # fill in keys as you get them — everything works without them
npm run dev            # http://localhost:3000
```

Production: `npm run build && npm start`. Deploys cleanly to **Vercel**
(zero config). Note: image generation and vector packaging run inside API
routes with `maxDuration = 60`; if jobs ever grow past that (huge exports,
slow image APIs), move them to a background worker/queue — the code is already
isolated in `lib/` so only the API routes change.

## Embed in Webflow

Webflow can't host the backend, so the app runs on its own host and embeds.
In Webflow, add an **Embed** element and paste (replace the URL with your
deployed `NEXT_PUBLIC_APP_URL`):

```html
<!-- Option A: iframe (recommended) -->
<iframe
  src="https://YOUR-DEPLOYMENT.vercel.app"
  style="width:100%;min-height:1200px;border:0;border-radius:16px;overflow:hidden"
  title="Design your vehicle wrap"
  loading="lazy"
  allow="clipboard-write"
></iframe>
```

```html
<!-- Option B: script embed (auto-sizing iframe) -->
<div id="wrap-studio"></div>
<script>
  (function () {
    var f = document.createElement("iframe");
    f.src = "https://YOUR-DEPLOYMENT.vercel.app";
    f.style.cssText = "width:100%;min-height:1200px;border:0;border-radius:16px";
    f.title = "Design your vehicle wrap";
    document.getElementById("wrap-studio").appendChild(f);
  })();
</script>
```

The app sends `Content-Security-Policy: frame-ancestors *` so it can be framed
by the Webflow site (tighten to your domain in `next.config.mjs` when live).

## Configuration (`.env`)

Every external dependency degrades gracefully — a missing key **never** breaks
the user flow.

| Variable | What it does | Where to get it | If absent |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Photoreal mockups via `gpt-image-1` (image edit when the user uploads a real vehicle photo; text-to-image otherwise) | platform.openai.com → API keys | Clearly-labeled **design preview placeholder** (the real flat design painted into a vehicle silhouette) |
| `IMAGE_PROVIDER` | Which provider `lib/providers/image/` uses (`openai` \| `placeholder`) | — | defaults to `openai` |
| `GHL_WEBHOOK_URL` | Primary lead path: POST to a GHL **inbound webhook** (Workflows → Inbound Webhook trigger) | GoHighLevel workflow builder | Leads append to `data/leads.local.json` (warning logged) |
| `GHL_API_KEY` + `GHL_LOCATION_ID` | Secondary lead path: GHL API v2 create-contact | GHL → Settings → API | skipped |
| `DROPBOX_ACCESS_TOKEN` | Job packages upload to `/WrapJobs/{date}-{lastname}-{jobid}/` | dropbox.com/developers → App console | Package written to `output/jobs/{...}/` locally |
| `NEXT_PUBLIC_APP_URL` | Used in the embed snippet | your deployment | localhost |

**Pricing** lives in one file: `lib/pricing/constants.ts` — the $/sq-ft rates,
per-class wrappable areas, and coverage tiers are **seed values clearly marked
for replacement with the shop's real rate card.**

## Architecture — one flat design, three outputs

The single source of truth is the **flat, layered vector design**
(`lib/design/model.ts` + `composer.ts`): base film/color, generated graphics,
the user's exact logo, text, and coverage zones. From it:

1. **Photoreal render** (`lib/providers/image/`) — the flat design + brief
   drive AI generation onto the user's photo or a class-appropriate stock
   vehicle. Emotional sell; not production art (AI renders drift).
2. **3D view** (`components/viewer3d/`) — the same flat design becomes a
   texture on a UV-mapped GLB (or a primitive proxy). Placement-accurate
   review with orbit/zoom, five lighting presets, four backgrounds.
3. **Print vector** (`lib/export/illustrator.ts`) — the same real vector
   pieces assembled into a layered SVG that opens directly in Illustrator with
   named layers: `film-base` / `graphics` / `logo` / `text` /
   `coverage-zones` / `cut-guide`. We never auto-trace a render and never
   write the proprietary native `.ai` binary.

### 3D model library — scope honesty

A full year/make/model library is an **ongoing content pipeline, not part of
this build**. What ships is the engine: `models/manifest.json`, a graceful
degradation ladder (library GLB → nearest-class generic → primitive proxy that
always works), and `models/HOW_TO_ADD_A_MODEL.md` so the library can grow a
model or two per day. GLB files go in `public/models/`.

## Hard product rules (enforced in code)

- Supplied branding is used **exactly** — the logo is embedded verbatim, brand
  hex values are locked, named fonts are passed through. Never "improved."
- DOT/USDOT/MC/licensing text renders **only** when the user toggles it on —
  the image prompt explicitly forbids it otherwise.
- Materials offered: printed → **Avery 1105**; color-change → **3M 2080 /
  Avery SW900**; finishes → gloss, matte, satin, window perf. Nothing else.
- The customer sees **one all-in price** — no line items.

## Project docs

- `BUILD_LOG.md` — what was built, in order
- `ASSUMPTIONS.md` — every decision made on the operator's behalf
- `TODO_NEXT.md` — the next session's worklist
- `PRINT_READY_CHECKLIST.md` — prepress stub for the operator to fill
- `models/HOW_TO_ADD_A_MODEL.md` — growing the 3D library

## Smoke-tested paths

- `POST /api/generate` → placeholder provider (no key) returns a labeled SVG mockup ✓
- `POST /api/leads` → local fallback appends to `data/leads.local.json` ✓
- `POST /api/export` → packages `wrap-{job}-EDITABLE.svg` + `job.json` + mockups to `output/jobs/` ✓
- `npm run build` + `npm start` → clean production build, page SSRs ✓
