# How to add a 3D vehicle model

The 3D viewer loads GLB models from a manifest and degrades gracefully:

1. **Exact/library model** — a GLB listed in `models/manifest.json`
2. **Nearest-class generic model** — any GLB for the same class
3. **Primitive proxy** — a boxy stand-in built from primitives (always works)

The viewer logs which tier it used and shows it as a badge in the corner of
the 3D view. The full year/make/model library is an ongoing content pipeline —
add a model or two per day and coverage grows.

## Steps

1. **Get a GLB.** Export from Blender (`File > Export > glTF 2.0`, format
   *glTF Binary (.glb)*). Good free sources: Sketchfab (check license),
   Poly Haven, or commission low-poly wrap blanks.
2. **Prepare it for wrapping:**
   - Face the vehicle down the **X axis**, wheels on the ground plane (Y up).
   - Real-world scale ≈ 4–5 units long for a sedan (or set `scale` in the manifest).
   - Name the wrappable body meshes so they contain `body` (e.g. `body_panels`,
     `Body_L`, `box_body`). Windows/wheels/trim should NOT contain that string.
   - **UV-unwrap the body** as one flat layout: driver side on the left half of
     UV space, passenger side on the right (the flat design is a 2:1 panel).
     The closer the UVs match the shop's wrap template for that vehicle, the
     more placement-accurate the preview.
   - Keep it light: < 5 MB, < 100k triangles.
3. **Drop the file** in `public/models/`, e.g. `public/models/sedan-generic.glb`.
4. **Register it** in `models/manifest.json`:

```json
{ "class": "sedan", "file": "/models/sedan-generic.glb", "wrapMeshes": ["body"], "scale": 1 }
```

5. Reload the app. If the GLB fails to load or parse, the viewer automatically
   drops to the proxy tier — it never breaks the page.

## Manifest fields

| field        | meaning                                                        |
| ------------ | -------------------------------------------------------------- |
| `class`      | one of the vehicle classes in `lib/pricing/constants.ts`        |
| `file`       | public URL path to the GLB, or `null` for "no model yet"        |
| `wrapMeshes` | substrings matched against mesh names; matches get the wrap     |
| `scale`      | uniform scale multiplier applied after load                     |
