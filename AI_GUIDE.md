# AI Guide: Reproducible GWS/STL Plot Generation (Revision 2)

## Purpose

This document is for future AI tools that need to run this repository and reproduce outputs for all supported workflows.

It includes:

- exact runtime setup
- Python environment requirements
- app entry points
- expected analysis behavior across both apps
- deterministic reproduction checklist

## Repository Summary

Two browser apps are present.

- Legacy fit viewer: `index.html`
- Diameter Analysis Portal (target for current plot set): `diameter_portal.html`

## Full Capability Map

### App 1: Legacy GWS vs STL Fit Viewer

Entry and components:

- UI: `index.html`
- Controller/renderer: `viewer.js`
- Worker math engine: `fit-worker.js`
- Styles: `styles.css`

Primary capabilities:

- coarse fit and refine fit stages
- independent XYZ or uniform scaling modes
- ROI filtering for refine optimization
- proximity filtering for refine optimization
- point-cloud visibility toggles (included/excluded/proximity-excluded)
- radius analysis table with before/after and filtered/all distinctions
- scaled filtered histogram
- raw distribution histogram
- custom plot X-range overrides

### App 2: Diameter Analysis Portal

Entry and components:

- UI: `diameter_portal.html`
- Controller/analysis: `diameter-portal.js`
- Styles: `diameter-portal.css`

Primary capabilities:

- GWS XY circle fit and STL sphere-fit-based slice analysis
- opposite-angle paired-radii diameter derivation
- unscaled/scaled/smoothed angle-vs-radius analysis
- adaptive slice half-band expansion fallback
- +/-3 sigma STL slice radius filtering
- histogram overlays and interactive chart cursor readouts

Shared graphics/runtime files:

- `three.module.js`
- `OrbitControls.js`

Primary files for the diameter workflow:

- `diameter_portal.html`
- `diameter-portal.css`
- `diameter-portal.js`

Primary files for the legacy workflow:

- `index.html`
- `viewer.js`
- `fit-worker.js`
- `styles.css`

## Python Environment Requirements

This repo does not require third-party Python packages.

- Python: 3.10+ recommended.
- Required module: standard library `http.server`.
- No `pip install` commands are required.

Optional virtual environment initialization:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python --version
```

Verification command:

```powershell
python -c "import http.server; print('ok')"
```

Expected output: `ok`

## How to Run

From repo root:

```powershell
./serve.ps1
```

Alternative:

```powershell
python -m http.server 8000
```

Open the diameter app:

`http://localhost:8000/diameter_portal.html`

Open the legacy fit viewer:

`http://localhost:8000/index.html`

## Reproduction Procedure: Diameter Portal Plot Family

Use this sequence to regenerate the same analysis outputs and chart types:

1. Launch local server.
2. Open `diameter_portal.html`.
3. Load one GWS file and one STL file.
4. Set source units correctly for each file.
5. Keep sample count at `60000` unless intentionally testing sensitivity.
6. Set `Z Slice Center` and `Z Half-Band`.
7. Click `Run Diameter Analysis`.
8. Confirm all expected panels are populated.
9. Change smoothing `F` and verify smoothed panel updates live.

If selected slice is too thin and has too few points, the app auto-expands the half-band until sufficient data exists. This is expected behavior in Revision 2.

## Reproduction Procedure: Legacy Fit Viewer Plot Family

1. Launch local server.
2. Open `index.html`.
3. Load one GWS file and one STL file.
4. Set source units correctly.
5. Click `Run Coarse Fit`, then `Refine Fit`.
6. Optionally enable ROI and proximity filtering and recalc refine.
7. Confirm both legacy plot panels render:
	- Scaled Filtered Radial Distribution
	- Raw Radial Distribution
8. Confirm Radius Analysis table populates before/after metrics.

## Expected Output Panels (Diameter Portal)

The following chart categories should render after successful run:

1. Smoothed radius vs angle (GWS + STL unscaled + STL scaled).
2. Radius vs angle (GWS vs scaled STL).
3. GWS radius histogram.
4. GWS diameter histogram.
5. STL radius histogram.
6. STL diameter histogram.
7. GWS/STL radius overlay histogram.
8. GWS/STL diameter overlay histogram.
9. Radius vs angle (GWS vs unscaled STL).
10. Scaled STL diameter vs GWS diameter histogram.

## Statistical Outputs That Must Be Present

The smoothed stats text must include:

- rolling average window (`F`)
- angular shift applied to GWS profile
- fit RMSE and overlap bins
- scale values (GWS, STL unscaled, STL scaled)
- scale factor percent (`(scaleFactor - 1) * 100`)
- average offset (`GWS - Unscaled STL`) across overlapping smoothed bins
- mean and +/-3 sigma values for plotted profiles

## Core Algorithm Contracts

Future AI modifications must preserve these contracts unless intentionally changing methodology:

1. GWS fit is 2D circle in XY (`fitCircle2D`), not full 3D sphere.
2. STL center is from sphere least-squares fit (`fitSphereLeastSquares`).
3. Diameter distribution uses opposite-angle paired radii (`buildOppositePairDiameters`).
4. Angle-profile alignment uses circular shift minimizing RMSE (`alignAngleProfiles`).
5. Smoothed profile uses circular rolling average with wraparound (`rollingAverageCircular`).
6. STL outlier filtering uses +/-3 sigma on slice radii (`filterBySigma`).
7. Units shown in chart and summary outputs are inches.

## Determinism Notes

- STL sampling uses stride based on triangle count and requested sample count.
- Given same files and same UI parameters, output should be stable across runs.
- Tiny numeric differences can occur across browsers due to floating-point behavior, but curve shape and reported order of magnitude should match.

## Troubleshooting

If charts are blank:

1. Confirm both files were loaded.
2. Confirm the browser opened `diameter_portal.html` (not `index.html`).
3. Widen `Z Half-Band` or adjust `Z Slice Center`.
4. Check unit selectors.
5. Refresh page and rerun.

If scale metrics look wrong:

1. Confirm STL and GWS unit selectors are correct.
2. Confirm STL file corresponds to the selected GWS dataset.
3. Verify the slice contains representative points (not edge/noise-only).

If legacy fit viewer tables/charts do not update:

1. Confirm you ran `Run Coarse Fit` and then `Refine Fit`.
2. Confirm worker file `fit-worker.js` is served (browser dev tools network check).
3. Temporarily disable ROI/proximity filters and rerun refine.
4. Reset plot range to auto if custom X-range was applied.

## Revision and Release Mapping

- Revision 1 docs: `REVISION_1.md`
- Revision 2 docs: `REVISION_2.md`
- History: `CHANGELOG.md`

For release tagging and pushing, use `GITHUB_UPLOAD.md`.