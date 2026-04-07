# Revision 3 Snapshot

Date: 2026-04-07

Revision 3 advances the diameter analysis workflow from a display-oriented smoothing/alignment sequence to an optimization-oriented sequence with explicit user control over final scaling.

## Included Capabilities

- Legacy GWS vs STL Fit Viewer remains available at `index.html`.
- Diameter Analysis Portal remains available at `diameter_portal.html`.
- Diameter portal now smooths before main optimization.
- Diameter portal now uses asymmetric smoothing by dataset:
  - GWS: rolling average over circular window `F`.
  - STL: rolling maximum over circular window `F`.
- Diameter portal now performs strict optimization with:
  - fractional angular-bin refinement
  - least-squares scale optimization after rotational alignment
- Diameter portal now exposes:
  - manual scale factor input
  - optimized scale factor display
- Scaled diameter plots and scaled result summaries are now defined by the manual scale factor.

## Practical Meaning of Revision 3

- Rotation is no longer solved on unsmoothed or post-scaled-only display profiles.
- Scale is no longer driven only by mean-diameter ratio for the main path.
- The optimized scale remains visible even when the user chooses to override it manually.
- Smoothing window changes now influence optimization directly.

## Key Files

- `diameter_portal.html`
- `diameter-portal.js`
- `diameter-portal.css`
- `README.md`
- `CHANGELOG.md`
- `AI_GUIDE.md`
- `AI_RUNBOOK.md`
- `GITHUB_UPLOAD.md`

## Compatibility Notes

- Legacy fit viewer workflow remains backward compatible.
- Diameter portal output values may differ from Revision 2 because optimization order and smoothing methodology changed intentionally.
