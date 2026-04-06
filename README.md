# GWS + STL Analysis Suite (Revision 2)

Browser-based analysis suite for GWS and STL metrology workflows.

Revision 2 includes two tools in the same repository:

- `index.html`: GWS vs STL Fit Viewer (legacy alignment workflow).
- `diameter_portal.html`: Diameter Analysis Portal (new diameter/radius-by-angle workflow).

## What It Does

### Diameter Analysis Portal (`diameter_portal.html`)

- Loads `.gws` and `.stl` files.
- Performs GWS 2D circle fit on XY projection (Z ignored for GWS fit).
- Performs STL sphere fit, axis alignment, and optional manual X/Y rotation.
- Computes STL slice metrics at selected Z center and half-band.
- Uses adaptive half-band expansion if a thin slice has insufficient points.
- Derives diameters by opposite-angle paired radii (not naive `2*r`).
- Produces angle-vs-radius panels (unscaled, scaled, and smoothed overlays).
- Produces histogram panels for GWS/STL radii and diameters.
- Filters STL slice radii using +/-3 sigma before key comparisons.
- Shows cursor readouts, legends, and detailed stats text blocks.

### GWS vs STL Fit Viewer (`index.html`)

- Loads `.gws` and `.stl` files.
- Runs coarse and refine alignment of STL to GWS.
- Supports independent XYZ scaling or uniform XYZ scaling.
- Supports ROI filtering and proximity filtering in refine optimization.
- Colors STL points by radial deviation.
- Shows included/excluded STL subsets with toggles.
- Reports radius analysis in table form.
- Renders two histogram panels:
	- Scaled filtered radial distribution.
	- Raw radial distribution (GWS raw vs STL raw selected).

## Key Revision 2 Behavior

### Diameter portal behavior

- GWS fit is always 2D circle in XY across all loaded GWS points.
- STL diameter distributions are slice-based and use opposite-angle pair logic.
- Angle profiles can be aligned by circular shift (minimum RMSE).
- Smoothed panel applies circular rolling average controlled by `F`.
- Smoothed stats include:
	- average offset: smoothed GWS minus smoothed unscaled STL
	- scale factor percent: `(scaleFactor - 1) * 100`
- Scaled panels include explicit scale values in the plot stats text.

### Legacy fit viewer behavior

- Refine uses all loaded STL sample points (after active filtering), not an internal refine downsample.
- Proximity filter is applied in fit math and display split.
- Plot units are inches.
- Table and plot reporting include filtered and all-points distinctions.
- Plot X-range can be set dynamically with custom min/max values.

## Python Environment Requirements

The app is static HTML/CSS/JS and has no Python package dependencies.

- Required: Python 3.10+ (or any Python version that supports `http.server`).
- Required module: standard library only (`http.server`).
- No `pip install` required.

Optional virtual environment setup:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python --version
```

## Run Locally (Windows PowerShell)

From this folder:

```powershell
./serve.ps1
```

Open:

```text
http://localhost:8000/index.html
```

For the diameter workflow, open:

```text
http://localhost:8000/diameter_portal.html
```

Alternative if needed:

```powershell
python -m http.server 8000
```

## Basic Workflow: Diameter Portal

1. Start local server.
2. Open `diameter_portal.html`.
3. Load GWS and STL files.
4. Confirm source units.
5. Set `STL Sample Points` and click `Run Diameter Analysis`.
6. Adjust `Z Slice Center` and `Z Half-Band` to inspect slices.
7. Optionally apply manual rotation and center refinement range.
8. Adjust smoothing window `F` and inspect smoothed stats.
9. Read summary and chart stats for scale factor, offsets, means, medians, and sigma ranges.

## Basic Workflow: Legacy Fit Viewer

1. Load GWS file.
2. Load STL file.
3. Set units for each source.
4. Run Coarse Fit.
5. Run Refine Fit.
6. Optionally enable ROI and/or proximity filter, then recalculate refine.
7. Review:
	 - Fit Summary
	 - Radius Analysis table
	 - Scaled and raw radial distribution charts

## Files

- `diameter_portal.html`: Diameter Analysis Portal UI.
- `diameter-portal.css`: Diameter portal styles.
- `diameter-portal.js`: Diameter portal analysis and chart logic.
- `index.html`: Legacy fit viewer UI.
- `styles.css`: Legacy fit viewer styles.
- `viewer.js`: Legacy fit viewer orchestration and charting.
- `fit-worker.js`: Legacy fit math worker.
- `serve.ps1`: local static server launcher.

## Revision Docs

- `CHANGELOG.md`: change history.
- `REVISION_1.md`: Revision 1 snapshot.
- `REVISION_2.md`: Revision 2 snapshot.
- `AI_RUNBOOK.md`: operational runbook for maintenance.
- `AI_GUIDE.md`: detailed reproducibility guide for future AI tools.
