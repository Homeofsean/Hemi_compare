# AI Runbook

Purpose: Give future coding agents enough context to run, inspect, and maintain this app safely.

## Environment

- Stack: plain HTML/CSS/JS with a Web Worker.
- Entry point: `index.html`.
- Main logic: `viewer.js`.
- Fit math worker: `fit-worker.js`.
- Local server script: `serve.ps1`.

## Start App

```powershell
./serve.ps1
```

Open: `http://localhost:8000/index.html`

## Core Data Flow

1. User loads GWS and STL files.
2. `viewer.js` parses and samples points.
3. `runFit(stage)` posts data to `fit-worker.js`.
4. Worker returns transformed STL points, errors, and nearest distances.
5. Viewer splits STL into included/excluded subsets using ROI/proximity filters.
6. Viewer updates point clouds, table, and charts.

## Critical Logic Rules

- Proximity filter is nearest STL-to-GWS distance threshold.
- Refine uses active filters in optimization objective.
- Chart units must remain inches.
- Keep table semantics aligned with chart semantics (filtered vs all-point values).

## Safe Change Checklist

- If editing filters, verify both:
  - fit math in `fit-worker.js`
  - display split in `viewer.js`
- If editing table metrics, verify matching chart metric definitions.
- Re-check no editor errors after edits.
- Preserve existing IDs in `index.html` unless also updating `viewer.js` references.

## Quick Smoke Test

1. Load sample GWS + STL.
2. Run coarse fit, then refine fit.
3. Toggle ROI and proximity filter.
4. Confirm table and charts update and remain in inches.
5. Confirm custom X-range apply/reset works for both charts.
