# AI Runbook

Purpose: Give future coding agents enough context to run, inspect, and maintain this repository safely.

## Repository Mode

This repo now contains two browser apps:

- Revision 1 app: `index.html` (fit viewer).
- Revision 2 app: `diameter_portal.html` (diameter analysis portal).

Do not remove Revision 1 assets when working on Revision 2 unless explicitly requested.

## Documentation Coverage Matrix

Use this matrix to ensure docs remain complete for full repository capability.

- `README.md`: user-facing overview of both apps and run steps.
- `AI_GUIDE.md`: deep reproducibility instructions for both chart families.
- `AI_RUNBOOK.md`: maintenance contracts, architecture, and smoke tests.
- `CHANGELOG.md`: revision history and behavior changes.
- `REVISION_1.md`: locked snapshot for Revision 1 baseline.
- `REVISION_2.md`: locked snapshot for Revision 2 baseline.
- `GITHUB_UPLOAD.md`: commit/tag/push and release publication workflow.

If a capability is added, update at least `README.md`, `AI_GUIDE.md`, and `CHANGELOG.md` in the same revision.

## Environment and Runtime Requirements

- Runtime stack: plain HTML/CSS/JS.
- 3D library: Three.js module files committed in repo (`three.module.js`, `OrbitControls.js`).
- Python requirement: Python 3.10+ recommended (standard library only).
- Required Python module: `http.server` (builtin).
- No third-party Python packages required.

Optional venv bootstrap:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python --version
```

## Start Local Server

Preferred:

```powershell
./serve.ps1
```

Alternative:

```powershell
python -m http.server 8000
```

App URLs:

- Fit viewer: `http://localhost:8000/index.html`
- Diameter portal: `http://localhost:8000/diameter_portal.html`

## Architecture Map

### Revision 2 Diameter Portal

- UI: `diameter_portal.html`
- Styles: `diameter-portal.css`
- Logic: `diameter-portal.js`

Pipeline summary:

1. Parse GWS `#12` rows into point list.
2. Parse binary STL and sample triangle centroids.
3. Convert source units to inches.
4. Fit GWS XY circle (`fitCircle2D`).
5. Fit STL sphere (`fitSphereLeastSquares`).
6. Align STL hemisphere axis to +Z (`alignStl`), then apply optional manual X/Y rotation.
7. Compute STL slice near target Z (`computeSliceAdaptive`) with fallback half-band expansion.
8. Build radii and opposite-angle diameters (`buildOppositePairDiameters`).
9. Build angle profiles (`buildAngleRadiusProfile`), align by circular shift (`alignAngleProfiles`).
10. Build scaled and smoothed variants (`scaleAngleProfile`, `smoothAngleProfile`).
11. Render charts and stats text.

### Revision 1 Fit Viewer

- UI: `index.html`
- Styles: `styles.css`
- Main logic: `viewer.js`
- Fit worker: `fit-worker.js`

## Critical Behavior Contracts

### Diameter Portal

- GWS fit must remain XY-only (Z ignored for circle fit).
- STL diameters must remain opposite-angle paired radii, not direct `2*r` from arbitrary single bins.
- Angle-profile alignment must preserve circular shift minimization by RMSE.
- Smoothed plot must preserve circular wraparound smoothing behavior.
- Units displayed in charts/stats are inches.
- STL radius +/-3 sigma filter must apply before designated comparisons.

### Fit Viewer

- Proximity filter remains nearest STL-to-GWS distance threshold.
- Refine stage uses active filters in optimization objective.
- Chart/table semantics remain consistent for filtered vs all-point values.

## Change Safety Checklist

1. Keep HTML element IDs in sync with JS references.
2. If changing math helpers, validate downstream chart labels and summary text.
3. If changing slice behavior, verify both normal and sparse slice cases.
4. If changing smoothing/alignment, verify overlay curves still align sensibly.
5. Validate no static editor errors after edits.

## Smoke Test: Diameter Portal

1. Open `diameter_portal.html`.
2. Load one GWS and one STL file.
3. Run analysis.
4. Confirm populated outputs:
  - summary block
  - histogram panels
  - angle-vs-radius (unscaled, scaled, smoothed)
5. Set narrow Z half-band and verify analysis still runs (adaptive expansion fallback).
6. Change smoothing `F` and verify smoothed chart and text update.
7. Verify smoothed stats include:
  - average offset (`GWS - Unscaled STL`)
  - scale factor percent.

## Smoke Test: Fit Viewer

1. Open `index.html`.
2. Load sample GWS + STL.
3. Run coarse then refine.
4. Toggle ROI and proximity options.
5. Confirm table/charts update and remain in inches.

