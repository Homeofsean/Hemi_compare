# Changelog

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
