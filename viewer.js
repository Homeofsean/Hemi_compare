import * as THREE from "three";
import { OrbitControls } from "./OrbitControls.js";

const ui = {
  gwsInput: document.getElementById("gwsInput"),
  stlInput: document.getElementById("stlInput"),
  gwsUnit: document.getElementById("gwsUnit"),
  stlUnit: document.getElementById("stlUnit"),
  useRefineRoi: document.getElementById("useRefineRoi"),
  roiXMin: document.getElementById("roiXMin"),
  roiXMax: document.getElementById("roiXMax"),
  roiYMin: document.getElementById("roiYMin"),
  roiYMax: document.getElementById("roiYMax"),
  roiZMin: document.getElementById("roiZMin"),
  roiZMax: document.getElementById("roiZMax"),
  fitBtn: document.getElementById("fitBtn"),
  refineBtn: document.getElementById("refineBtn"),
  recalcRoiBtn: document.getElementById("recalcRoiBtn"),
  recalcProxBtn: document.getElementById("recalcProxBtn"),
  scalingModeBtn: document.getElementById("scalingModeBtn"),
  toggleIncludedBtn: document.getElementById("toggleIncludedBtn"),
  toggleExcludedBtn: document.getElementById("toggleExcludedBtn"),
  toggleProxExcludedBtn: document.getElementById("toggleProxExcludedBtn"),
  resetViewBtn: document.getElementById("resetViewBtn"),
  applySampleCountBtn: document.getElementById("applySampleCountBtn"),
  sampleCount: document.getElementById("sampleCount"),
  errorCap: document.getElementById("errorCap"),
  summary: document.getElementById("summary"),
  sizeSummary: document.getElementById("sizeSummary"),
  legend0: document.getElementById("legend0"),
  legend25: document.getElementById("legend25"),
  legend50: document.getElementById("legend50"),
  legend75: document.getElementById("legend75"),
  legend100: document.getElementById("legend100"),
  hoverReadout: document.getElementById("hoverReadout"),
  radiusTable: document.getElementById("radiusTable"),
  usePlotRange: document.getElementById("usePlotRange"),
  plotXMin: document.getElementById("plotXMin"),
  plotXMax: document.getElementById("plotXMax"),
  applyPlotRangeBtn: document.getElementById("applyPlotRangeBtn"),
  resetPlotRangeBtn: document.getElementById("resetPlotRangeBtn"),
  histCanvas: document.getElementById("histCanvas"),
  histStats: document.getElementById("histStats"),
  scaledPlotCursor: document.getElementById("scaledPlotCursor"),
  rawHistCanvas: document.getElementById("rawHistCanvas"),
  rawHistStats: document.getElementById("rawHistStats"),
  rawPlotCursor: document.getElementById("rawPlotCursor"),
  status: document.getElementById("status"),
  showMaster: document.getElementById("showMaster"),
  showStl: document.getElementById("showStl"),
  useProxFilter: document.getElementById("useProxFilter"),
  proxThreshold: document.getElementById("proxThreshold"),
};

const state = {
  gws: null,
  stl: null,
  fitted: null,
  masterPointsObj: null,
  stlPointsObj: null,
  excludedPointsObj: null,
  fitWorker: null,
  lastFitStage: null,
  gwsRawPoints: null,
  stlRawPoints: null,
  stlRawTriCount: 0,
  axisLabelGroup: null,
  hoverNdc: new THREE.Vector2(2, 2),
  raycaster: new THREE.Raycaster(),
  hoverClient: { x: 16, y: 16 },
  showExcludedPoints: false,
  showProxExcludedPoints: false,
  lastTransformedStlPoints: null,
  lastStlErrors: null,
  lastPointDistances: null,
  lastRadialReference: null,
  plotRanges: {
    scaled: null,
    raw: null,
  },
  proxExcludedPointsObj: null,
  useUniformScaling: false,
};

const canvas = document.getElementById("viewer");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

function resizeToContainer() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) return false;
  const needsResize = canvas.width !== width || canvas.height !== height;
  if (needsResize) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  return needsResize;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4ecdf);

const camera = new THREE.PerspectiveCamera(55, 1, 0.001, 10000);
camera.position.set(2.4, 2.2, 2.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(2, 4, 1);
scene.add(dirLight);

const grid = new THREE.GridHelper(4, 20, 0x8c7f6d, 0xb8a98f);
grid.position.y = -0.001;
scene.add(grid);

const axes = new THREE.AxesHelper(0.4);
scene.add(axes);

function makeAxisLabel(text, colorHex) {
  const canvas2d = document.createElement("canvas");
  canvas2d.width = 128;
  canvas2d.height = 64;
  const ctx = canvas2d.getContext("2d");
  ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillRect(2, 2, canvas2d.width - 4, canvas2d.height - 4);
  ctx.strokeStyle = "#222";
  ctx.strokeRect(2, 2, canvas2d.width - 4, canvas2d.height - 4);
  ctx.font = "bold 44px Segoe UI";
  ctx.fillStyle = colorHex;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas2d.width / 2, canvas2d.height / 2);

  const texture = new THREE.CanvasTexture(canvas2d);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.14, 0.07, 1);
  return sprite;
}

function buildAxisLabels() {
  if (state.axisLabelGroup) {
    scene.remove(state.axisLabelGroup);
  }
  const group = new THREE.Group();
  const xLabel = makeAxisLabel("X", "#e03e2f");
  const yLabel = makeAxisLabel("Y", "#2e9f47");
  const zLabel = makeAxisLabel("Z", "#1f66db");
  xLabel.position.set(0.46, 0, 0);
  yLabel.position.set(0, 0.46, 0);
  zLabel.position.set(0, 0, 0.46);
  group.add(xLabel);
  group.add(yLabel);
  group.add(zLabel);
  scene.add(group);
  state.axisLabelGroup = group;
}

buildAxisLabels();

function setStatus(text) {
  ui.status.textContent = text;
}

function setSummary(text) {
  ui.summary.textContent = text;
}

function updateLegendValues() {
  const cap = Math.max(1e-6, Number(ui.errorCap.value) || 0.05);
  ui.legend0.textContent = (0).toFixed(3);
  ui.legend25.textContent = (cap * 0.25).toFixed(3);
  ui.legend50.textContent = (cap * 0.5).toFixed(3);
  ui.legend75.textContent = (cap * 0.75).toFixed(3);
  ui.legend100.textContent = `${cap.toFixed(3)}+`;
}

function setHoverReadout(text) {
  ui.hoverReadout.textContent = text;
}

function updateScalingModeButton() {
  ui.scalingModeBtn.textContent = state.useUniformScaling ? "Scaling: Uniform XYZ" : "Scaling: Independent XYZ";
}

function setHistogramPlaceholder(message, canvasEl = ui.histCanvas) {
  const ctx = canvasEl.getContext("2d");
  const width = canvasEl.clientWidth || canvasEl.width;
  const height = Math.max(180, Math.round(width * 0.64));
  canvasEl.width = width;
  canvasEl.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffdf7";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d4c5b0";
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.fillStyle = "#6c5b49";
  ctx.font = "17px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, width / 2, height / 2);
}

function radialDistances(points, center) {
  const out = new Float32Array(points.length / 3);
  for (let i = 0; i < points.length; i += 3) {
    const dx = points[i] - center.x;
    const dy = points[i + 1] - center.y;
    const dz = points[i + 2] - center.z;
    out[i / 3] = Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return out;
}

function meanRadius(points, center) {
  if (!points || points.length < 3 || !center) return NaN;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < points.length; i += 3) {
    const dx = points[i] - center.x;
    const dy = points[i + 1] - center.y;
    const dz = points[i + 2] - center.z;
    sum += Math.sqrt(dx * dx + dy * dy + dz * dz);
    count += 1;
  }
  return count ? sum / count : NaN;
}

function pointsByIndices(points, indices) {
  const out = new Float32Array(indices.length * 3);
  let o = 0;
  for (let i = 0; i < indices.length; i += 1) {
    const j = indices[i] * 3;
    out[o] = points[j];
    out[o + 1] = points[j + 1];
    out[o + 2] = points[j + 2];
    o += 3;
  }
  return out;
}

function meanStd(values) {
  const n = values.length;
  if (!n) return { mean: NaN, sigma: NaN };
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += values[i];
  const mean = sum / n;
  let varSum = 0;
  for (let i = 0; i < n; i += 1) {
    const d = values[i] - mean;
    varSum += d * d;
  }
  return { mean, sigma: Math.sqrt(varSum / Math.max(1, n - 1)) };
}

