# Revision 1 Snapshot

Date: 2026-04-03

## Scope

This revision captures a stable, documented baseline of the GWS vs STL fit viewer with:

- Coarse and refine fit pipeline.
- ROI and proximity filtering integrated into refine optimization.
- Independent and uniform scaling modes.
- Radius analysis table with before/after metrics.
- Dual radial-distribution charts and interactive chart controls.

## Verification

- App loads via local HTTP server.
- No static editor errors in `index.html`, `styles.css`, `viewer.js`, `fit-worker.js`.
- Chart and table outputs are generated after fit.

## Notes

- All charted radial values are displayed in inches.
- Proximity filtering uses nearest-point distance to GWS, not distance to STL center.
- Refine quality depends on STL sample count and active filters.
