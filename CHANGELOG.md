# Changelog

## Revision 3 - 2026-04-07

### Added
- Diameter portal manual scale-factor override input with live recalculation of scaled plots and scaled reported values.
- Diameter portal read-only optimized scale-factor display beside the manual input.
- Strict diameter-portal optimization with fractional-bin angular refinement and joint least-squares scale fitting.
- Revision 3 snapshot document.

### Changed
- Diameter-portal optimization now smooths profiles before rotation and scale fitting.
- Diameter-portal smoothing is now asymmetric by dataset:
	- GWS profile uses circular rolling average.
	- STL profile uses circular rolling maximum.
- Diameter-portal smoothing window `F` now recomputes optimization instead of updating a display-only panel.
- Scaled diameter-portal outputs are now defined by the manual scale factor, while the optimized factor remains visible for reference.
- Summary/stat text now distinguishes manual scale, optimized scale, and reference mean-diameter scale.

### Fixed
- Removed dependence on mean-diameter-only scaling for the primary diameter optimization path.
- Reduced angular quantization error by allowing sub-bin angular refinement during strict fit.

## Revision 2 - 2026-04-06

### Added
- New `diameter_portal.html` workflow for GWS vs STL diameter analysis.
- `diameter-portal.js` with:
	- GWS XY-only circle fit.
	- STL sphere fit and alignment.
	- STL slice analysis with adaptive half-band expansion.
	- Opposite-angle paired-radii diameter derivation.
	- Angle-vs-radius profiles (unscaled, scaled, smoothed).
	- Circular shift profile alignment via RMSE minimization.
	- Circular rolling-average smoothing with live `F` control.
	- STL radius +/-3 sigma filtering.
	- Chart cursor readouts and richer stats text.
- `diameter-portal.css` and portal-specific chart cursor UI styling.
- Revision 2 release docs and AI reproducibility guide.

### Changed
- Repository docs now describe both apps: legacy fit viewer and diameter portal.
- Version references updated from Revision 1 to Revision 2.
- Run instructions now include direct launch URL for `diameter_portal.html`.

### Fixed
- Resolved y-axis labeling bug that previously caused blank/failed plot rendering.
- Resolved narrow-slice failure mode by auto-expanding STL half-band when needed.
- Added smoothed-plot metrics for average offset and scale factor percent.

## Revision 1 - 2026-04-03

### Added
- Proximity filter controls and recalc flow for refine fit.
- Separate proximity-excluded point-cloud visualization toggle.
- Scaled filtered radial distribution chart.
- Raw radial distribution chart (GWS raw vs STL raw selected).
- Cursor X-value readout for both charts.
- Dynamic chart X-axis range override (min/max) with reset-to-auto.
- Mean radius reporting enhancements in Radius Analysis table.
- STL sample-count apply button for re-sampling without reloading app.

### Changed
- Refine optimization now evaluates all loaded STL sample points (with active filters).
- Radius Analysis table now distinguishes filtered-vs-all after-fit mean context.
- Chart and report unit handling normalized to inches.
- Layout changed to improve full-page scrolling and chart visibility.

### Fixed
- ROI/proximity interactions now consistently update display and chart outputs.
- Resolved plot-scale and unit-mismatch issues in raw distribution panel.
