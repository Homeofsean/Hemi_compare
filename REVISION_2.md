# Revision 2 Snapshot

Date: 2026-04-06

## Scope

Revision 2 adds a new Diameter Analysis Portal while retaining the Revision 1 fit viewer.

Included in this revision:

- New portal UI: `diameter_portal.html`.
- New portal logic: `diameter-portal.js`.
- New portal styles: `diameter-portal.css`.
- Expanded docs for run and reproducibility workflows.

## Diameter Portal Technical Baseline

- GWS geometry is fit using a 2D circle in XY over all points.
- STL geometry is fit using least-squares sphere center estimation.
- STL data is aligned to analysis axis and supports manual X/Y rotation.
- STL Z-slice analysis uses adaptive half-band expansion when sparse.
- Diameter distributions use opposite-angle paired radii.
- Angle profiles support:
  - unscaled STL comparison
  - scaled STL comparison
  - smoothed comparison with rolling window `F`
- STL radius outliers are filtered by +/-3 sigma before key comparisons.

## Verification

- Static editor validation reports no syntax errors in:
  - `diameter_portal.html`
  - `diameter-portal.css`
  - `diameter-portal.js`
- Existing Revision 1 app files remain present.
- Docs updated to Revision 2 and include Python run environment instructions.

## Notes

- Charts are reported in inches.
- Scale factor is derived from mean diameter ratio (GWS/STL).
- Smoothed panel reports:
  - average offset between smoothed GWS and smoothed unscaled STL
  - scale factor percent relative to unity