function histogramProb(values, minV, maxV, binCount) {
  const bins = new Float32Array(binCount);
  if (values.length === 0) return bins;
  const range = Math.max(1e-9, maxV - minV);
  let inRangeCount = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] < minV || values[i] > maxV) continue;
    const t = (values[i] - minV) / range;
    const idx = Math.max(0, Math.min(binCount - 1, Math.floor(t * binCount)));
    bins[idx] += 1;
    inRangeCount += 1;
  }
  if (inRangeCount === 0) return bins;
  for (let i = 0; i < binCount; i += 1) {
    bins[i] /= inRangeCount;
  }
  return bins;
}

function drawVerticalLine(ctx, x, top, bottom, color, dash) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  ctx.restore();
}

function medianInRange(values, minV, maxV) {
  const filtered = [];
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (v >= minV && v <= maxV) filtered.push(v);
  }
  if (filtered.length === 0) return NaN;
  filtered.sort((a, b) => a - b);
  const mid = Math.floor(filtered.length / 2);
  if (filtered.length % 2 === 0) {
    return (filtered[mid - 1] + filtered[mid]) * 0.5;
  }
  return filtered[mid];
}

function modeFromHistogram(histBins, minV, maxV) {
  if (!histBins || histBins.length === 0) return NaN;
  let bestIdx = 0;
  let bestVal = histBins[0];
  for (let i = 1; i < histBins.length; i += 1) {
    if (histBins[i] > bestVal) {
      bestVal = histBins[i];
      bestIdx = i;
    }
  }
  const binW = (maxV - minV) / histBins.length;
  return minV + (bestIdx + 0.5) * binW;
}

function drawLabeledStatLine(ctx, x, top, bottom, color, dash, label, labelY) {
  drawVerticalLine(ctx, x, top, bottom, color, dash);
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = "14px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(label, x, labelY);
  ctx.restore();
}

