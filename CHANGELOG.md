# Changelog

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
