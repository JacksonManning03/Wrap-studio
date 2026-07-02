# PRINT-READY CHECKLIST — stub for the operator to complete

The current vector export is clean, layer-editable artwork (named layers,
exact logo, cut-guide outline). True production readiness needs the shop's
real prepress specs. Fill these in and we'll encode them as export config
(`lib/export/illustrator.ts` → EXPORT_DEFAULTS):

- [ ] Bleed: ______ in per edge
- [ ] Contour/cut line spot color + naming convention: ______
- [ ] Color: CMYK profile ______ / Pantone matching workflow ______
- [ ] Panel tiling: max panel width ______ , overlap ______
- [ ] Output resolution / raster-effects DPI: ______
- [ ] Scale convention (1:1 vs 1:10): ______
- [ ] Material print profiles (Avery 1105 / 3M 2080 / SW900): ______
- [ ] Wrap template source per vehicle (e.g. ProVehicleOutlines) + licensing: ______
- [ ] File handoff format preference (.ai via Illustrator save-as from the SVG, PDF/X-4, EPS): ______