function renderDualHistogram(canvasEl, statsEl, seriesA, seriesB, emptyMessage, rangeKey, xRangeOverride) {
  if (!seriesA || !seriesB || !seriesA.values?.length || !seriesB.values?.length) {
    setHistogramPlaceholder(emptyMessage, canvasEl);
    statsEl.textContent = emptyMessage;
    if (rangeKey) state.plotRanges[rangeKey] = null;
    return;
  }

  let minV = Infinity;
  let maxV = -Infinity;
  for (let i = 0; i < seriesA.values.length; i += 1) {
    if (seriesA.values[i] < minV) minV = seriesA.values[i];
    if (seriesA.values[i] > maxV) maxV = seriesA.values[i];
  }
  for (let i = 0; i < seriesB.values.length; i += 1) {
    if (seriesB.values[i] < minV) minV = seriesB.values[i];
    if (seriesB.values[i] > maxV) maxV = seriesB.values[i];
  }

  if (xRangeOverride) {
    minV = xRangeOverride.min;
    maxV = xRangeOverride.max;
  } else {
    const sigmaA = Number.isFinite(seriesA.stats?.sigma) ? seriesA.stats.sigma : 0;
    const sigmaB = Number.isFinite(seriesB.stats?.sigma) ? seriesB.stats.sigma : 0;
    const sigmaPad = 2 * Math.max(sigmaA, sigmaB, 1e-6);
    minV -= sigmaPad;
    maxV += sigmaPad;
  }

  if (!Number.isFinite(minV) || !Number.isFinite(maxV) || maxV <= minV) {
    setHistogramPlaceholder("Histogram range invalid.", canvasEl);
    statsEl.textContent = "Histogram range invalid.";
    if (rangeKey) state.plotRanges[rangeKey] = null;
    return;
  }

  const bins = 40;
  const aHist = histogramProb(seriesA.values, minV, maxV, bins);
  const bHist = histogramProb(seriesB.values, minV, maxV, bins);
  const aMedian = medianInRange(seriesA.values, minV, maxV);
  const bMedian = medianInRange(seriesB.values, minV, maxV);
  const aMode = modeFromHistogram(aHist, minV, maxV);
  const bMode = modeFromHistogram(bHist, minV, maxV);
  let yMax = 0;
  for (let i = 0; i < bins; i += 1) {
    if (aHist[i] > yMax) yMax = aHist[i];
    if (bHist[i] > yMax) yMax = bHist[i];
  }
  yMax = Math.max(yMax * 1.12, 1e-6);

  const ctx = canvasEl.getContext("2d");
  const width = canvasEl.clientWidth || canvasEl.width;
  const height = Math.max(200, Math.round(width * 0.38));
  canvasEl.width = width;
  canvasEl.height = height;

  const padL = 44;
  const padR = 16;
  const padT = 18;
  const padB = 36;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const xToPx = (v) => padL + ((v - minV) / (maxV - minV)) * plotW;
  const yToPx = (v) => padT + (1 - v / yMax) * plotH;

  if (rangeKey) {
    state.plotRanges[rangeKey] = { minV, maxV, padL, plotW };
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffdf7";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#b9a58b";
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  ctx.strokeStyle = "#d9cfbf";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padT + (i / 4) * plotH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(width - padR, y);
    ctx.stroke();
  }

  const xTicks = 8;
  ctx.strokeStyle = "#e4dacb";
  for (let i = 0; i <= xTicks; i += 1) {
    const x = padL + (i / xTicks) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();
  }

  const binW = plotW / bins;
  ctx.fillStyle = "rgba(15, 118, 110, 0.32)";
  for (let i = 0; i < bins; i += 1) {
    const h = (aHist[i] / yMax) * plotH;
    ctx.fillRect(padL + i * binW, padT + plotH - h, binW - 1, h);
  }
  ctx.fillStyle = "rgba(180, 83, 9, 0.30)";
  for (let i = 0; i < bins; i += 1) {
    const h = (bHist[i] / yMax) * plotH;
    ctx.fillRect(padL + i * binW, padT + plotH - h, binW - 1, h);
  }

  ctx.lineWidth = 1.8;
  ctx.strokeStyle = "#0f766e";
  ctx.beginPath();
  for (let i = 0; i < bins; i += 1) {
    const x = padL + (i + 0.5) * binW;
    const y = yToPx(aHist[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = "#b45309";
  ctx.beginPath();
  for (let i = 0; i < bins; i += 1) {
    const x = padL + (i + 0.5) * binW;
    const y = yToPx(bHist[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  drawLabeledStatLine(ctx, xToPx(seriesA.stats.mean), padT, padT + plotH, "#0f766e", [], "mean", padT + 2);
  drawLabeledStatLine(ctx, xToPx(aMedian), padT, padT + plotH, "#0f766e", [6, 2], "median", padT + 14);
  drawLabeledStatLine(ctx, xToPx(aMode), padT, padT + plotH, "#0f766e", [2, 3], "mode", padT + 26);
  drawVerticalLine(ctx, xToPx(seriesA.stats.mean - 3 * seriesA.stats.sigma), padT, padT + plotH, "#0f766e", [5, 3]);
  drawVerticalLine(ctx, xToPx(seriesA.stats.mean + 3 * seriesA.stats.sigma), padT, padT + plotH, "#0f766e", [5, 3]);

  drawLabeledStatLine(ctx, xToPx(seriesB.stats.mean), padT, padT + plotH, "#b45309", [], "mean", padT + 2);
  drawLabeledStatLine(ctx, xToPx(bMedian), padT, padT + plotH, "#b45309", [6, 2], "median", padT + 14);
  drawLabeledStatLine(ctx, xToPx(bMode), padT, padT + plotH, "#b45309", [2, 3], "mode", padT + 26);
  drawVerticalLine(ctx, xToPx(seriesB.stats.mean - 3 * seriesB.stats.sigma), padT, padT + plotH, "#b45309", [5, 3]);
  drawVerticalLine(ctx, xToPx(seriesB.stats.mean + 3 * seriesB.stats.sigma), padT, padT + plotH, "#b45309", [5, 3]);

  ctx.fillStyle = "#5e4f3f";
  ctx.font = "15px Segoe UI";
  ctx.textAlign = "center";
  for (let i = 0; i <= xTicks; i += 1) {
    const t = i / xTicks;
    const x = padL + t * plotW;
    const v = minV + t * (maxV - minV);
    ctx.fillText(v.toFixed(3), x, height - 8);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#0f766e";
  ctx.fillText(seriesA.label, padL + 4, 12);
  ctx.fillStyle = "#b45309";
  ctx.fillText(seriesB.label, padL + 88, 12);

  statsEl.textContent = [
    `${seriesA.label} mean: ${seriesA.stats.mean.toFixed(6)} in, sigma: ${seriesA.stats.sigma.toFixed(6)} in, +/-3sigma: [${(seriesA.stats.mean - 3 * seriesA.stats.sigma).toFixed(6)}, ${(seriesA.stats.mean + 3 * seriesA.stats.sigma).toFixed(6)}]`,
    `${seriesA.label} median: ${Number.isFinite(aMedian) ? aMedian.toFixed(6) : "n/a"} in, mode: ${Number.isFinite(aMode) ? aMode.toFixed(6) : "n/a"} in`,
    `${seriesB.label} mean: ${seriesB.stats.mean.toFixed(6)} in, sigma: ${seriesB.stats.sigma.toFixed(6)} in, +/-3sigma: [${(seriesB.stats.mean - 3 * seriesB.stats.sigma).toFixed(6)}, ${(seriesB.stats.mean + 3 * seriesB.stats.sigma).toFixed(6)}]`,
    `${seriesB.label} median: ${Number.isFinite(bMedian) ? bMedian.toFixed(6) : "n/a"} in, mode: ${Number.isFinite(bMode) ? bMode.toFixed(6) : "n/a"} in`,
    `${seriesA.label} center: ${seriesA.center ? `${seriesA.center.x.toFixed(6)}, ${seriesA.center.y.toFixed(6)}, ${seriesA.center.z.toFixed(6)}` : "n/a"}`,
    `${seriesB.label} center: ${seriesB.center ? `${seriesB.center.x.toFixed(6)}, ${seriesB.center.y.toFixed(6)}, ${seriesB.center.z.toFixed(6)}` : "n/a"}`,
    `X-axis range used: ${minV.toFixed(6)} to ${maxV.toFixed(6)} in`,
    `Point counts (${seriesA.label} / ${seriesB.label}): ${seriesA.values.length.toLocaleString()} / ${seriesB.values.length.toLocaleString()}`,
  ].join("\n");
}

function updateHistogramPlot() {
  if (!state.gws || !state.lastTransformedStlPoints) {
    setHistogramPlaceholder("Run a fit to render histogram.", ui.histCanvas);
    setHistogramPlaceholder("Run a fit to render histogram.", ui.rawHistCanvas);
    return;
  }

  const roi = ui.useRefineRoi.checked ? parseRefineRoi() : parseRoiInputs();
  if (ui.useRefineRoi.checked && !roi) {
    setHistogramPlaceholder("ROI values invalid. Fix ROI to render histogram.", ui.histCanvas);
    setHistogramPlaceholder("ROI values invalid. Fix ROI to render histogram.", ui.rawHistCanvas);
    return;
  }

  const customRange = parsePlotRange();
  if (ui.usePlotRange.checked && !customRange) {
    setHistogramPlaceholder("Invalid custom X range. Ensure X Min < X Max.", ui.histCanvas);
    setHistogramPlaceholder("Invalid custom X range. Ensure X Min < X Max.", ui.rawHistCanvas);
    ui.histStats.textContent = "Invalid custom X range. Ensure X Min < X Max.";
    ui.rawHistStats.textContent = "Invalid custom X range. Ensure X Min < X Max.";
    return;
  }

  const proxMaxDist = parseProxThreshold();
  const split = splitByFilters(
    state.lastTransformedStlPoints,
    state.lastStlErrors,
    state.lastPointDistances,
    roi,
    proxMaxDist,
  );

  const stlIncludedScaled = split.includedPoints;
  const stlIncludedIdx = split.includedIndices;
  if (stlIncludedScaled.length < 30 || state.gws.points.length < 30) {
    setHistogramPlaceholder("Insufficient points after filtering for histogram.", ui.histCanvas);
    ui.histStats.textContent = "Insufficient points after filtering for histogram.";
  } else {
    const gwsFit = fitSphereLeastSquares(state.gws.points);
    const stlFit = fitSphereLeastSquares(stlIncludedScaled);
    if (!gwsFit || !stlFit) {
      setHistogramPlaceholder("Sphere fit failed for scaled histogram.", ui.histCanvas);
      ui.histStats.textContent = "Sphere fit failed for scaled histogram.";
    } else {
      const gwsVals = radialDistances(state.gws.points, gwsFit.center);
      const stlVals = radialDistances(stlIncludedScaled, stlFit.center);
      renderDualHistogram(
        ui.histCanvas,
        ui.histStats,
        { label: "GWS", values: gwsVals, stats: meanStd(gwsVals), center: gwsFit.center },
        { label: "Filtered STL", values: stlVals, stats: meanStd(stlVals), center: stlFit.center },
        "Insufficient points for scaled histogram.",
        "scaled",
        customRange,
      );
    }
  }

  if (!state.gwsRawPoints || !state.stlRawPoints || stlIncludedIdx.length < 30 || state.gwsRawPoints.length < 30) {
    setHistogramPlaceholder("Insufficient raw points for raw histogram.", ui.rawHistCanvas);
    ui.rawHistStats.textContent = "Insufficient raw points for raw histogram.";
    return;
  }

  const gwsRaw = scalePointArray(state.gwsRawPoints, unitFactorToInches(ui.gwsUnit.value));
  const stlRawSelected = scalePointArray(pointsByIndices(state.stlRawPoints, stlIncludedIdx), unitFactorToInches(ui.stlUnit.value));
  const gwsRawFit = fitSphereLeastSquares(gwsRaw);
  const stlRawFit = fitSphereLeastSquares(stlRawSelected);
  if (!gwsRawFit || !stlRawFit) {
    setHistogramPlaceholder("Sphere fit failed for raw histogram.", ui.rawHistCanvas);
    ui.rawHistStats.textContent = "Sphere fit failed for raw histogram.";
    return;
  }

  const gwsRawVals = radialDistances(gwsRaw, gwsRawFit.center);
  const stlRawVals = radialDistances(stlRawSelected, stlRawFit.center);
  renderDualHistogram(
    ui.rawHistCanvas,
    ui.rawHistStats,
    { label: "GWS Raw", values: gwsRawVals, stats: meanStd(gwsRawVals), center: gwsRawFit.center },
    { label: "STL Raw Selected", values: stlRawVals, stats: meanStd(stlRawVals), center: stlRawFit.center },
    "Insufficient raw points for histogram.",
    "raw",
    customRange,
  );
}

function bindPlotCursorReadout(canvasEl, rangeKey, outputEl) {
  canvasEl.addEventListener("mousemove", (event) => {
    const range = state.plotRanges[rangeKey];
    if (!range) {
      outputEl.textContent = "Move cursor over chart to see X (in).";
      return;
    }
    const rect = canvasEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const t = Math.max(0, Math.min(1, (x - range.padL) / Math.max(1, range.plotW)));
    const v = range.minV + t * (range.maxV - range.minV);
    outputEl.textContent = `Cursor X: ${v.toFixed(6)} in`;
  });

  canvasEl.addEventListener("mouseleave", () => {
    outputEl.textContent = "Move cursor over chart to see X (in).";
  });
}

function positionHoverReadout() {
  const rect = canvas.getBoundingClientRect();
  const x = Math.min(Math.max(state.hoverClient.x + 14, 8), rect.width - 280);
  const y = Math.min(Math.max(state.hoverClient.y + 14, 8), rect.height - 46);
  ui.hoverReadout.style.left = `${x}px`;
  ui.hoverReadout.style.top = `${y}px`;
  ui.hoverReadout.style.right = "auto";
}

function findHoveredPoint() {
  const targets = [];
  if (state.stlPointsObj?.visible) targets.push({ obj: state.stlPointsObj, source: "STL" });
  if (state.excludedPointsObj?.visible) targets.push({ obj: state.excludedPointsObj, source: "STL-Excluded" });
  if (state.proxExcludedPointsObj?.visible) targets.push({ obj: state.proxExcludedPointsObj, source: "STL-Prox-Excluded" });
  if (state.masterPointsObj?.visible) targets.push({ obj: state.masterPointsObj, source: "GWS" });

  if (targets.length === 0) return null;

  state.raycaster.params.Points.threshold = 0.03;
  state.raycaster.setFromCamera(state.hoverNdc, camera);

  for (const target of targets) {
    const hit = state.raycaster.intersectObject(target.obj, false)[0];
    if (!hit || hit.index === undefined || hit.index === null) continue;

    const pos = target.obj.geometry.getAttribute("position");
    const p = new THREE.Vector3(pos.getX(hit.index), pos.getY(hit.index), pos.getZ(hit.index));
    target.obj.localToWorld(p);
    return { source: target.source, x: p.x, y: p.y, z: p.z };
  }

  return null;
}

function formatBounds(label, bounds, unitLabel) {
  if (!bounds) return `${label}: not loaded`;
  const dx = bounds.size.x;
  const dy = bounds.size.y;
  const dz = bounds.size.z;
  const inferredDiameter = Math.max(dx, dy, dz);
  return [
    `${label} (${unitLabel}):`,
    `  bbox X: ${dx.toFixed(6)} in`,
    `  bbox Y: ${dy.toFixed(6)} in`,
    `  bbox Z: ${dz.toFixed(6)} in`,
    `  inferred diameter: ${inferredDiameter.toFixed(6)} in`,
  ].join("\n");
}

function updateSizeSummary() {
  const lines = [
    formatBounds("GWS", state.gws?.bounds, ui.gwsUnit.value),
    "",
    formatBounds("STL", state.stl?.bounds, ui.stlUnit.value),
  ];
  ui.sizeSummary.textContent = lines.join("\n");
}

function setRefineRoiDefaultsFromGws() {
  if (!state.gws?.bounds) return;
  const b = state.gws.bounds;
  ui.roiXMin.value = b.min.x.toFixed(4);
  ui.roiXMax.value = b.max.x.toFixed(4);
  ui.roiYMin.value = b.min.y.toFixed(4);
  ui.roiYMax.value = b.max.y.toFixed(4);
  ui.roiZMin.value = b.min.z.toFixed(4);
  ui.roiZMax.value = b.max.z.toFixed(4);
}

function parseRoiInputs() {
  const vals = {
    xMin: Number(ui.roiXMin.value),
    xMax: Number(ui.roiXMax.value),
    yMin: Number(ui.roiYMin.value),
    yMax: Number(ui.roiYMax.value),
    zMin: Number(ui.roiZMin.value),
    zMax: Number(ui.roiZMax.value),
  };
  const allFinite = [vals.xMin, vals.xMax, vals.yMin, vals.yMax, vals.zMin, vals.zMax].every((v) => Number.isFinite(v));
  if (!allFinite) return null;
  if (vals.xMin > vals.xMax || vals.yMin > vals.yMax || vals.zMin > vals.zMax) return null;
  return vals;
}

function parseRefineRoi() {
  if (!ui.useRefineRoi.checked) return null;
  return parseRoiInputs();
}

function hasValidActiveRoi() {
  if (!ui.useRefineRoi.checked) return true;
  return parseRefineRoi() !== null;
}

function parseProxThreshold() {
  if (!ui.useProxFilter.checked) return null;
  const v = Number(ui.proxThreshold.value);
  return Number.isFinite(v) && v > 0 ? v : null;
}

function parsePlotRange() {
  if (!ui.usePlotRange.checked) return null;
  const min = Number(ui.plotXMin.value);
  const max = Number(ui.plotXMax.value);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return null;
  return { min, max };
}

function isInsideRoi(x, y, z, roi) {
  if (!roi) return true;
  return x >= roi.xMin && x <= roi.xMax && y >= roi.yMin && y <= roi.yMax && z >= roi.zMin && z <= roi.zMax;
}

function solveLinear4x4(a, b) {
  const m = [
    [a[0][0], a[0][1], a[0][2], a[0][3], b[0]],
    [a[1][0], a[1][1], a[1][2], a[1][3], b[1]],
    [a[2][0], a[2][1], a[2][2], a[2][3], b[2]],
    [a[3][0], a[3][1], a[3][2], a[3][3], b[3]],
  ];

  for (let col = 0; col < 4; col += 1) {
    let pivotRow = col;
    let pivotAbs = Math.abs(m[col][col]);
    for (let row = col + 1; row < 4; row += 1) {
      const v = Math.abs(m[row][col]);
      if (v > pivotAbs) {
        pivotAbs = v;
        pivotRow = row;
      }
    }
    if (pivotAbs < 1e-12) return null;

    if (pivotRow !== col) {
      const temp = m[col];
      m[col] = m[pivotRow];
      m[pivotRow] = temp;
    }

    const pivot = m[col][col];
    for (let j = col; j < 5; j += 1) m[col][j] /= pivot;

    for (let row = 0; row < 4; row += 1) {
      if (row === col) continue;
      const factor = m[row][col];
      for (let j = col; j < 5; j += 1) {
        m[row][j] -= factor * m[col][j];
      }
    }
  }

  return [m[0][4], m[1][4], m[2][4], m[3][4]];
}

function fitSphereLeastSquares(points, maxPoints = 15000) {
  const sampled = samplePointArray(points, maxPoints);
  const n = sampled.length / 3;
  if (n < 20) return null;

  const ata = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const atb = [0, 0, 0, 0];

  for (let i = 0; i < sampled.length; i += 3) {
    const x = sampled[i];
    const y = sampled[i + 1];
    const z = sampled[i + 2];
    const row = [x, y, z, 1];
    const rhs = -(x * x + y * y + z * z);

    for (let r = 0; r < 4; r += 1) {
      atb[r] += row[r] * rhs;
      for (let c = 0; c < 4; c += 1) {
        ata[r][c] += row[r] * row[c];
      }
    }
  }

  const sol = solveLinear4x4(ata, atb);
  if (!sol) return null;

  const [a, b, c, d] = sol;
  const cx = -a / 2;
  const cy = -b / 2;
  const cz = -c / 2;
  const r2 = cx * cx + cy * cy + cz * cz - d;
  if (!Number.isFinite(r2) || r2 <= 0) return null;

  let sumR = 0;
  for (let i = 0; i < sampled.length; i += 3) {
    const dx = sampled[i] - cx;
    const dy = sampled[i + 1] - cy;
    const dz = sampled[i + 2] - cz;
    sumR += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  return {
    center: { x: cx, y: cy, z: cz },
    radius: Math.sqrt(r2),
    avgRadius: sumR / n,
  };
}

function formatNum3(v) {
  return Number.isFinite(v) ? v.toFixed(3) : "n/a";
}

function setRadiusTableRows(rows) {
  const tbody = ui.radiusTable.querySelector("tbody");
  tbody.innerHTML = rows
    .map(
      (r) =>
        `<tr><td>${r.name}</td><td>${r.centerBefore}</td><td>${r.centerAfter}</td><td>${r.radiusBefore}</td><td>${r.radiusAfter}</td><td>${r.meanBefore}</td><td>${r.meanAfter}</td><td>${r.meanAfterAll}</td><td>${r.errorBefore}</td><td>${r.errorAfter}</td></tr>`,
    )
    .join("");
}

function resetRadiusTable() {
  setRadiusTableRows([
    { name: "GWS master", centerBefore: "n/a", centerAfter: "n/a", radiusBefore: "n/a", radiusAfter: "n/a", meanBefore: "n/a", meanAfter: "n/a", meanAfterAll: "n/a", errorBefore: "n/a", errorAfter: "n/a" },
    { name: "STL sample", centerBefore: "n/a", centerAfter: "n/a", radiusBefore: "n/a", radiusAfter: "n/a", meanBefore: "n/a", meanAfter: "n/a", meanAfterAll: "n/a", errorBefore: "n/a", errorAfter: "n/a" },
    { name: "STL-GWS delta", centerBefore: "n/a", centerAfter: "n/a", radiusBefore: "n/a", radiusAfter: "n/a", meanBefore: "n/a", meanAfter: "n/a", meanAfterAll: "n/a", errorBefore: "n/a", errorAfter: "n/a" },
  ]);
}

function formatPoint3(center) {
  if (!center) return "n/a";
  return `${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)}`;
}

function computeRmseToMaster(points, masterPoints, kdTree, maxPoints = 15000) {
  const sampled = samplePointArray(points, maxPoints);
  if (!sampled || sampled.length < 3) return NaN;

  let sumSq = 0;
  let count = 0;
  for (let i = 0; i < sampled.length; i += 3) {
    const d2 = nearestDistanceSquared(kdTree, masterPoints, sampled[i], sampled[i + 1], sampled[i + 2]);
    sumSq += d2;
    count += 1;
  }
  return count > 0 ? Math.sqrt(sumSq / count) : NaN;
}

function updateRadiusTableFromFit(transformedStlPoints, filteredStlPoints = transformedStlPoints) {
  const gwsFit = fitSphereLeastSquares(state.gws.points);
  const stlBeforeFit = fitSphereLeastSquares(state.stl.points);
  const stlAfterFit = fitSphereLeastSquares(transformedStlPoints);
  const stlAfterFilteredFit = filteredStlPoints && filteredStlPoints.length >= 60 ? fitSphereLeastSquares(filteredStlPoints) : null;

  const masterKd = buildKdTree(state.gws.points);
  const rmseBefore = computeRmseToMaster(state.stl.points, state.gws.points, masterKd);
  const rmseAfter = computeRmseToMaster(transformedStlPoints, state.gws.points, masterKd);

  const gwsBefore = gwsFit?.avgRadius ?? NaN;
  const gwsAfter = gwsBefore;
  const stlBefore = stlBeforeFit?.avgRadius ?? NaN;
  const stlAfter = stlAfterFit?.avgRadius ?? NaN;
  const gwsMeanBefore = gwsFit?.center ? meanRadius(state.gws.points, gwsFit.center) : NaN;
  const gwsMeanAfter = gwsMeanBefore;
  const stlMeanBefore = stlBeforeFit?.center ? meanRadius(state.stl.points, stlBeforeFit.center) : NaN;
  const stlMeanAfterAll = stlAfterFit?.center ? meanRadius(transformedStlPoints, stlAfterFit.center) : NaN;
  const stlMeanAfterFiltered = stlAfterFilteredFit?.center ? meanRadius(filteredStlPoints, stlAfterFilteredFit.center) : NaN;

  setRadiusTableRows([
    {
      name: "GWS master",
      centerBefore: formatPoint3(gwsFit?.center),
      centerAfter: formatPoint3(gwsFit?.center),
      radiusBefore: formatNum3(gwsBefore),
      radiusAfter: formatNum3(gwsAfter),
      meanBefore: formatNum3(gwsMeanBefore),
      meanAfter: formatNum3(gwsMeanAfter),
      meanAfterAll: "n/a",
      errorBefore: "n/a",
      errorAfter: "n/a",
    },
    {
      name: "STL sample",
      centerBefore: formatPoint3(stlBeforeFit?.center),
      centerAfter: formatPoint3(stlAfterFit?.center),
      radiusBefore: formatNum3(stlBefore),
      radiusAfter: formatNum3(stlAfter),
      meanBefore: formatNum3(stlMeanBefore),
      meanAfter: formatNum3(stlMeanAfterFiltered),
      meanAfterAll: formatNum3(stlMeanAfterAll),
      errorBefore: formatNum3(rmseBefore),
      errorAfter: formatNum3(rmseAfter),
    },
    {
      name: "STL-GWS delta",
      centerBefore:
        gwsFit?.center && stlBeforeFit?.center
          ? `${(stlBeforeFit.center.x - gwsFit.center.x).toFixed(3)}, ${(stlBeforeFit.center.y - gwsFit.center.y).toFixed(3)}, ${(stlBeforeFit.center.z - gwsFit.center.z).toFixed(3)}`
          : "n/a",
      centerAfter:
        gwsFit?.center && stlAfterFit?.center
          ? `${(stlAfterFit.center.x - gwsFit.center.x).toFixed(3)}, ${(stlAfterFit.center.y - gwsFit.center.y).toFixed(3)}, ${(stlAfterFit.center.z - gwsFit.center.z).toFixed(3)}`
          : "n/a",
      radiusBefore: formatNum3(stlBefore - gwsBefore),
      radiusAfter: formatNum3(stlAfter - gwsAfter),
      meanBefore: formatNum3(stlMeanBefore - gwsMeanBefore),
      meanAfter: formatNum3(stlMeanAfterFiltered - gwsMeanAfter),
      meanAfterAll: formatNum3(stlMeanAfterAll - gwsMeanAfter),
      errorBefore: formatNum3(rmseBefore),
      errorAfter: formatNum3(rmseAfter),
    },
  ]);
}

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  const x = localX / rect.width;
  const y = localY / rect.height;
  state.hoverNdc.set(x * 2 - 1, -(y * 2 - 1));
  state.hoverClient.x = localX;
  state.hoverClient.y = localY;
  positionHoverReadout();
});

canvas.addEventListener("mouseleave", () => {
  state.hoverNdc.set(2, 2);
  setHoverReadout("Hover a point to see X/Y/Z.");
});

function animate() {
  requestAnimationFrame(animate);
  resizeToContainer();
  controls.update();

  const hovered = findHoveredPoint();
  if (hovered) {
    setHoverReadout(`${hovered.source}  X:${hovered.x.toFixed(3)}  Y:${hovered.y.toFixed(3)}  Z:${hovered.z.toFixed(3)} in`);
  } else {
    setHoverReadout("Hover a point to see X/Y/Z.");
  }

  renderer.render(scene, camera);
}
animate();

function parseGwsText(text) {
  const lines = text.split(/\r?\n/);
  const points = [];

  for (const line of lines) {
    if (!line.startsWith("#12:")) continue;
    const payload = line.slice(4).trim();
    if (!payload) continue;

    const parts = payload.split(/\s+/);
    if (parts.length < 3) continue;

    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const z = Number(parts[2]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      points.push(x, y, z);
    }
  }

  if (points.length === 0) {
    throw new Error("No #12 XYZ data rows found in GWS file.");
  }

  return new Float32Array(points);
}

function computeBounds(points) {
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

  for (let i = 0; i < points.length; i += 3) {
    const x = points[i];
    const y = points[i + 1];
    const z = points[i + 2];
    if (x < min.x) min.x = x;
    if (y < min.y) min.y = y;
    if (z < min.z) min.z = z;
    if (x > max.x) max.x = x;
    if (y > max.y) max.y = y;
    if (z > max.z) max.z = z;
  }

  const center = min.clone().add(max).multiplyScalar(0.5);
  const size = max.clone().sub(min);
  return { min, max, center, size };
}

function samplePointArray(points, maxPoints) {
  const totalPoints = points.length / 3;
  if (totalPoints <= maxPoints) return points;

  const stride = Math.max(1, Math.floor(totalPoints / maxPoints));
  const sampled = [];
  for (let i = 0; i < points.length; i += 3 * stride) {
    sampled.push(points[i], points[i + 1], points[i + 2]);
  }
  return new Float32Array(sampled);
}

function unitFactorToInches(unit) {
  if (unit === "mm") return 1 / 25.4;
  if (unit === "cm") return 1 / 2.54;
  return 1;
}

function scalePointArray(points, factor) {
  if (factor === 1) return points;
  const out = new Float32Array(points.length);
  for (let i = 0; i < points.length; i += 1) out[i] = points[i] * factor;
  return out;
}

function rebuildGwsFromRaw() {
  if (!state.gwsRawPoints) return;

  const factor = unitFactorToInches(ui.gwsUnit.value);
  const displayRaw = samplePointArray(state.gwsRawPoints, 180000);
  const fitRaw = samplePointArray(state.gwsRawPoints, 22000);
  const sampledPoints = scalePointArray(displayRaw, factor);
  const fitPoints = scalePointArray(fitRaw, factor);

  state.gws = {
    points: sampledPoints,
    fitPoints,
    bounds: computeBounds(sampledPoints),
    sourcePointCount: state.gwsRawPoints.length / 3,
    unit: ui.gwsUnit.value,
  };

  state.fitted = null;
  state.lastFitStage = null;
  state.lastTransformedStlPoints = null;
  state.lastStlErrors = null;
  state.lastPointDistances = null;
  state.lastRadialReference = null;
  state.showProxExcludedPoints = false;
  removeObject("stlPointsObj");
  removeObject("excludedPointsObj");
  removeObject("proxExcludedPointsObj");
  buildMasterPointCloud(sampledPoints);
  fitCameraToData(state.gws.bounds);
  maybeEnableFit();
  updateSizeSummary();
  setRefineRoiDefaultsFromGws();
  resetRadiusTable();
  setHistogramPlaceholder("Run a fit to render histogram.", ui.histCanvas);
  setHistogramPlaceholder("Run a fit to render histogram.", ui.rawHistCanvas);
  ui.histStats.textContent = "Run a fit to view GWS vs filtered STL radial distributions.";
  ui.rawHistStats.textContent = "Run a fit to view raw-point radial distributions.";
}

function rebuildStlFromRaw() {
  if (!state.stlRawPoints) return;

  const factor = unitFactorToInches(ui.stlUnit.value);
  const points = scalePointArray(state.stlRawPoints, factor);

  state.stl = {
    points,
    fitPointsCoarse: samplePointArray(points, 9000),
    fitPointsRefine: points,
    triCount: state.stlRawTriCount,
    bounds: computeBounds(points),
    unit: ui.stlUnit.value,
  };

  state.fitted = null;
  state.lastFitStage = null;
  state.lastTransformedStlPoints = null;
  state.lastStlErrors = null;
  state.lastPointDistances = null;
  state.lastRadialReference = null;
  state.showProxExcludedPoints = false;
  removeObject("stlPointsObj");
  removeObject("excludedPointsObj");
  removeObject("proxExcludedPointsObj");
  maybeEnableFit();
  updateSizeSummary();
  resetRadiusTable();
  setHistogramPlaceholder("Run a fit to render histogram.", ui.histCanvas);
  setHistogramPlaceholder("Run a fit to render histogram.", ui.rawHistCanvas);
  ui.histStats.textContent = "Run a fit to view GWS vs filtered STL radial distributions.";
  ui.rawHistStats.textContent = "Run a fit to view raw-point radial distributions.";
}

function parseBinaryStlSample(arrayBuffer, requestedSamples) {
  const view = new DataView(arrayBuffer);
  const triCount = view.getUint32(80, true);
  const totalBytes = 84 + triCount * 50;
  if (totalBytes > arrayBuffer.byteLength) {
    throw new Error("STL appears malformed: declared triangle count exceeds file size.");
  }

  const sampleCount = Math.max(1000, Math.min(requestedSamples, triCount));
  const stride = Math.max(1, Math.floor(triCount / sampleCount));

  const sampled = [];

  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

  for (let t = 0; t < triCount; t += 1) {
    const base = 84 + t * 50;

    const ax = view.getFloat32(base + 12, true);
    const ay = view.getFloat32(base + 16, true);
    const az = view.getFloat32(base + 20, true);
    const bx = view.getFloat32(base + 24, true);
    const by = view.getFloat32(base + 28, true);
    const bz = view.getFloat32(base + 32, true);
    const cx = view.getFloat32(base + 36, true);
    const cy = view.getFloat32(base + 40, true);
    const cz = view.getFloat32(base + 44, true);

    min.x = Math.min(min.x, ax, bx, cx);
    min.y = Math.min(min.y, ay, by, cy);
    min.z = Math.min(min.z, az, bz, cz);
    max.x = Math.max(max.x, ax, bx, cx);
    max.y = Math.max(max.y, ay, by, cy);
    max.z = Math.max(max.z, az, bz, cz);

    if (t % stride === 0) {
      sampled.push((ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3);
    }
  }

  return {
    points: new Float32Array(sampled),
    triCount,
    bounds: {
      min,
      max,
      center: min.clone().add(max).multiplyScalar(0.5),
      size: max.clone().sub(min),
    },
  };
}

class KdNode {
  constructor(index, axis, left, right) {
    this.index = index;
    this.axis = axis;
    this.left = left;
    this.right = right;
  }
}

function buildKdTree(points) {
  const idx = new Array(points.length / 3);
  for (let i = 0; i < idx.length; i += 1) idx[i] = i;

  function build(ids, depth) {
    if (ids.length === 0) return null;
    const axis = depth % 3;
    ids.sort((a, b) => points[a * 3 + axis] - points[b * 3 + axis]);
    const mid = Math.floor(ids.length / 2);
    return new KdNode(ids[mid], axis, build(ids.slice(0, mid), depth + 1), build(ids.slice(mid + 1), depth + 1));
  }

  return build(idx, 0);
}

function nearestDistanceSquared(tree, points, x, y, z) {
  let best = Infinity;

  function walk(node) {
    if (!node) return;

    const i = node.index * 3;
    const dx = points[i] - x;
    const dy = points[i + 1] - y;
    const dz = points[i + 2] - z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < best) best = d2;

    const axis = node.axis;
    const delta = axis === 0 ? x - points[i] : axis === 1 ? y - points[i + 1] : z - points[i + 2];

    const first = delta < 0 ? node.left : node.right;
    const second = delta < 0 ? node.right : node.left;

    walk(first);
    if (delta * delta < best) walk(second);
  }

  walk(tree);
  return best;
}

function errorToColor(error, cap) {
  const t = Math.min(1, error / cap);

  const c0 = new THREE.Color(0x1655d4);
  const c1 = new THREE.Color(0x18a5e0);
  const c2 = new THREE.Color(0x2aa84a);
  const c3 = new THREE.Color(0xf7cc2f);
  const c4 = new THREE.Color(0xe03e2f);

  let a;
  let b;
  let localT;

  if (t < 0.25) {
    a = c0;
    b = c1;
    localT = t / 0.25;
  } else if (t < 0.5) {
    a = c1;
    b = c2;
    localT = (t - 0.25) / 0.25;
  } else if (t < 0.75) {
    a = c2;
    b = c3;
    localT = (t - 0.5) / 0.25;
  } else {
    a = c3;
    b = c4;
    localT = (t - 0.75) / 0.25;
  }

  return a.clone().lerp(b, localT);
}

function removeObject(refKey) {
  if (state[refKey]) {
    scene.remove(state[refKey]);
    state[refKey].geometry.dispose();
    state[refKey].material.dispose();
    state[refKey] = null;
  }
}

function syncPointVisibility() {
  if (state.stlPointsObj) {
    state.stlPointsObj.visible = ui.showStl.checked;
  }
  if (state.excludedPointsObj) {
    state.excludedPointsObj.visible = state.showExcludedPoints;
  }
  if (state.proxExcludedPointsObj) {
    state.proxExcludedPointsObj.visible = state.showProxExcludedPoints;
  }

  ui.toggleIncludedBtn.textContent = ui.showStl.checked ? "Hide Included ROI Points" : "Show Included ROI Points";
  ui.toggleExcludedBtn.textContent = state.showExcludedPoints ? "Hide Excluded ROI Points" : "Show Excluded ROI Points";
  ui.toggleProxExcludedBtn.textContent = state.showProxExcludedPoints ? "Hide Proximity-Excluded Points" : "Show Proximity-Excluded Points";
}

function buildMasterPointCloud(points) {
  removeObject("masterPointsObj");
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(points, 3));

  const mat = new THREE.PointsMaterial({
    size: 3,
    color: 0x1a1a2e,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.75,
  });

  const obj = new THREE.Points(geom, mat);
  obj.visible = ui.showMaster.checked;
  state.masterPointsObj = obj;
  scene.add(obj);
}

function buildStlPointCloud(stlPointsTransformed, errors, errorCap) {
  removeObject("stlPointsObj");

  const colors = new Float32Array(stlPointsTransformed.length);
  for (let i = 0; i < errors.length; i += 1) {
    const c = errorToColor(errors[i], errorCap);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(stlPointsTransformed, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 4,
    vertexColors: true,
    sizeAttenuation: false,
    transparent: true,
    opacity: 1.0,
  });

  const obj = new THREE.Points(geom, mat);
  state.stlPointsObj = obj;
  scene.add(obj);
  syncPointVisibility();
}

function buildExcludedPointCloud(points) {
  removeObject("excludedPointsObj");
  if (!points || points.length === 0) {
    state.showExcludedPoints = false;
    syncPointVisibility();
    return;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(points, 3));

  const mat = new THREE.PointsMaterial({
    size: 3,
    color: 0x6c6c6c,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.75,
  });

  const obj = new THREE.Points(geom, mat);
  state.excludedPointsObj = obj;
  scene.add(obj);
  syncPointVisibility();
}

function buildProxExcludedPointCloud(points) {
  removeObject("proxExcludedPointsObj");
  if (!points || points.length === 0) {
    state.showProxExcludedPoints = false;
    syncPointVisibility();
    return;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(points, 3));

  const mat = new THREE.PointsMaterial({
    size: 3,
    color: 0xcc7700,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.75,
  });

  const obj = new THREE.Points(geom, mat);
  state.proxExcludedPointsObj = obj;
  scene.add(obj);
  syncPointVisibility();
}

function splitByFilters(points, errors, distances, roi, proxMaxDist) {
  const inPts = [];
  const inErr = [];
  const inIdx = [];
  const roiOutPts = [];
  const proxOutPts = [];

  for (let i = 0; i < points.length; i += 3) {
    const x = points[i];
    const y = points[i + 1];
    const z = points[i + 2];
    const inRoi = !roi || isInsideRoi(x, y, z, roi);
    if (!inRoi) {
      roiOutPts.push(x, y, z);
      continue;
    }
    const dist = distances ? distances[i / 3] : 0;
    const inProx = proxMaxDist == null || dist <= proxMaxDist;
    if (inProx) {
      inPts.push(x, y, z);
      inErr.push(errors[i / 3]);
      inIdx.push(i / 3);
    } else {
      proxOutPts.push(x, y, z);
    }
  }

  return {
    includedPoints: new Float32Array(inPts),
    includedErrors: new Float32Array(inErr),
    includedIndices: new Int32Array(inIdx),
    roiExcludedPoints: new Float32Array(roiOutPts),
    proxExcludedPoints: new Float32Array(proxOutPts),
  };
}

function refreshRoiDisplayFromLastFit() {
  if (!state.lastTransformedStlPoints || !state.lastStlErrors) return;

  const roi = ui.useRefineRoi.checked ? parseRefineRoi() : parseRoiInputs();
  if (ui.useRefineRoi.checked && !roi) {
    setStatus("ROI values are invalid. Check ROI limits before refine.");
    setHistogramPlaceholder("ROI values invalid. Fix ROI to render histogram.", ui.histCanvas);
    setHistogramPlaceholder("ROI values invalid. Fix ROI to render histogram.", ui.rawHistCanvas);
    ui.histStats.textContent = "ROI values invalid. Fix ROI to render histogram.";
    ui.rawHistStats.textContent = "ROI values invalid. Fix ROI to render histogram.";
    return;
  }

  const proxMaxDist = parseProxThreshold();
  const errorCap = Math.max(1e-6, Number(ui.errorCap.value) || 0.05);
  const { includedPoints, includedErrors, roiExcludedPoints, proxExcludedPoints } = splitByFilters(
    state.lastTransformedStlPoints, state.lastStlErrors, state.lastPointDistances, roi, proxMaxDist
  );

  buildStlPointCloud(includedPoints, includedErrors, errorCap);
  buildExcludedPointCloud(roiExcludedPoints);
  buildProxExcludedPointCloud(proxExcludedPoints);
  updateRadiusTableFromFit(state.lastTransformedStlPoints, includedPoints);

  ui.toggleExcludedBtn.disabled = roiExcludedPoints.length === 0;
  if (roiExcludedPoints.length === 0) state.showExcludedPoints = false;
  ui.toggleProxExcludedBtn.disabled = proxExcludedPoints.length === 0;
  if (proxExcludedPoints.length === 0) state.showProxExcludedPoints = false;
  updateHistogramPlot();
  maybeEnableFit();
}

function fitCameraToData(gwsBounds) {
  controls.target.copy(gwsBounds.center);

  const radius = gwsBounds.size.length() * 0.55;
  const dir = new THREE.Vector3(1, 0.9, 1.1).normalize();
  camera.position.copy(gwsBounds.center.clone().add(dir.multiplyScalar(Math.max(radius * 2.4, 0.4))));
  controls.update();
}

function summarizeFit(fitResult, stlPointCount) {
  const p = fitResult.params;
  const unitScale = fitResult.unitScale || 1;
  return [
    `${fitResult.stage === "refine" ? "Refined" : "Coarse"} Fit Result (STL -> GWS)`,
    "",
    `Scaling mode: ${fitResult.scalingMode === "uniform" ? "Uniform XYZ" : "Independent XYZ"}`,
    "Assumption: both files use the same native unit system (inches).",
    `Selected STL base unit scale to inches: ${unitScale.toFixed(8)}`,
    `Chosen STL orientation: ${fitResult.orientation.label}`,
    "",
    `STL sample points: ${stlPointCount.toLocaleString()}`,
    `RMSE distance (in): ${fitResult.rmse.toFixed(6)}`,
    "",
    "Fine scale multipliers after base unit conversion:",
    `sx: ${p.sx.toFixed(8)}`,
    `sy: ${p.sy.toFixed(8)}`,
    `sz: ${p.sz.toFixed(8)}`,
    "",
    "Effective STL-to-GWS scale multipliers:",
    `sx: ${(p.sx * unitScale).toFixed(8)}`,
    `sy: ${(p.sy * unitScale).toFixed(8)}`,
    `sz: ${(p.sz * unitScale).toFixed(8)}`,
    "",
    "Translation (in):",
    `tx: ${p.tx.toFixed(6)}`,
    `ty: ${p.ty.toFixed(6)}`,
    `tz: ${p.tz.toFixed(6)}`,
  ].join("\n");
}

function maybeEnableFit() {
  ui.fitBtn.disabled = !(state.gws && state.stl);
  ui.refineBtn.disabled = !(state.gws && state.stl && state.fitted);
  ui.recalcRoiBtn.disabled = !(state.gws && state.stl && state.fitted && ui.useRefineRoi.checked && hasValidActiveRoi());
  ui.recalcProxBtn.disabled = !(state.gws && state.stl && state.fitted && parseProxThreshold() !== null);
  ui.toggleIncludedBtn.disabled = !state.stlPointsObj;
  ui.toggleExcludedBtn.disabled = !state.excludedPointsObj;
  ui.toggleProxExcludedBtn.disabled = !state.proxExcludedPointsObj;
}

function disposeWorker() {
  if (state.fitWorker) {
    state.fitWorker.terminate();
    state.fitWorker = null;
  }
}

ui.gwsInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setStatus("Loading GWS...");
  try {
    const text = await file.text();
    const allPoints = parseGwsText(text);

    state.gwsRawPoints = allPoints;
    rebuildGwsFromRaw();
    maybeEnableFit();

    setSummary(`GWS loaded.\nUnits: ${state.gws.unit}\nSource points: ${state.gws.sourcePointCount.toLocaleString()}\nDisplay points: ${(state.gws.points.length / 3).toLocaleString()}\nFit points: ${(state.gws.fitPoints.length / 3).toLocaleString()}`);
    setStatus("GWS loaded.");
    updateSizeSummary();
  } catch (err) {
    console.error(err);
    setStatus(`Failed to load GWS: ${err.message}`);
  }
});

ui.stlInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setStatus("Loading STL and sampling triangles...");
  try {
    const sampleCount = Number(ui.sampleCount.value) || 80000;
    const buffer = await file.arrayBuffer();
    const sampled = parseBinaryStlSample(buffer, sampleCount);

    state.stlRawPoints = sampled.points;
    state.stlRawTriCount = sampled.triCount;
    rebuildStlFromRaw();
    maybeEnableFit();

    setSummary(`STL loaded.\nUnits: ${state.stl.unit}\nTriangles: ${state.stl.triCount.toLocaleString()}\nDisplay sample points: ${(state.stl.points.length / 3).toLocaleString()}\nCoarse fit points: ${(state.stl.fitPointsCoarse.length / 3).toLocaleString()}\nRefine fit points: ${(state.stl.fitPointsRefine.length / 3).toLocaleString()}`);
    setStatus("STL loaded.");
    updateSizeSummary();
  } catch (err) {
    console.error(err);
    setStatus(`Failed to load STL: ${err.message}`);
  }
});

function runFit(stage) {
  if (!(state.gws && state.stl)) return;

  const activeRefineRoi = stage === "refine" ? parseRefineRoi() : null;
  const activeProxThreshold = parseProxThreshold();
  if (stage === "refine" && ui.useRefineRoi.checked && !activeRefineRoi) {
    setStatus("ROI values are invalid. Please correct ROI limits and retry.");
    return;
  }
  if (stage === "refine" && ui.useProxFilter.checked && activeProxThreshold == null) {
    setStatus("Proximity threshold is invalid. Enter a positive distance and retry.");
    return;
  }

  disposeWorker();
  ui.fitBtn.disabled = true;
  ui.refineBtn.disabled = true;
  setStatus(stage === "refine" ? "Running refined fit in background..." : "Running coarse fit in background...");

  const worker = new Worker("./fit-worker.js");
  state.fitWorker = worker;

  worker.onmessage = (event) => {
    const payload = event.data;

    if (payload.type === "progress") {
      setStatus(payload.message);
      return;
    }

    if (payload.type === "result") {
      const fitResult = { ...payload.fitResult, stage, scalingMode: state.useUniformScaling ? "uniform" : "independent" };
      state.fitted = fitResult;
      state.lastFitStage = stage;

      const errorCap = Math.max(1e-6, Number(ui.errorCap.value) || 0.05);
      const transformedPoints = new Float32Array(payload.transformedPoints);
      const allErrors = new Float32Array(payload.errors);
      const allDistances = new Float32Array(payload.pointDistances || transformedPoints.length / 3);
      state.lastTransformedStlPoints = transformedPoints;
      state.lastStlErrors = allErrors;
      state.lastPointDistances = allDistances;
      state.lastRadialReference = payload.radialReference || null;

      const roi = stage === "refine" ? activeRefineRoi : parseRoiInputs();
      const { includedPoints, includedErrors, roiExcludedPoints, proxExcludedPoints } = splitByFilters(
        transformedPoints,
        allErrors,
        allDistances,
        roi,
        activeProxThreshold,
      );
      buildStlPointCloud(includedPoints, includedErrors, errorCap);
      buildExcludedPointCloud(roiExcludedPoints);
      buildProxExcludedPointCloud(proxExcludedPoints);
      ui.toggleExcludedBtn.disabled = roiExcludedPoints.length === 0;
      ui.toggleProxExcludedBtn.disabled = proxExcludedPoints.length === 0;
      updateRadiusTableFromFit(transformedPoints, includedPoints);
      updateHistogramPlot();

      setSummary([
        summarizeFit(fitResult, payload.fitPointCount),
        "",
        "Error stats after fit:",
        payload.roiPointCounts ? `ROI points used (GWS/STL): ${payload.roiPointCounts.gws} / ${payload.roiPointCounts.stl}` : "ROI points used (GWS/STL): all / all",
        payload.radialReference
          ? `GWS radial reference center (in): ${payload.radialReference.center.x.toFixed(3)}, ${payload.radialReference.center.y.toFixed(3)}, ${payload.radialReference.center.z.toFixed(3)}`
          : "GWS radial reference center (in): n/a",
        payload.radialReference ? `GWS average best-fit radius (in): ${payload.radialReference.avgRadius.toFixed(6)}` : "GWS average best-fit radius (in): n/a",
        `Mean abs radial error (in): ${payload.stats.mean.toFixed(6)}`,
        `Max abs radial error (in): ${payload.stats.max.toFixed(6)}`,
        activeProxThreshold != null ? `Proximity threshold (in): ${activeProxThreshold.toFixed(6)}` : "Proximity threshold (in): disabled",
        `Proximity excluded points: ${proxExcludedPoints.length / 3}`,
        `Color cap used (in): ${errorCap.toFixed(6)}`,
      ].join("\n"));

      setStatus("Fit complete. STL error map rendered.");
      disposeWorker();
      maybeEnableFit();
    }
  };

  worker.onerror = (event) => {
    console.error(event);
    setStatus(`Fit failed: ${event.message || "worker error"}`);
    disposeWorker();
    maybeEnableFit();
  };

  worker.postMessage({
    mode: stage,
    uniformScaling: state.useUniformScaling,
    gwsFitPoints: state.gws.fitPoints,
    gwsBounds: state.gws.bounds,
    stlFitPoints: stage === "refine" ? state.stl.fitPointsRefine : state.stl.fitPointsCoarse,
    stlDisplayPoints: state.stl.points,
    stlBounds: state.stl.bounds,
    seedFit: stage === "refine" ? state.fitted : null,
    unitScaleCandidates: [1],
    refineRoi: activeRefineRoi,
    proxMaxDist: activeProxThreshold,
  });
}

ui.gwsUnit.addEventListener("change", () => {
  if (!state.gwsRawPoints) return;
  rebuildGwsFromRaw();
  setStatus("GWS units changed. Geometry rebuilt in inches.");
  updateSizeSummary();
});

ui.stlUnit.addEventListener("change", () => {
  if (!state.stlRawPoints) return;
  rebuildStlFromRaw();
  setStatus("STL units changed. Geometry rebuilt in inches.");
  updateSizeSummary();
});

ui.errorCap.addEventListener("input", () => {
  updateLegendValues();
});

ui.useRefineRoi.addEventListener("change", () => {
  refreshRoiDisplayFromLastFit();
  maybeEnableFit();
});

ui.useProxFilter.addEventListener("change", () => {
  refreshRoiDisplayFromLastFit();
  maybeEnableFit();
});

ui.proxThreshold.addEventListener("input", () => {
  refreshRoiDisplayFromLastFit();
  maybeEnableFit();
});

ui.usePlotRange.addEventListener("change", () => {
  updateHistogramPlot();
});

for (const input of [ui.plotXMin, ui.plotXMax]) {
  input.addEventListener("input", () => {
    if (ui.usePlotRange.checked) updateHistogramPlot();
  });
}

for (const input of [ui.roiXMin, ui.roiXMax, ui.roiYMin, ui.roiYMax, ui.roiZMin, ui.roiZMax]) {
  input.addEventListener("input", () => {
    refreshRoiDisplayFromLastFit();
    maybeEnableFit();
  });
}

updateSizeSummary();
updateLegendValues();
resetRadiusTable();
setHistogramPlaceholder("Run a fit to render histogram.", ui.histCanvas);
setHistogramPlaceholder("Run a fit to render histogram.", ui.rawHistCanvas);
ui.histStats.textContent = "Run a fit to view GWS vs filtered STL radial distributions.";
ui.rawHistStats.textContent = "Run a fit to view raw-point radial distributions.";
bindPlotCursorReadout(ui.histCanvas, "scaled", ui.scaledPlotCursor);
bindPlotCursorReadout(ui.rawHistCanvas, "raw", ui.rawPlotCursor);
positionHoverReadout();
updateScalingModeButton();

ui.fitBtn.addEventListener("click", () => {
  runFit("coarse");
});

ui.refineBtn.addEventListener("click", () => {
  runFit("refine");
});

ui.recalcRoiBtn.addEventListener("click", () => {
  runFit("refine");
});

ui.recalcProxBtn.addEventListener("click", () => {
  runFit("refine");
});

ui.applyPlotRangeBtn.addEventListener("click", () => {
  ui.usePlotRange.checked = true;
  const range = parsePlotRange();
  if (!range) {
    setStatus("Invalid plot range. Enter X Min < X Max.");
    updateHistogramPlot();
    return;
  }
  updateHistogramPlot();
  setStatus(`Applied plot X range: ${range.min.toFixed(6)} to ${range.max.toFixed(6)} in.`);
});

ui.resetPlotRangeBtn.addEventListener("click", () => {
  ui.usePlotRange.checked = false;
  ui.plotXMin.value = "";
  ui.plotXMax.value = "";
  updateHistogramPlot();
  setStatus("Plot X range reset to automatic.");
});

ui.applySampleCountBtn.addEventListener("click", async () => {
  const file = ui.stlInput.files?.[0];
  if (!file) {
    setStatus("Load an STL file first, then apply sample count.");
    return;
  }

  try {
    setStatus("Re-sampling STL with updated sample count...");
    const sampleCount = Number(ui.sampleCount.value) || 60000;
    const buffer = await file.arrayBuffer();
    const sampled = parseBinaryStlSample(buffer, sampleCount);

    state.stlRawPoints = sampled.points;
    state.stlRawTriCount = sampled.triCount;
    rebuildStlFromRaw();
    maybeEnableFit();

    setSummary(`STL loaded.\nUnits: ${state.stl.unit}\nTriangles: ${state.stl.triCount.toLocaleString()}\nDisplay sample points: ${(state.stl.points.length / 3).toLocaleString()}\nCoarse fit points: ${(state.stl.fitPointsCoarse.length / 3).toLocaleString()}\nRefine fit points: ${(state.stl.fitPointsRefine.length / 3).toLocaleString()}`);
    setStatus("STL sample count updated. Run fit/refine again.");
    updateSizeSummary();
  } catch (err) {
    console.error(err);
    setStatus(`Failed to apply STL sample count: ${err.message}`);
  }
});

ui.scalingModeBtn.addEventListener("click", () => {
  state.useUniformScaling = !state.useUniformScaling;
  updateScalingModeButton();
  setStatus(state.useUniformScaling ? "Scaling set to Uniform XYZ." : "Scaling set to Independent XYZ.");
});

ui.toggleExcludedBtn.addEventListener("click", () => {
  state.showExcludedPoints = !state.showExcludedPoints;
  syncPointVisibility();
});

ui.toggleProxExcludedBtn.addEventListener("click", () => {
  state.showProxExcludedPoints = !state.showProxExcludedPoints;
  syncPointVisibility();
});

ui.toggleIncludedBtn.addEventListener("click", () => {
  ui.showStl.checked = !ui.showStl.checked;
  if (!ui.showStl.checked && state.excludedPointsObj) {
    state.showExcludedPoints = true;
  }
  if (!ui.showStl.checked && state.proxExcludedPointsObj) {
    state.showProxExcludedPoints = true;
  }
  syncPointVisibility();
});

ui.resetViewBtn.addEventListener("click", () => {
  if (state.gws) {
    fitCameraToData(state.gws.bounds);
  } else {
    controls.target.set(0, 0, 0);
    camera.position.set(2.4, 2.2, 2.8);
  }
});

ui.showMaster.addEventListener("change", () => {
  if (state.masterPointsObj) state.masterPointsObj.visible = ui.showMaster.checked;
});

ui.showStl.addEventListener("change", () => {
  syncPointVisibility();
});
