# GWS vs STL Fit Viewer (Revision 1)

Browser-based tool for aligning STL geometry to GWS point-cloud data and analyzing radial behavior before and after fit.

This project compares GWS CMM hemisphere data against STL scan data to assess measurement agreement.

## What It Does

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

## Key Revision 1 Behavior

- Refine uses all loaded STL sample points (after active filtering), not an internal refine downsample.
- Proximity filter is applied in fit math and display split.
- Plot units are inches.
- Table and plot reporting include filtered and all-points distinctions.
- Plot X-range can be set dynamically with custom min/max values.

## Run Locally (Windows PowerShell)

From this folder:

```powershell
./serve.ps1
```

Open:

```text
http://localhost:8000/index.html
```

Alternative if needed:

```powershell
python -m http.server 8000
```

## Basic Workflow

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

- `index.html`: UI structure.
- `styles.css`: layout and visual styling.
- `viewer.js`: parsing, UI state, charting, and orchestration.
- `fit-worker.js`: fitting, nearest-neighbor math, and per-point metrics.
- `serve.ps1`: local static server launcher.

## Revision Docs

- `CHANGELOG.md`: change history.
- `REVISION_1.md`: release snapshot and notes.
- `AI_RUNBOOK.md`: AI-agent operational guide for future maintenance.
