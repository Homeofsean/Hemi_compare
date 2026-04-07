import * as THREE from "three";
import { OrbitControls } from "./OrbitControls.js";

const ui = {
  gwsInput: document.getElementById("gwsInput"),
  stlInput: document.getElementById("stlInput"),
  gwsUnit: document.getElementById("gwsUnit"),
  stlUnit: document.getElementById("stlUnit"),
  sampleCount: document.getElementById("sampleCount"),
  zTarget: document.getElementById("zTarget"),
  zBand: document.getElementById("zBand"),
  smoothWindowF: document.getElementById("smoothWindowF"),
  rotXDeg: document.getElementById("rotXDeg"),
  rotYDeg: document.getElementById("rotYDeg"),
  refineZMin: document.getElementById("refineZMin"),
  refineZMax: document.getElementById("refineZMax"),
  runBtn: document.getElementById("runBtn"),
  applyRotationBtn: document.getElementById("applyRotationBtn"),
  refineCenterBtn: document.getElementById("refineCenterBtn"),
  resetViewBtn: document.getElementById("resetViewBtn"),
  summary: document.getElementById("summary"),
  gwsRadiusHist: document.getElementById("gwsRadiusHist"),
  gwsDiamHist: document.getElementById("gwsDiamHist"),
  stlRadiusHist: document.getElementById("stlRadiusHist"),
  stlDiamHist: document.getElementById("stlDiamHist"),
  scaledCompHist: document.getElementById("scaledCompHist"),
  overlapRadiusHist: document.getElementById("overlapRadiusHist"),
  overlapDiamHist: document.getElementById("overlapDiamHist"),
  angleRadiusPlot: document.getElementById("angleRadiusPlot"),
  scaledAngleRadiusPlot: document.getElementById("scaledAngleRadiusPlot"),
  smoothedAngleRadiusPlot: document.getElementById("smoothedAngleRadiusPlot"),
  gwsRadiusStats: document.getElementById("gwsRadiusStats"),
  gwsDiamStats: document.getElementById("gwsDiamStats"),
  stlRadiusStats: document.getElementById("stlRadiusStats"),
  stlDiamStats: document.getElementById("stlDiamStats"),
  scaledCompStats: document.getElementById("scaledCompStats"),
  overlapRadiusStats: document.getElementById("overlapRadiusStats"),
  overlapDiamStats: document.getElementById("overlapDiamStats"),
  angleRadiusStats: document.getElementById("angleRadiusStats"),
  scaledAngleRadiusStats: document.getElementById("scaledAngleRadiusStats"),
  smoothedAngleRadiusStats: document.getElementById("smoothedAngleRadiusStats"),
  status: document.getElementById("status"),
  cursorReadout: document.getElementById("cursorReadout"),
};

const state = {
  gwsRaw: null,
  stlRaw: null,
  stlTriCount: 0,
  stlAligned: null,
  stlCenter: null,
  stlAxis: null,
  stlBounds: null,
  stlPointsObj: null,
  stlSliceObj: null,
  sliceBandObj: null,
  axisObj: null,
  axesHelperObj: null,
  axisLabelsObj: null,
  hoverMarkerObj: null,
  refineBandObj: null,
  hoveredPoint: null,
  raycaster: new THREE.Raycaster(),
  mouseNdc: new THREE.Vector2(),
  pickTargets: [],
  gwsMeanDiameter: null,
  gwsFit2D: null,
  scaleFactor: 1,
  angleProfilesForSmoothing: null,
};

// ── Chart cursor registry ──────────────────────────────────────────────────
const chartRangeMap = new Map();

function registerChartRange(canvasEl, config) {
  chartRangeMap.set(canvasEl, config);
  if (canvasEl.dataset.cursorBound) return;
  canvasEl.dataset.cursorBound = "1";

  const wrap = canvasEl.parentElement;
  const line = wrap?.querySelector(".chart-cursor-line");
  const badge = wrap?.querySelector(".chart-cursor-val");
  if (!line || !badge) return;

  canvasEl.addEventListener("mousemove", (ev) => {
    const info = chartRangeMap.get(canvasEl);
    if (!info) return;
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = canvasEl.width / rect.width;
    const scaleY = canvasEl.height / rect.height;
    const offsetX = (ev.clientX - rect.left) * scaleX;
    const offsetY = (ev.clientY - rect.top) * scaleY;
    const tx = Math.max(0, Math.min(1, (offsetX - info.padL) / Math.max(1, info.chartW)));
    const ty = Math.max(0, Math.min(1, (offsetY - info.padT) / Math.max(1, info.chartH)));
    const xValue = info.minX + tx * (info.maxX - info.minX);
    const yValue = info.maxY - ty * (info.maxY - info.minY);
    const cssX = ev.clientX - rect.left;
    line.style.left = `${cssX}px`;
    line.style.display = "block";
    badge.style.left = `${cssX}px`;
    badge.style.display = "block";
    badge.textContent = info.labelFn
      ? info.labelFn(xValue, yValue)
      : `X: ${xValue.toFixed(5)} in | Y: ${yValue.toFixed(5)}`;
  });

  canvasEl.addEventListener("mouseleave", () => {
    line.style.display = "none";
    badge.style.display = "none";
  });
}

const canvas = document.getElementById("viewer");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4ecdf);
const camera = new THREE.PerspectiveCamera(55, 1, 0.001, 10000);
camera.position.set(2.4, 2.2, 2.8);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const dl = new THREE.DirectionalLight(0xffffff, 0.65);
dl.position.set(2, 4, 1);
scene.add(dl);
initHoverMarker();

function resizeToContainer() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) return;
  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function animate() {
  requestAnimationFrame(animate);
  resizeToContainer();
  controls.update();
  renderer.render(scene, camera);
}
animate();

function setStatus(text) {
  ui.status.textContent = text;
}

function setSummary(text) {
  ui.summary.textContent = text;
}

function setCursorReadout(x, y, z) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    ui.cursorReadout.textContent = "Cursor XYZ (in): --, --, --";
    return;
  }
  ui.cursorReadout.textContent = `Cursor XYZ (in): ${x.toFixed(4)}, ${y.toFixed(4)}, ${z.toFixed(4)}`;
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

function parseGwsText(text) {
  const lines = text.split(/\r?\n/);
  const points = [];
  for (const line of lines) {
    if (!line.startsWith("#12:")) continue;
    const parts = line.slice(4).trim().split(/\s+/);
    if (parts.length < 3) continue;
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const z = Number(parts[2]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) points.push(x, y, z);
  }
  if (points.length === 0) throw new Error("No #12 points in GWS file.");
  return new Float32Array(points);
}

function parseBinaryStlSample(arrayBuffer, requestedSamples) {
  const view = new DataView(arrayBuffer);
  const triCount = view.getUint32(80, true);
  const totalBytes = 84 + triCount * 50;
  if (totalBytes > arrayBuffer.byteLength) throw new Error("Malformed STL: triangle count exceeds file size.");

  const sampleCount = Math.max(1000, Math.min(requestedSamples, triCount));
  const stride = Math.max(1, Math.floor(triCount / sampleCount));
  const sampled = [];

  for (let t = 0; t < triCount; t += 1) {
    if (t % stride !== 0) continue;
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
    sampled.push((ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3);
  }

  return { points: new Float32Array(sampled), triCount };
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
  return {
    min,
    max,
    center: min.clone().add(max).multiplyScalar(0.5),
    size: max.clone().sub(min),
  };
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
      for (let j = col; j < 5; j += 1) m[row][j] -= factor * m[col][j];
    }
  }

  return [m[0][4], m[1][4], m[2][4], m[3][4]];
}

function solveLinear3x3(a, b) {
  const m = [
    [a[0][0], a[0][1], a[0][2], b[0]],
    [a[1][0], a[1][1], a[1][2], b[1]],
    [a[2][0], a[2][1], a[2][2], b[2]],
  ];
  for (let col = 0; col < 3; col += 1) {
    let pivotRow = col;
    let pivotAbs = Math.abs(m[col][col]);
    for (let row = col + 1; row < 3; row += 1) {
      const v = Math.abs(m[row][col]);
      if (v > pivotAbs) { pivotAbs = v; pivotRow = row; }
    }
    if (pivotAbs < 1e-12) return null;
    if (pivotRow !== col) { const t = m[col]; m[col] = m[pivotRow]; m[pivotRow] = t; }
    const pivot = m[col][col];
    for (let j = col; j < 4; j += 1) m[col][j] /= pivot;
    for (let row = 0; row < 3; row += 1) {
      if (row === col) continue;
      const factor = m[row][col];
      for (let j = col; j < 4; j += 1) m[row][j] -= factor * m[col][j];
    }
  }
  return [m[0][3], m[1][3], m[2][3]];
}

function fitCircle2D(points) {
  // Fit 2D circle to XY projection (Z ignored)
  // Solves: x² + y² + a·x + b·y + c = 0  →  cx = -a/2, cy = -b/2
  const n = points.length / 3;
  if (n < 10) return null;

  let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumXY = 0;
  let sumXR2 = 0, sumYR2 = 0, sumR2 = 0;

  for (let i = 0; i < points.length; i += 3) {
    const x = points[i];
    const y = points[i + 1];
    const r2 = x * x + y * y;
    sumX += x; sumY += y;
    sumX2 += x * x; sumY2 += y * y; sumXY += x * y;
    sumXR2 += x * r2; sumYR2 += y * r2; sumR2 += r2;
  }

  const ata = [
    [sumX2, sumXY, sumX],
    [sumXY, sumY2, sumY],
    [sumX,  sumY,  n   ],
  ];
  const atb = [-sumXR2, -sumYR2, -sumR2];

  const sol = solveLinear3x3(ata, atb);
  if (!sol) return null;

  const cx = -sol[0] / 2;
  const cy = -sol[1] / 2;
  const r2val = cx * cx + cy * cy - sol[2];
  if (!Number.isFinite(r2val) || r2val <= 0) return null;

  const radii = new Float32Array(n);
  for (let i = 0; i < points.length; i += 3) {
    const dx = points[i] - cx;
    const dy = points[i + 1] - cy;
    radii[i / 3] = Math.sqrt(dx * dx + dy * dy);
  }

  return { center: { x: cx, y: cy }, radii, avgRadius: Math.sqrt(r2val) };
}

function buildOppositePairDiameters(points, cx, cy, requestedBins = 360) {
  let bins = Math.max(36, Math.floor(requestedBins));
  if (bins % 2 !== 0) bins += 1;

  const twoPi = Math.PI * 2;
  const sums = new Float64Array(bins);
  const counts = new Uint32Array(bins);

  for (let i = 0; i < points.length; i += 3) {
    const dx = points[i] - cx;
    const dy = points[i + 1] - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    let a = Math.atan2(dy, dx);
    if (a < 0) a += twoPi;
    let b = Math.floor((a / twoPi) * bins);
    if (b >= bins) b = bins - 1;
    sums[b] += r;
    counts[b] += 1;
  }

  const out = [];
  const half = bins / 2;
  for (let b = 0; b < half; b += 1) {
    const o = b + half;
    if (counts[b] === 0 || counts[o] === 0) continue;
    const rA = sums[b] / counts[b];
    const rB = sums[o] / counts[o];
    out.push(rA + rB);
  }

  return new Float32Array(out);
}

function buildAngleRadiusProfile(points, cx, cy, requestedBins = 360, radiusRange = null) {
  let bins = Math.max(72, Math.floor(requestedBins));
  if (bins % 2 !== 0) bins += 1;

  const twoPi = Math.PI * 2;
  const sums = new Float64Array(bins);
  const counts = new Uint32Array(bins);

  for (let i = 0; i < points.length; i += 3) {
    const dx = points[i] - cx;
    const dy = points[i + 1] - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (radiusRange && (r < radiusRange.min || r > radiusRange.max)) continue;
    let a = Math.atan2(dy, dx);
    if (a < 0) a += twoPi;
    let b = Math.floor((a / twoPi) * bins);
    if (b >= bins) b = bins - 1;
    sums[b] += r;
    counts[b] += 1;
  }

  const angles = new Float32Array(bins + 1);
  const radii = new Float32Array(bins + 1);
  let covered = 0;
  for (let b = 0; b < bins; b += 1) {
    angles[b] = (360 * b) / bins;
    if (counts[b] > 0) {
      radii[b] = sums[b] / counts[b];
      covered += 1;
    } else {
      radii[b] = NaN;
    }
  }
  angles[bins] = 360;
  radii[bins] = radii[0];

  return {
    angles,
    radii,
    bins,
    coveredBins: covered,
    coveredPct: (100 * covered) / bins,
  };
}

// Least-squares optimal scale factor from rotationally-aligned profiles.
// Minimises Σ(gws[i] - stl[i]*k)²  →  k = Σ(stl·gws) / Σ(stl²)
function computeOptimalScale(gwsAlignedRadii, stlRadii, bins) {
  let num = 0;
  let den = 0;
  for (let i = 0; i < bins; i += 1) {
    const g = gwsAlignedRadii[i];
    const s = stlRadii[i];
    if (!Number.isFinite(g) || !Number.isFinite(s) || s === 0) continue;
    num += s * g;
    den += s * s;
  }
  return den > 0 ? num / den : 1;
}

function alignAngleProfiles(referenceProfile, targetProfile) {
  const refR = referenceProfile?.radii;
  const tgtR = targetProfile?.radii;
  const bins = Math.min(referenceProfile?.bins || 0, targetProfile?.bins || 0);
  if (!refR?.length || !tgtR?.length || bins < 8) {
    return {
      profile: referenceProfile,
      shiftBins: 0,
      shiftDeg: 0,
      rmse: NaN,
      overlapCount: 0,
    };
  }

  let bestShift = 0;
  let bestErr = Infinity;
  let bestCount = 0;

  for (let shift = 0; shift < bins; shift += 1) {
    let err = 0;
    let count = 0;
    for (let i = 0; i < bins; i += 1) {
      const a = refR[(i + shift) % bins];
      const b = tgtR[i];
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const d = a - b;
      err += d * d;
      count += 1;
    }
    if (count === 0) continue;
    const mse = err / count;
    if (mse < bestErr) {
      bestErr = mse;
      bestShift = shift;
      bestCount = count;
    }
  }

  const alignedRadii = new Float32Array(bins + 1);
  for (let i = 0; i < bins; i += 1) alignedRadii[i] = refR[(i + bestShift) % bins];
  alignedRadii[bins] = alignedRadii[0];

  return {
    profile: {
      ...referenceProfile,
      radii: alignedRadii,
    },
    shiftBins: bestShift,
    shiftDeg: (360 * bestShift) / bins,
    rmse: Math.sqrt(bestErr),
    overlapCount: bestCount,
  };
}

function sampleCircularLinear(values, idx, n) {
  let x = idx;
  while (x < 0) x += n;
  while (x >= n) x -= n;
  const i0 = Math.floor(x);
  const i1 = (i0 + 1) % n;
  const t = x - i0;
  const v0 = values[i0];
  const v1 = values[i1];
  if (!Number.isFinite(v0) || !Number.isFinite(v1)) return NaN;
  return v0 + (v1 - v0) * t;
}

// Strict optimisation: jointly optimise fractional angular shift and scale factor.
function alignAndScaleStrict(referenceProfile, targetProfile, subStepsPerBin = 20) {
  const refR = referenceProfile?.radii;
  const tgtR = targetProfile?.radii;
  const bins = Math.min(referenceProfile?.bins || 0, targetProfile?.bins || 0);
  if (!refR?.length || !tgtR?.length || bins < 8) {
    return {
      alignedProfile: referenceProfile,
      shiftBins: 0,
      shiftDeg: 0,
      scaleFactor: 1,
      rmse: NaN,
      overlapCount: 0,
    };
  }

  let bestShift = 0;
  let bestScale = 1;
  let bestRmse = Infinity;
  let bestCount = 0;
  const sub = Math.max(1, Math.floor(subStepsPerBin));
  const totalSteps = bins * sub;

  for (let s = 0; s < totalSteps; s += 1) {
    const shift = s / sub;

    let num = 0;
    let den = 0;
    let count = 0;
    for (let i = 0; i < bins; i += 1) {
      const g = sampleCircularLinear(refR, i + shift, bins);
      const t = tgtR[i];
      if (!Number.isFinite(g) || !Number.isFinite(t) || t === 0) continue;
      num += t * g;
      den += t * t;
      count += 1;
    }
    if (count === 0 || den <= 0) continue;

    const k = num / den;
    let err = 0;
    for (let i = 0; i < bins; i += 1) {
      const g = sampleCircularLinear(refR, i + shift, bins);
      const t = tgtR[i];
      if (!Number.isFinite(g) || !Number.isFinite(t)) continue;
      const d = g - t * k;
      err += d * d;
    }
    const rmse = Math.sqrt(err / count);
    if (rmse < bestRmse) {
      bestRmse = rmse;
      bestShift = shift;
      bestScale = k;
      bestCount = count;
    }
  }

  const alignedRadii = new Float32Array(bins + 1);
  for (let i = 0; i < bins; i += 1) {
    alignedRadii[i] = sampleCircularLinear(refR, i + bestShift, bins);
  }
  alignedRadii[bins] = alignedRadii[0];

  return {
    alignedProfile: {
      ...referenceProfile,
      radii: alignedRadii,
    },
    shiftBins: bestShift,
    shiftDeg: (360 * bestShift) / bins,
    scaleFactor: bestScale,
    rmse: bestRmse,
    overlapCount: bestCount,
  };
}

function scaleAngleProfile(profile, factor) {
  const src = profile?.radii;
  if (!src?.length) return profile;
  const scaled = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 1) {
    const v = src[i];
    scaled[i] = Number.isFinite(v) ? v * factor : NaN;
  }
  return {
    ...profile,
    radii: scaled,
  };
}

function finiteMean(values) {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    sum += v;
    n += 1;
  }
  return n > 0 ? sum / n : NaN;
}

function meanStdFinite(values) {
  let n = 0;
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    sum += v;
    n += 1;
  }
  const mean = n > 0 ? sum / n : NaN;
  let varSum = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    const d = v - mean;
    varSum += d * d;
  }
  const sigma = n > 1 ? Math.sqrt(varSum / (n - 1)) : NaN;
  return { mean, sigma, count: n };
}

function filterBySigma(values, sigmaMultiplier = 3) {
  const stats = meanStdFinite(values);
  if (!Number.isFinite(stats.mean) || !Number.isFinite(stats.sigma) || stats.count < 3) {
    return {
      filtered: values,
      min: -Infinity,
      max: Infinity,
      stats,
      keptCount: values.length,
      droppedCount: 0,
    };
  }

  const min = stats.mean - sigmaMultiplier * stats.sigma;
  const max = stats.mean + sigmaMultiplier * stats.sigma;
  const kept = [];
  let dropped = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (!Number.isFinite(v)) {
      dropped += 1;
      continue;
    }
    if (v < min || v > max) {
      dropped += 1;
      continue;
    }
    kept.push(v);
  }
  return {
    filtered: new Float32Array(kept),
    min,
    max,
    stats,
    keptCount: kept.length,
    droppedCount: dropped,
  };
}

function rollingMaxCircular(values, f) {
  const n = values.length - 1;
  const out = new Float32Array(values.length);
  if (n <= 0) return out;

  const win = Math.max(1, Math.floor(f));
  const left = Math.floor((win - 1) / 2);
  const right = win - 1 - left;

  for (let i = 0; i < n; i += 1) {
    let maxV = -Infinity;
    let found = false;
    for (let k = -left; k <= right; k += 1) {
      let j = i + k;
      while (j < 0) j += n;
      while (j >= n) j -= n;
      const v = values[j];
      if (!Number.isFinite(v)) continue;
      if (v > maxV) maxV = v;
      found = true;
    }
    out[i] = found ? maxV : NaN;
  }
  out[n] = out[0];
  return out;
}

function rollingAverageCircular(values, f) {
  const n = values.length - 1;
  const out = new Float32Array(values.length);
  if (n <= 0) return out;

  const win = Math.max(1, Math.floor(f));
  const left = Math.floor((win - 1) / 2);
  const right = win - 1 - left;

  for (let i = 0; i < n; i += 1) {
    let sum = 0;
    let count = 0;
    for (let k = -left; k <= right; k += 1) {
      let j = i + k;
      while (j < 0) j += n;
      while (j >= n) j -= n;
      const v = values[j];
      if (!Number.isFinite(v)) continue;
      sum += v;
      count += 1;
    }
    out[i] = count > 0 ? sum / count : NaN;
  }
  out[n] = out[0];
  return out;
}

function smoothAngleProfile(profile, f, method = "avg") {
  if (!profile?.radii?.length) return profile;
  const fn = method === "max" ? rollingMaxCircular : rollingAverageCircular;
  return {
    ...profile,
    radii: fn(profile.radii, f),
  };
}

function drawAngleRadiusPlot(canvasEl, statsEl, gwsProfile, stlProfile, options = {}) {
  const gwsR = gwsProfile?.radii;
  const stlR = stlProfile?.radii;
  const thirdProfile = options.thirdProfile || null;
  const thirdR = thirdProfile?.radii || null;
  if (!gwsR?.length || !stlR?.length) {
    statsEl.textContent = "No angle-radius profile data.";
    return;
  }

  let minR = Infinity;
  let maxR = -Infinity;
  const scan = (arr) => {
    for (let i = 0; i < arr.length; i += 1) {
      const v = arr[i];
      if (!Number.isFinite(v)) continue;
      if (v < minR) minR = v;
      if (v > maxR) maxR = v;
    }
  };
  scan(gwsR);
  scan(stlR);
  if (thirdR?.length) scan(thirdR);

  if (!Number.isFinite(minR) || !Number.isFinite(maxR)) {
    statsEl.textContent = "Insufficient angular coverage for radius-vs-angle plot.";
    return;
  }

  const padRng = Math.max((maxR - minR) * 0.08, 1e-6);
  minR -= padRng;
  maxR += padRng;

  const ctx = canvasEl.getContext("2d");
  const width = canvasEl.clientWidth || canvasEl.width;
  const height = Math.max(240, Math.round(width * 0.34));
  canvasEl.width = width;
  canvasEl.height = height;

  const padL = 52;
  const padRt = 14;
  const padT = 20;
  const padB = 36;
  const w = width - padL - padRt;
  const h = height - padT - padB;

  const xToPx = (deg) => padL + (deg / 360) * w;
  const yToPx = (r) => padT + (1 - (r - minR) / Math.max(1e-9, maxR - minR)) * h;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffdf7";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#b9a58b";
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  ctx.strokeStyle = "#d9cfbf";
  for (let i = 0; i <= 4; i += 1) {
    const y = padT + (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(width - padRt, y);
    ctx.stroke();
  }
  for (let i = 0; i <= 8; i += 1) {
    const x = padL + (i / 8) * w;
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + h);
    ctx.stroke();
  }

  const drawSeries = (angles, radii, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    let open = false;
    for (let i = 0; i < radii.length; i += 1) {
      const r = radii[i];
      if (!Number.isFinite(r)) {
        open = false;
        continue;
      }
      const x = xToPx(angles[i]);
      const y = yToPx(r);
      if (!open) {
        ctx.moveTo(x, y);
        open = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  drawSeries(gwsProfile.angles, gwsProfile.radii, "#0f766e");
  drawSeries(stlProfile.angles, stlProfile.radii, "#b45309");
  if (thirdProfile?.angles?.length && thirdR?.length) {
    drawSeries(thirdProfile.angles, thirdR, options.thirdColor || "#6b7280");
  }

  const gwsLabel = options.gwsLabel || "GWS";
  const rhsLabel = options.stlLabel || "STL";
  const thirdLabel = options.thirdLabel || "STL Unscaled";
  const legendItems = [
    { label: gwsLabel, color: "#0f766e" },
    { label: rhsLabel, color: "#b45309" },
  ];
  if (thirdProfile?.angles?.length && thirdR?.length) {
    legendItems.push({ label: thirdLabel, color: options.thirdColor || "#6b7280" });
  }
  ctx.save();
  ctx.font = "bold 12px Segoe UI";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (let i = 0; i < legendItems.length; i += 1) {
    const y = padT + 12 + i * 16;
    ctx.strokeStyle = legendItems[i].color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(padL + 8, y);
    ctx.lineTo(padL + 28, y);
    ctx.stroke();
    ctx.fillStyle = legendItems[i].color;
    ctx.fillText(legendItems[i].label, padL + 34, y);
  }
  ctx.restore();

  ctx.fillStyle = "#5e4f3f";
  ctx.font = "13px Segoe UI";
  ctx.textAlign = "center";
  for (let i = 0; i <= 8; i += 1) {
    const deg = i * 45;
    ctx.fillText(`${deg}\u00b0`, xToPx(deg), height - 9);
  }

  const gwsMean = finiteMean(gwsProfile.radii);
  const stlMean = finiteMean(stlProfile.radii);
  const defaultStatsLines = [
    `GWS angular offset applied: ${gwsProfile.shiftDeg?.toFixed(1) || "0.0"}\u00b0  |  Fit RMSE: ${Number.isFinite(gwsProfile.fitRmse) ? gwsProfile.fitRmse.toFixed(6) : "--"} in  |  Overlap bins: ${gwsProfile.overlapCount || 0}`,
    `GWS coverage: ${gwsProfile.coveredBins}/${gwsProfile.bins} bins (${gwsProfile.coveredPct.toFixed(1)}%)`,
    `${rhsLabel} coverage: ${stlProfile.coveredBins}/${stlProfile.bins} bins (${stlProfile.coveredPct.toFixed(1)}%)`,
    `GWS mean radius over covered bins: ${gwsMean.toFixed(6)} in`,
    `${rhsLabel} mean radius over covered bins: ${stlMean.toFixed(6)} in`,
  ];
  statsEl.textContent = (options.statsLines || defaultStatsLines).join("\n");

  registerChartRange(canvasEl, {
    minX: 0,
    maxX: 360,
    padL,
    chartW: w,
    minY: minR,
    maxY: maxR,
    padT,
    chartH: h,
    labelFn: (xValue, yValue) => `${xValue.toFixed(1)}\u00b0 | ${yValue.toFixed(5)} in`,
  });
}

function updateSmoothedAngleRadiusPlot() {
  const src = state.angleProfilesForSmoothing;
  if (!src?.gwsRaw || !src?.stlScaled || !src?.stlUnscaled) {
    ui.smoothedAngleRadiusStats.textContent = "Run analysis to populate chart.";
    return;
  }

  const fRaw = Number(ui.smoothWindowF.value);
  const f = Math.max(1, Math.min(360, Number.isFinite(fRaw) ? Math.floor(fRaw) : 1));
  if (String(f) !== ui.smoothWindowF.value) ui.smoothWindowF.value = String(f);

  const gwsSmoothRaw = smoothAngleProfile(src.gwsRaw, f, "avg");
  const stlSmoothScaled = smoothAngleProfile(src.stlScaled, f, "max");
  const stlSmoothUnscaled = smoothAngleProfile(src.stlUnscaled, f, "max");
  const aligned = alignAngleProfiles(gwsSmoothRaw, stlSmoothScaled);
  const gwsSmooth = {
    ...aligned.profile,
    shiftDeg: aligned.shiftDeg,
    fitRmse: aligned.rmse,
    overlapCount: aligned.overlapCount,
  };

  const gwsStats = meanStdFinite(gwsSmooth.radii);
  const stlScaledStats = meanStdFinite(stlSmoothScaled.radii);
  const stlUnscaledStats = meanStdFinite(stlSmoothUnscaled.radii);

  let offSum = 0;
  let offCount = 0;
  for (let i = 0; i < gwsSmooth.radii.length; i += 1) {
    const g = gwsSmooth.radii[i];
    const u = stlSmoothUnscaled.radii[i];
    if (!Number.isFinite(g) || !Number.isFinite(u)) continue;
    offSum += (g - u);
    offCount += 1;
  }
  const avgOffset = offCount > 0 ? offSum / offCount : NaN;
  const scalePct = ((src.scaleFactor || 1) - 1) * 100;

  drawAngleRadiusPlot(
    ui.smoothedAngleRadiusPlot,
    ui.smoothedAngleRadiusStats,
    gwsSmooth,
    stlSmoothScaled,
    {
      gwsLabel: "GWS (Smoothed)",
      stlLabel: "Smoothed Scaled STL",
      thirdProfile: stlSmoothUnscaled,
      thirdColor: "#6b7280",
      thirdLabel: "Smoothed Unscaled STL",
      statsLines: [
        `Windowed smoothing: GWS=rolling-average(F=${f}), STL=rolling-max(F=${f})`,
        `GWS angular offset applied: ${gwsSmooth.shiftDeg?.toFixed(1) || "0.0"}\u00b0  |  Fit RMSE: ${Number.isFinite(gwsSmooth.fitRmse) ? gwsSmooth.fitRmse.toFixed(6) : "--"} in  |  Overlap bins: ${gwsSmooth.overlapCount || 0}`,
        `Scale values: GWS=1.00000000  |  STL Unscaled=1.00000000  |  STL Scaled=${(src.scaleFactor || 1).toFixed(8)}`,
        `Scale factor percent (STL Scaled vs GWS): ${Number.isFinite(scalePct) ? scalePct.toFixed(4) : "--"}%`,
        `Average offset (GWS - Unscaled STL, smoothed): ${Number.isFinite(avgOffset) ? avgOffset.toFixed(6) : "--"} in  |  bins used: ${offCount}`,
        `GWS mean radius (all plotted points): ${Number.isFinite(gwsStats.mean) ? gwsStats.mean.toFixed(6) : "--"} in  |  -3\u03c3: ${Number.isFinite(gwsStats.mean - 3 * gwsStats.sigma) ? (gwsStats.mean - 3 * gwsStats.sigma).toFixed(6) : "--"} in  |  +3\u03c3: ${Number.isFinite(gwsStats.mean + 3 * gwsStats.sigma) ? (gwsStats.mean + 3 * gwsStats.sigma).toFixed(6) : "--"} in`,
        `Scaled STL mean radius (all plotted points): ${Number.isFinite(stlScaledStats.mean) ? stlScaledStats.mean.toFixed(6) : "--"} in  |  -3\u03c3: ${Number.isFinite(stlScaledStats.mean - 3 * stlScaledStats.sigma) ? (stlScaledStats.mean - 3 * stlScaledStats.sigma).toFixed(6) : "--"} in  |  +3\u03c3: ${Number.isFinite(stlScaledStats.mean + 3 * stlScaledStats.sigma) ? (stlScaledStats.mean + 3 * stlScaledStats.sigma).toFixed(6) : "--"} in`,
        `Unscaled STL mean radius (all plotted points): ${Number.isFinite(stlUnscaledStats.mean) ? stlUnscaledStats.mean.toFixed(6) : "--"} in  |  -3\u03c3: ${Number.isFinite(stlUnscaledStats.mean - 3 * stlUnscaledStats.sigma) ? (stlUnscaledStats.mean - 3 * stlUnscaledStats.sigma).toFixed(6) : "--"} in  |  +3\u03c3: ${Number.isFinite(stlUnscaledStats.mean + 3 * stlUnscaledStats.sigma) ? (stlUnscaledStats.mean + 3 * stlUnscaledStats.sigma).toFixed(6) : "--"} in`,
      ],
    },
  );
}

function fitSphereLeastSquares(points) {
  const n = points.length / 3;
  if (n < 20) return null;

  const ata = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const atb = [0, 0, 0, 0];

  for (let i = 0; i < points.length; i += 3) {
    const x = points[i];
    const y = points[i + 1];
    const z = points[i + 2];
    const row = [x, y, z, 1];
    const rhs = -(x * x + y * y + z * z);
    for (let r = 0; r < 4; r += 1) {
      atb[r] += row[r] * rhs;
      for (let c = 0; c < 4; c += 1) ata[r][c] += row[r] * row[c];
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
  for (let i = 0; i < points.length; i += 3) {
    const dx = points[i] - cx;
    const dy = points[i + 1] - cy;
    const dz = points[i + 2] - cz;
    sumR += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  return {
    center: new THREE.Vector3(cx, cy, cz),
    avgRadius: sumR / n,
  };
}

function alignStl(points, center) {
  const n = points.length / 3;
  const centroid = new THREE.Vector3();
  for (let i = 0; i < points.length; i += 3) centroid.add(new THREE.Vector3(points[i], points[i + 1], points[i + 2]));
  centroid.multiplyScalar(1 / Math.max(1, n));

  const axis = centroid.clone().sub(center);
  if (axis.lengthSq() < 1e-10) axis.set(0, 0, 1);
  axis.normalize();

  const q = new THREE.Quaternion().setFromUnitVectors(axis, new THREE.Vector3(0, 0, 1));
  const out = new Float32Array(points.length);

  for (let i = 0; i < points.length; i += 3) {
    const p = new THREE.Vector3(points[i], points[i + 1], points[i + 2]).sub(center).applyQuaternion(q);
    out[i] = p.x;
    out[i + 1] = p.y;
    out[i + 2] = p.z;
  }

  return { points: out, axisOriginal: axis };
}

function degToRad(v) {
  return (v * Math.PI) / 180;
}

function buildManualRotationQuat() {
  const rx = Number(ui.rotXDeg.value);
  const ry = Number(ui.rotYDeg.value);
  const x = Number.isFinite(rx) ? degToRad(rx) : 0;
  const y = Number.isFinite(ry) ? degToRad(ry) : 0;
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, 0, "XYZ"));
}

function applyRotationToPoints(points, quat) {
  const out = new Float32Array(points.length);
  const p = new THREE.Vector3();
  for (let i = 0; i < points.length; i += 3) {
    p.set(points[i], points[i + 1], points[i + 2]).applyQuaternion(quat);
    out[i] = p.x;
    out[i + 1] = p.y;
    out[i + 2] = p.z;
  }
  return out;
}

function centerPoints(points, center) {
  const out = new Float32Array(points.length);
  for (let i = 0; i < points.length; i += 3) {
    out[i] = points[i] - center.x;
    out[i + 1] = points[i + 1] - center.y;
    out[i + 2] = points[i + 2] - center.z;
  }
  return out;
}

function removeObj(key) {
  if (!state[key]) return;
  scene.remove(state[key]);
  state[key].traverse?.((obj) => {
    obj.geometry?.dispose?.();
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
    else obj.material?.dispose?.();
  });
  state[key].geometry?.dispose?.();
  if (Array.isArray(state[key].material)) state[key].material.forEach((m) => m?.dispose?.());
  else state[key].material?.dispose?.();
  state[key] = null;
}

function buildPointCloud(key, points, colorHex, size, opacity) {
  removeObj(key);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(points, 3));
  const mat = new THREE.PointsMaterial({ size, sizeAttenuation: false, color: colorHex, transparent: true, opacity });
  const obj = new THREE.Points(geom, mat);
  state[key] = obj;
  scene.add(obj);
}

function buildSliceBand(zCenter, halfBand, bounds) {
  removeObj("sliceBandObj");
  const w = Math.max(bounds.size.x, bounds.size.y) * 1.2;
  const h = Math.max(halfBand * 2, 1e-4);
  const geom = new THREE.BoxGeometry(w, w, h);
  const mat = new THREE.MeshBasicMaterial({ color: 0xe09a2f, transparent: true, opacity: 0.15, depthWrite: false });
  const slab = new THREE.Mesh(geom, mat);
  slab.position.set(0, 0, zCenter);
  state.sliceBandObj = slab;
  scene.add(slab);
}

function buildRefineBand(zMin, zMax, bounds) {
  removeObj("refineBandObj");
  const lo = Math.min(zMin, zMax);
  const hi = Math.max(zMin, zMax);
  const w = Math.max(bounds.size.x, bounds.size.y) * 1.25;
  const h = Math.max(hi - lo, 1e-4);
  const geom = new THREE.BoxGeometry(w, w, h);
  const mat = new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.12, depthWrite: false });
  const slab = new THREE.Mesh(geom, mat);
  slab.position.set(0, 0, (lo + hi) * 0.5);
  state.refineBandObj = slab;
  scene.add(slab);
}

function buildAxisLine() {
  removeObj("axisObj");
  const points = [new THREE.Vector3(0, 0, -2), new THREE.Vector3(0, 0, 2)];
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineDashedMaterial({ color: 0x1f66db, dashSize: 0.08, gapSize: 0.05 });
  const line = new THREE.Line(geom, mat);
  line.computeLineDistances();
  state.axisObj = line;
  scene.add(line);
}

function makeAxisLabelSprite(text, color) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.beginPath();
  ctx.arc(64, 64, 46, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 252, 245, 0.92)";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "bold 52px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 66);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  return sprite;
}

function buildAxesWithLabels(bounds) {
  removeObj("axesHelperObj");
  removeObj("axisLabelsObj");
  const axisLen = Math.max(bounds.size.x, bounds.size.y, bounds.size.z, 0.2) * 0.7;

  const axes = new THREE.AxesHelper(axisLen);
  state.axesHelperObj = axes;
  scene.add(axes);

  const labels = new THREE.Group();
  const xLabel = makeAxisLabelSprite("X", "#d62828");
  const yLabel = makeAxisLabelSprite("Y", "#2a9d8f");
  const zLabel = makeAxisLabelSprite("Z", "#1d4ed8");
  const s = axisLen * 0.12;
  xLabel.scale.setScalar(s);
  yLabel.scale.setScalar(s);
  zLabel.scale.setScalar(s);
  xLabel.position.set(axisLen * 1.08, 0, 0);
  yLabel.position.set(0, axisLen * 1.08, 0);
  zLabel.position.set(0, 0, axisLen * 1.08);
  labels.add(xLabel, yLabel, zLabel);
  state.axisLabelsObj = labels;
  scene.add(labels);
}

function initHoverMarker() {
  removeObj("hoverMarkerObj");
  const geom = new THREE.SphereGeometry(0.01, 18, 18);
  const mat = new THREE.MeshBasicMaterial({ color: 0x111827, transparent: true, opacity: 0.95 });
  const marker = new THREE.Mesh(geom, mat);
  marker.visible = false;
  state.hoverMarkerObj = marker;
  scene.add(marker);
}

function updatePickTargets() {
  state.pickTargets = [state.stlSliceObj, state.stlPointsObj].filter(Boolean);
}

function setHoverAtPoint(v, radius) {
  if (!state.hoverMarkerObj) return;
  state.hoverMarkerObj.visible = true;
  state.hoverMarkerObj.position.copy(v);
  state.hoverMarkerObj.scale.setScalar(Math.max(radius * 0.015, 0.0015));
  state.hoveredPoint = v.clone();
  setCursorReadout(v.x, v.y, v.z);
}

function clearHover() {
  if (state.hoverMarkerObj) state.hoverMarkerObj.visible = false;
  state.hoveredPoint = null;
  setCursorReadout(NaN, NaN, NaN);
}

function updateCursorPickFromEvent(ev) {
  if (!state.pickTargets.length) {
    clearHover();
    return;
  }
  const rect = renderer.domElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  state.mouseNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  state.mouseNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.mouseNdc, camera);
  const radius = Math.max(state.stlBounds?.size.length() || 1, 1e-4);
  state.raycaster.params.Points.threshold = radius * 0.012;

  const hits = state.raycaster.intersectObjects(state.pickTargets, false);
  if (!hits.length) {
    clearHover();
    return;
  }

  const hit = hits[0];
  const p = hit.point;
  setHoverAtPoint(p, radius);
}

function fitCamera(bounds) {
  controls.target.copy(bounds.center);
  const r = Math.max(bounds.size.x, bounds.size.y, bounds.size.z) * 0.8;
  camera.position.copy(bounds.center.clone().add(new THREE.Vector3(1, 0.9, 1.1).normalize().multiplyScalar(Math.max(r * 2.2, 0.5))));
  controls.update();
}

function computeSlice(points, zCenter, halfBand) {
  const idx = [];
  for (let i = 0; i < points.length; i += 3) {
    const z = points[i + 2];
    if (Math.abs(z - zCenter) <= halfBand) {
      idx.push(i / 3);
    }
  }

  if (idx.length < 10) return null;

  const slicePts = new Float32Array(idx.length * 3);
  for (let k = 0; k < idx.length; k += 1) {
    const p = idx[k] * 3;
    const x = points[p];
    const y = points[p + 1];
    const z = points[p + 2];
    slicePts[k * 3] = x;
    slicePts[k * 3 + 1] = y;
    slicePts[k * 3 + 2] = z;
  }

  const fit2d = fitCircle2D(slicePts);
  if (!fit2d) return null;

  const cx = fit2d.center.x;
  const cy = fit2d.center.y;
  const radii = fit2d.radii;
  const diameters = buildOppositePairDiameters(slicePts, cx, cy);
  if (diameters.length < 10) return null;

  return {
    radii,
    diameters,
    centerXY: { x: cx, y: cy },
    points: slicePts,
    count: idx.length,
    diameterPairCount: diameters.length,
  };
}

function computeSliceAdaptive(points, zCenter, requestedHalfBand, bounds) {
  const minBand = Math.max(1e-5, requestedHalfBand);
  const zExtent = bounds ? Math.max(1e-5, bounds.size.z) : minBand * 10;
  const maxBand = Math.max(minBand, zExtent * 0.48);

  let band = minBand;
  let slice = computeSlice(points, zCenter, band);
  while (!slice && band < maxBand) {
    band = Math.min(maxBand, band * 1.5);
    slice = computeSlice(points, zCenter, band);
  }

  if (!slice) return null;
  return {
    ...slice,
    requestedHalfBand: requestedHalfBand,
    usedHalfBand: band,
    bandExpanded: band > minBand + 1e-12,
  };
}

function filterRawByAlignedZRange(rawPoints, center, zMin, zMax) {
  const alignedBase = alignStl(rawPoints, center).points;
  const aligned = applyRotationToPoints(alignedBase, buildManualRotationQuat());
  const lo = Math.min(zMin, zMax);
  const hi = Math.max(zMin, zMax);
  const kept = [];
  for (let i = 0; i < aligned.length; i += 3) {
    const z = aligned[i + 2];
    if (z < lo || z > hi) continue;
    kept.push(rawPoints[i], rawPoints[i + 1], rawPoints[i + 2]);
  }
  return new Float32Array(kept);
}

function meanStd(values) {
  const n = values.length;
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += values[i];
  const mean = sum / Math.max(1, n);
  let varSum = 0;
  for (let i = 0; i < n; i += 1) {
    const d = values[i] - mean;
    varSum += d * d;
  }
  return { mean, sigma: Math.sqrt(varSum / Math.max(1, n - 1)) };
}

function median(values) {
  const arr = Array.from(values).sort((a, b) => a - b);
  if (arr.length === 0) return NaN;
  const m = Math.floor(arr.length / 2);
  return arr.length % 2 === 0 ? (arr[m - 1] + arr[m]) * 0.5 : arr[m];
}

function hist(values, minV, maxV, bins) {
  const out = new Float32Array(bins);
  const range = Math.max(1e-9, maxV - minV);
  let inCount = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (v < minV || v > maxV) continue;
    const t = (v - minV) / range;
    const idx = Math.max(0, Math.min(bins - 1, Math.floor(t * bins)));
    out[idx] += 1;
    inCount += 1;
  }
  if (inCount === 0) return out;
  for (let i = 0; i < bins; i += 1) out[i] /= inCount;
  return out;
}

function modeFromHist(h, minV, maxV) {
  let idx = 0;
  let best = h[0] ?? 0;
  for (let i = 1; i < h.length; i += 1) {
    if (h[i] > best) {
      best = h[i];
      idx = i;
    }
  }
  const w = (maxV - minV) / h.length;
  return minV + (idx + 0.5) * w;
}

function drawLine(ctx, x, top, bottom, color, dash) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  ctx.restore();
}

function drawLineIfInRange(ctx, xToPx, minV, maxV, value, top, bottom, color, dash) {
  if (value < minV || value > maxV) return;
  drawLine(ctx, xToPx(value), top, bottom, color, dash);
}

function drawYAxisTicks(ctx, padL, padT, plotH, minY, maxY, tickCount, formatFn) {
  ctx.save();
  ctx.fillStyle = "#5e4f3f";
  ctx.font = "12px Segoe UI";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= tickCount; i += 1) {
    const t = i / Math.max(1, tickCount);
    const y = padT + t * plotH;
    const v = maxY - t * (maxY - minY);
    const label = formatFn ? formatFn(v) : v.toFixed(4);
    ctx.fillText(label, padL - 6, y);
  }
  ctx.restore();
}

function drawSingleHist(canvasEl, statsEl, label, vals, fillColor, lineColor) {
  if (!vals?.length) {
    statsEl.textContent = "No data.";
    return;
  }
  const stats = meanStd(vals);
  const med = median(vals);

  let minV = Infinity;
  let maxV = -Infinity;
  for (const v of vals) {
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  const pad = 2 * Math.max(stats.sigma, 1e-6);
  minV -= pad;
  maxV += pad;

  const bins = 40;
  const h = hist(vals, minV, maxV, bins);
  const mode = modeFromHist(h, minV, maxV);

  const ctx = canvasEl.getContext("2d");
  const width = canvasEl.clientWidth || canvasEl.width;
  const height = Math.max(240, Math.round(width * 0.36));
  canvasEl.width = width;
  canvasEl.height = height;

  const padL = 48;
  const padR = 16;
  const padT = 38;
  const padB = 34;
  const w = width - padL - padR;
  const hh = height - padT - padB;

  let yMax = 1e-6;
  for (let i = 0; i < bins; i += 1) if (h[i] > yMax) yMax = h[i];
  yMax *= 1.15;

  const xToPx = (v) => padL + ((v - minV) / Math.max(1e-9, maxV - minV)) * w;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffdf7";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#b9a58b";
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  ctx.strokeStyle = "#d9cfbf";
  for (let i = 0; i <= 4; i += 1) {
    const y = padT + (i / 4) * hh;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(width - padR, y);
    ctx.stroke();
  }

  drawYAxisTicks(ctx, padL, padT, hh, 0, yMax, 4, (v) => v.toFixed(3));

  const bw = w / bins;
  ctx.fillStyle = fillColor;
  for (let i = 0; i < bins; i += 1) {
    const barH = (h[i] / yMax) * hh;
    ctx.fillRect(padL + i * bw, padT + hh - barH, bw - 1, barH);
  }

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i < bins; i += 1) {
    const x = padL + (i + 0.5) * bw;
    const y = padT + (1 - h[i] / yMax) * hh;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Vertical lines: mean(solid), median(dashed), mode(dotted), and +/- 3 sigma
  drawLine(ctx, xToPx(stats.mean), padT, padT + hh, lineColor, []);
  drawLine(ctx, xToPx(med),        padT, padT + hh, lineColor, [6, 3]);
  drawLine(ctx, xToPx(mode),       padT, padT + hh, lineColor, [2, 4]);
  drawLineIfInRange(ctx, xToPx, minV, maxV, stats.mean - 3 * stats.sigma, padT, padT + hh, lineColor, [8, 4]);
  drawLineIfInRange(ctx, xToPx, minV, maxV, stats.mean + 3 * stats.sigma, padT, padT + hh, lineColor, [8, 4]);

  // Label tags at top of each line, staggered vertically
  ctx.font = "bold 11px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillStyle = lineColor;
  ctx.fillText("Mn", xToPx(stats.mean), padT - 24);
  ctx.fillText("Md", xToPx(med),        padT - 13);
  ctx.fillText("Mo", xToPx(mode),       padT - 2);

  // X axis labels
  ctx.fillStyle = "#5e4f3f";
  ctx.font = "13px Segoe UI";
  ctx.textAlign = "center";
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8;
    const x = padL + t * w;
    const v = minV + t * (maxV - minV);
    ctx.fillText(v.toFixed(4), x, height - 8);
  }

  statsEl.textContent = [
    `${label} — mean:   ${stats.mean.toFixed(6)} in`,
    `${label} — median: ${med.toFixed(6)} in`,
    `${label} — mode:   ${mode.toFixed(6)} in`,
    `Std dev (\u03c3): ${stats.sigma.toFixed(6)} in`,
    `Count: ${vals.length.toLocaleString()}`,
  ].join("\n");

  registerChartRange(canvasEl, {
    minX: minV,
    maxX: maxV,
    padL,
    chartW: w,
    minY: 0,
    maxY: yMax,
    padT,
    chartH: hh,
    labelFn: (xValue, yValue) => `X: ${xValue.toFixed(5)} in | Y: ${yValue.toFixed(5)}`,
  });
}

function buildDiameterResults(stlSlice, gwsFit2D) {
  const zCenter = Number(ui.zTarget.value);
  const zBandRequested = Math.max(1e-5, Number(ui.zBand.value));
  const zBandUsed = Math.max(1e-5, stlSlice.usedHalfBand || zBandRequested);

  // GWS: full circle, all points, 2D radii from best-fit center
  const gwsRadii = gwsFit2D.radii;
  const gwsDiameters = buildOppositePairDiameters(state.gwsRaw, gwsFit2D.center.x, gwsFit2D.center.y);
  if (gwsDiameters.length < 10) {
    throw new Error("Not enough opposite-angle point coverage in GWS data to compute paired-radii diameters.");
  }

  // STL: Z slice radii filtered to within +/-3 sigma
  const stlRadiusFilter = filterBySigma(stlSlice.radii, 3);
  const stlRadii = stlRadiusFilter.filtered;
  if (!stlRadii.length) throw new Error("All STL radius points were filtered out by +/-3 sigma rule.");
  const stlDiameters = stlSlice.diameters;

  const gwsMeanDiam = meanStd(gwsDiameters).mean;
  const stlMeanDiam = meanStd(stlDiameters).mean;
  state.gwsMeanDiameter = gwsMeanDiam;

  // ── STEP 1: Build + smooth angle profiles (used for optimisation) ───────
  const fRaw = Number(ui.smoothWindowF.value);
  const f = Math.max(1, Math.min(360, Number.isFinite(fRaw) ? Math.floor(fRaw) : 1));
  if (String(f) !== ui.smoothWindowF.value) ui.smoothWindowF.value = String(f);

  const gwsAngleProfileRaw = buildAngleRadiusProfile(state.gwsRaw, gwsFit2D.center.x, gwsFit2D.center.y);
  const stlAngleProfileRaw = buildAngleRadiusProfile(
    stlSlice.points,
    stlSlice.centerXY.x,
    stlSlice.centerXY.y,
    360,
    { min: stlRadiusFilter.min, max: stlRadiusFilter.max },
  );
  const gwsAngleProfileForFit = smoothAngleProfile(gwsAngleProfileRaw, f, "avg");
  const stlAngleProfileForFit = smoothAngleProfile(stlAngleProfileRaw, f, "max");

  // ── STEP 2: Strict optimisation (fractional rotation + scale) ────────────
  const strictFit = alignAndScaleStrict(gwsAngleProfileForFit, stlAngleProfileForFit, 20);
  const gwsAngleProfile = {
    ...strictFit.alignedProfile,
    shiftDeg: strictFit.shiftDeg,
    fitRmse: strictFit.rmse,
    overlapCount: strictFit.overlapCount,
  };

  // ── STEP 3: Use strict-fit scale (jointly optimised with rotation) ───────
  const scaleFactor = strictFit.scaleFactor;
  const meanDiamScaleFactor = stlMeanDiam > 0 ? gwsMeanDiam / stlMeanDiam : 1; // kept for reference
  state.scaleFactor = scaleFactor;

  const stlScaledDiam = new Float32Array(stlDiameters.length);
  for (let i = 0; i < stlDiameters.length; i += 1) stlScaledDiam[i] = stlDiameters[i] * scaleFactor;

  drawSingleHist(ui.gwsRadiusHist,  ui.gwsRadiusStats,  "GWS Radius",    gwsRadii,      "rgba(15,118,110,0.32)", "#0f766e");
  drawSingleHist(ui.gwsDiamHist,    ui.gwsDiamStats,    "GWS Diameter",  gwsDiameters,  "rgba(15,118,110,0.32)", "#0f766e");
  drawSingleHist(ui.stlRadiusHist,  ui.stlRadiusStats,  "STL Radius",    stlRadii,      "rgba(180,83,9,0.30)",   "#b45309");
  drawSingleHist(ui.stlDiamHist,    ui.stlDiamStats,    "STL Diameter",  stlDiameters,  "rgba(180,83,9,0.30)",   "#b45309");
  drawHist(ui.overlapRadiusHist, ui.overlapRadiusStats, "GWS Radius", gwsRadii, "STL Radius", stlRadii);
  drawHist(ui.overlapDiamHist,   ui.overlapDiamStats,   "GWS Diameter", gwsDiameters, "STL Diameter", stlDiameters);

  // Plot 1: GWS vs Unscaled STL (rotation already applied above)
  drawAngleRadiusPlot(
    ui.angleRadiusPlot,
    ui.angleRadiusStats,
    gwsAngleProfile,
    stlAngleProfileForFit,
    { stlLabel: "Unscaled STL (Rolling-Max Smoothed)" },
  );

  // ── STEP 4: Apply strict-fit scale and report strict-fit error ───────────
  const stlScaledAngleProfile = scaleAngleProfile(stlAngleProfileForFit, scaleFactor);
  const gwsAlignedScaled = alignAngleProfiles(gwsAngleProfileForFit, stlScaledAngleProfile);
  const gwsAngleProfileScaled = {
    ...gwsAlignedScaled.profile,
    shiftDeg: gwsAlignedScaled.shiftDeg,
    fitRmse: gwsAlignedScaled.rmse,
    overlapCount: gwsAlignedScaled.overlapCount,
  };
  drawAngleRadiusPlot(
    ui.scaledAngleRadiusPlot,
    ui.scaledAngleRadiusStats,
    gwsAngleProfileScaled,
    stlScaledAngleProfile,
    { stlLabel: "Scaled STL (Rolling-Max Smoothed)" },
  );

  state.angleProfilesForSmoothing = {
    gwsRaw: gwsAngleProfileRaw,
    stlScaled: stlScaledAngleProfile,
    stlUnscaled: stlAngleProfileRaw,
    scaleFactor,
  };
  updateSmoothedAngleRadiusPlot();

  drawHist(ui.scaledCompHist, ui.scaledCompStats, "GWS Diameter", gwsDiameters, "STL Scaled Diameter", stlScaledDiam);

  const gwsRStats  = meanStd(gwsRadii);
  const stlRStats  = meanStd(stlRadii);
  const gwsRMed    = median(gwsRadii);
  const stlRMed    = median(stlRadii);
  const gwsDMed    = median(gwsDiameters);
  const stlDMed    = median(stlDiameters);

  setSummary([
    `GWS full-circle analysis (all ${(state.gwsRaw.length / 3).toLocaleString()} points, 2D XY fit, Z ignored)`,
    `  Best-fit center (in): cx=${gwsFit2D.center.x.toFixed(6)}, cy=${gwsFit2D.center.y.toFixed(6)}`,
    `  Radius  — mean: ${gwsRStats.mean.toFixed(6)}  median: ${gwsRMed.toFixed(6)}  \u03c3: ${gwsRStats.sigma.toFixed(6)} in`,
    `  Diameter — mean: ${gwsMeanDiam.toFixed(6)}  median: ${gwsDMed.toFixed(6)} in`,
    ``,
    `STL hemisphere analysis (${(state.stlRaw.length / 3).toLocaleString()} sampled pts, ${state.stlTriCount.toLocaleString()} triangles)`,
    `  Sphere center (raw, in): ${state.stlCenter.x.toFixed(6)}, ${state.stlCenter.y.toFixed(6)}, ${state.stlCenter.z.toFixed(6)}`,
    `  Hemisphere axis (raw):   ${state.stlAxis.x.toFixed(4)}, ${state.stlAxis.y.toFixed(4)}, ${state.stlAxis.z.toFixed(4)}`,
    `  Manual rotation applied: X=${Number(ui.rotXDeg.value).toFixed(3)}\u00b0, Y=${Number(ui.rotYDeg.value).toFixed(3)}\u00b0`,
    `  Z slice: center=${zCenter.toFixed(6)} in, requested half-band=\u00b1${zBandRequested.toFixed(6)} in, used half-band=\u00b1${zBandUsed.toFixed(6)} in`,
    `  Included Z range: ${(zCenter - zBandUsed).toFixed(6)} to ${(zCenter + zBandUsed).toFixed(6)} in`,
    `  Slice points: ${stlSlice.count.toLocaleString()}  |  Opposite-angle diameter pairs: ${stlSlice.diameterPairCount.toLocaleString()}`,
    `  STL radius filter (+/-3\u03c3): kept ${stlRadiusFilter.keptCount.toLocaleString()} / ${stlSlice.radii.length.toLocaleString()} points, dropped ${stlRadiusFilter.droppedCount.toLocaleString()}`,
    `  Radius  — mean: ${stlRStats.mean.toFixed(6)}  median: ${stlRMed.toFixed(6)}  \u03c3: ${stlRStats.sigma.toFixed(6)} in`,
    `  Diameter — mean: ${stlMeanDiam.toFixed(6)}  median: ${stlDMed.toFixed(6)} in`,
    ``,
    `Angular smoothing for optimisation: GWS=rolling-average(F=${f}), STL=rolling-max(F=${f})`,
    `Strict optimisation enabled: fractional-bin rotation + joint LS scaling`,
    `Scale factor (strict joint rotation+scale fit): ${scaleFactor.toFixed(8)}`,
    `  Mean-diameter scale factor (for reference): ${meanDiamScaleFactor.toFixed(8)}`,
    `  Scaled STL mean diameter: ${(stlMeanDiam * scaleFactor).toFixed(6)} in`,
  ].join("\n"));
}

function drawHist(canvasEl, statsEl, aLabel, aVals, bLabel, bVals) {
  if (!aVals?.length || !bVals?.length) {
    statsEl.textContent = "Insufficient slice points for histogram.";
    return;
  }

  const aStats = meanStd(aVals);
  const bStats = meanStd(bVals);
  const aMedian = median(aVals);
  const bMedian = median(bVals);

  let minV = Infinity;
  let maxV = -Infinity;
  for (const v of aVals) {
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  for (const v of bVals) {
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  const pad = 2 * Math.max(aStats.sigma, bStats.sigma, 1e-6);
  minV -= pad;
  maxV += pad;

  const bins = 40;
  const aHist = hist(aVals, minV, maxV, bins);
  const bHist = hist(bVals, minV, maxV, bins);
  const aMode = modeFromHist(aHist, minV, maxV);
  const bMode = modeFromHist(bHist, minV, maxV);

  const ctx = canvasEl.getContext("2d");
  const width = canvasEl.clientWidth || canvasEl.width;
  const height = Math.max(220, Math.round(width * 0.34));
  canvasEl.width = width;
  canvasEl.height = height;

  const padL = 48;
  const padR = 16;
  const padT = 18;
  const padB = 34;
  const w = width - padL - padR;
  const h = height - padT - padB;

  let yMax = 1e-6;
  for (let i = 0; i < bins; i += 1) {
    if (aHist[i] > yMax) yMax = aHist[i];
    if (bHist[i] > yMax) yMax = bHist[i];
  }
  yMax *= 1.15;

  const xToPx = (v) => padL + ((v - minV) / Math.max(1e-9, maxV - minV)) * w;
  const yToPx = (v) => padT + (1 - v / yMax) * h;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffdf7";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#b9a58b";
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  ctx.strokeStyle = "#d9cfbf";
  for (let i = 0; i <= 4; i += 1) {
    const y = padT + (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(width - padR, y);
    ctx.stroke();
  }

  drawYAxisTicks(ctx, padL, padT, h, 0, yMax, 4, (v) => v.toFixed(3));

  const bw = w / bins;
  ctx.fillStyle = "rgba(15, 118, 110, 0.32)";
  for (let i = 0; i < bins; i += 1) {
    const hh = (aHist[i] / yMax) * h;
    ctx.fillRect(padL + i * bw, padT + h - hh, bw - 1, hh);
  }

  ctx.fillStyle = "rgba(180, 83, 9, 0.30)";
  for (let i = 0; i < bins; i += 1) {
    const hh = (bHist[i] / yMax) * h;
    ctx.fillRect(padL + i * bw, padT + h - hh, bw - 1, hh);
  }

  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i < bins; i += 1) {
    const x = padL + (i + 0.5) * bw;
    const y = yToPx(aHist[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = "#b45309";
  ctx.beginPath();
  for (let i = 0; i < bins; i += 1) {
    const x = padL + (i + 0.5) * bw;
    const y = yToPx(bHist[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  drawLine(ctx, xToPx(aStats.mean), padT, padT + h, "#0f766e", []);
  drawLine(ctx, xToPx(aMedian), padT, padT + h, "#0f766e", [6, 2]);
  drawLine(ctx, xToPx(aMode), padT, padT + h, "#0f766e", [2, 3]);
  drawLineIfInRange(ctx, xToPx, minV, maxV, aStats.mean - 3 * aStats.sigma, padT, padT + h, "#0f766e", [8, 4]);
  drawLineIfInRange(ctx, xToPx, minV, maxV, aStats.mean + 3 * aStats.sigma, padT, padT + h, "#0f766e", [8, 4]);
  drawLine(ctx, xToPx(bStats.mean), padT, padT + h, "#b45309", []);
  drawLine(ctx, xToPx(bMedian), padT, padT + h, "#b45309", [6, 2]);
  drawLine(ctx, xToPx(bMode), padT, padT + h, "#b45309", [2, 3]);
  drawLineIfInRange(ctx, xToPx, minV, maxV, bStats.mean - 3 * bStats.sigma, padT, padT + h, "#b45309", [8, 4]);
  drawLineIfInRange(ctx, xToPx, minV, maxV, bStats.mean + 3 * bStats.sigma, padT, padT + h, "#b45309", [8, 4]);

  ctx.fillStyle = "#5e4f3f";
  ctx.font = "14px Segoe UI";
  ctx.textAlign = "center";
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8;
    const x = padL + t * w;
    const v = minV + t * (maxV - minV);
    ctx.fillText(v.toFixed(3), x, height - 8);
  }

  statsEl.textContent = [
    `${aLabel} mean: ${aStats.mean.toFixed(6)} in, median: ${aMedian.toFixed(6)} in, mode: ${aMode.toFixed(6)} in`,
    `${bLabel} mean: ${bStats.mean.toFixed(6)} in, median: ${bMedian.toFixed(6)} in, mode: ${bMode.toFixed(6)} in`,
    `Range used: ${minV.toFixed(6)} to ${maxV.toFixed(6)} in`,
    `Counts (${aLabel} / ${bLabel}): ${aVals.length.toLocaleString()} / ${bVals.length.toLocaleString()}`,
  ].join("\n");

  registerChartRange(canvasEl, {
    minX: minV,
    maxX: maxV,
    padL,
    chartW: w,
    minY: 0,
    maxY: yMax,
    padT,
    chartH: h,
    labelFn: (xValue, yValue) => `X: ${xValue.toFixed(5)} in | Y: ${yValue.toFixed(5)}`,
  });
}

function updateSliceHighlight() {
  if (!state.stlAligned || !state.stlBounds) return null;

  const zCenter = Number(ui.zTarget.value);
  const zBand = Math.max(1e-5, Number(ui.zBand.value));
  const slice = computeSliceAdaptive(state.stlAligned, zCenter, zBand, state.stlBounds);

  if (!slice) {
    removeObj("stlSliceObj");
    removeObj("sliceBandObj");
    return null;
  }

  buildPointCloud("stlSliceObj", slice.points, 0xe09a2f, 4, 0.95);
  buildSliceBand(zCenter, slice.usedHalfBand || zBand, state.stlBounds);
  return slice;
}

async function loadInputs() {
  const gwsFile = ui.gwsInput.files?.[0];
  const stlFile = ui.stlInput.files?.[0];
  if (!gwsFile || !stlFile) throw new Error("Please load both GWS and STL files.");

  const gwsText = await gwsFile.text();
  const gwsParsed = parseGwsText(gwsText);
  state.gwsRaw = scalePointArray(gwsParsed, unitFactorToInches(ui.gwsUnit.value));

  const sampleCount = Number(ui.sampleCount.value) || 60000;
  const stlBuffer = await stlFile.arrayBuffer();
  const stlParsed = parseBinaryStlSample(stlBuffer, sampleCount);
  state.stlTriCount = stlParsed.triCount;
  state.stlRaw = scalePointArray(stlParsed.points, unitFactorToInches(ui.stlUnit.value));
}

function runDiameterAnalysis() {
  if (!state.gwsRaw || !state.stlRaw) return;

  const gwsFit2D = fitCircle2D(state.gwsRaw);
  if (!gwsFit2D) throw new Error("2D circle fit failed for GWS data.");
  state.gwsFit2D = gwsFit2D;

  const stlFit = fitSphereLeastSquares(state.stlRaw);
  if (!stlFit) throw new Error("Sphere fit failed for STL data.");
  state.stlCenter = stlFit.center.clone();

  const aligned = alignStl(state.stlRaw, state.stlCenter);
  state.stlAligned = applyRotationToPoints(aligned.points, buildManualRotationQuat());
  state.stlAxis = aligned.axisOriginal;
  state.stlBounds = computeBounds(state.stlAligned);

  buildPointCloud("stlPointsObj", state.stlAligned, 0x1f66db, 2, 0.55);
  buildAxisLine();
  buildAxesWithLabels(state.stlBounds);
  buildRefineBand(Number(ui.refineZMin.value), Number(ui.refineZMax.value), state.stlBounds);
  fitCamera(state.stlBounds);

  const zCenter = Number(ui.zTarget.value);
  const zBand = Math.max(1e-5, Number(ui.zBand.value));
  const stlSlice = computeSliceAdaptive(state.stlAligned, zCenter, zBand, state.stlBounds);
  if (!stlSlice) throw new Error(`STL slice did not have enough valid coverage near selected Z range (${(zCenter - zBand).toFixed(4)} to ${(zCenter + zBand).toFixed(4)} in).`);

  buildPointCloud("stlSliceObj", stlSlice.points, 0xe09a2f, 4, 0.95);
  buildSliceBand(zCenter, stlSlice.usedHalfBand || zBand, state.stlBounds);
  updatePickTargets();

  buildDiameterResults(stlSlice, gwsFit2D);
}

function refreshDiameterWithCurrentCenter() {
  if (!state.gwsRaw || !state.stlRaw || !state.stlCenter) return;

  const gwsFit2D = fitCircle2D(state.gwsRaw);
  if (!gwsFit2D) throw new Error("2D circle fit failed for GWS data.");
  state.gwsFit2D = gwsFit2D;

  const aligned = alignStl(state.stlRaw, state.stlCenter);
  state.stlAligned = applyRotationToPoints(aligned.points, buildManualRotationQuat());
  state.stlAxis = aligned.axisOriginal;
  state.stlBounds = computeBounds(state.stlAligned);

  buildPointCloud("stlPointsObj", state.stlAligned, 0x1f66db, 2, 0.55);
  buildAxisLine();
  buildAxesWithLabels(state.stlBounds);
  buildRefineBand(Number(ui.refineZMin.value), Number(ui.refineZMax.value), state.stlBounds);

  const zCenter = Number(ui.zTarget.value);
  const zBand = Math.max(1e-5, Number(ui.zBand.value));
  const stlSlice = computeSliceAdaptive(state.stlAligned, zCenter, zBand, state.stlBounds);
  if (!stlSlice) throw new Error(`Not enough STL points near selected Z slice (${(zCenter - zBand).toFixed(4)} to ${(zCenter + zBand).toFixed(4)} in).`);

  buildPointCloud("stlSliceObj", stlSlice.points, 0xe09a2f, 4, 0.95);
  buildSliceBand(zCenter, stlSlice.usedHalfBand || zBand, state.stlBounds);
  updatePickTargets();

  buildDiameterResults(stlSlice, gwsFit2D);
}

function refineCenterFromZRange() {
  if (!state.stlRaw || !state.stlCenter) throw new Error("Run Diameter Analysis first.");
  const zMin = Number(ui.refineZMin.value);
  const zMax = Number(ui.refineZMax.value);
  if (!Number.isFinite(zMin) || !Number.isFinite(zMax)) throw new Error("Refine Z min/max must be numeric.");
  if (Math.abs(zMax - zMin) < 1e-8) throw new Error("Refine Z range must have non-zero width.");

  const subset = filterRawByAlignedZRange(state.stlRaw, state.stlCenter, zMin, zMax);
  const count = subset.length / 3;
  if (count < 50) throw new Error("Refine range keeps too few STL points. Widen the range.");

  const refined = fitSphereLeastSquares(subset);
  if (!refined) throw new Error("Refined center fit failed in selected Z range.");

  state.stlCenter = refined.center.clone();
  refreshDiameterWithCurrentCenter();
  setStatus(`Refined center updated using ${count.toLocaleString()} STL points in selected Z range.`);
}

ui.runBtn.addEventListener("click", async () => {
  try {
    setStatus("Loading files and running diameter analysis...");
    await loadInputs();

    runDiameterAnalysis();
    setStatus("Diameter analysis complete.");
  } catch (err) {
    console.error(err);
    setStatus(`Failed: ${err.message}`);
  }
});

ui.refineCenterBtn.addEventListener("click", () => {
  try {
    refineCenterFromZRange();
  } catch (err) {
    console.error(err);
    setStatus(`Failed: ${err.message}`);
  }
});

ui.applyRotationBtn.addEventListener("click", () => {
  try {
    if (!state.stlCenter || !state.stlRaw || !state.gwsRaw) throw new Error("Run Diameter Analysis first.");
    refreshDiameterWithCurrentCenter();
    setStatus(`Applied manual rotation X=${Number(ui.rotXDeg.value).toFixed(3)} deg, Y=${Number(ui.rotYDeg.value).toFixed(3)} deg.`);
  } catch (err) {
    console.error(err);
    setStatus(`Failed: ${err.message}`);
  }
});

ui.refineZMin.addEventListener("input", () => {
  if (!state.stlBounds) return;
  buildRefineBand(Number(ui.refineZMin.value), Number(ui.refineZMax.value), state.stlBounds);
});

ui.refineZMax.addEventListener("input", () => {
  if (!state.stlBounds) return;
  buildRefineBand(Number(ui.refineZMin.value), Number(ui.refineZMax.value), state.stlBounds);
});

ui.zTarget.addEventListener("input", () => {
  if (!state.stlAligned || !state.stlCenter || !state.gwsRaw) return;
  try {
    refreshDiameterWithCurrentCenter();
    setStatus(`Updated plots for Z slice center=${Number(ui.zTarget.value).toFixed(4)} in, half-band=\u00b1${Math.max(1e-5, Number(ui.zBand.value)).toFixed(4)} in.`);
  } catch (err) {
    console.error(err);
    setStatus(`Failed: ${err.message}`);
  }
});

ui.zBand.addEventListener("input", () => {
  if (!state.stlAligned || !state.stlCenter || !state.gwsRaw) return;
  try {
    refreshDiameterWithCurrentCenter();
    setStatus(`Updated plots for Z slice center=${Number(ui.zTarget.value).toFixed(4)} in, half-band=\u00b1${Math.max(1e-5, Number(ui.zBand.value)).toFixed(4)} in.`);
  } catch (err) {
    console.error(err);
    setStatus(`Failed: ${err.message}`);
  }
});

ui.smoothWindowF.addEventListener("input", () => {
  try {
    if (state.stlAligned && state.stlCenter && state.gwsRaw) {
      refreshDiameterWithCurrentCenter();
      setStatus(`Updated optimisation with window F=${Math.max(1, Math.min(360, Math.floor(Number(ui.smoothWindowF.value) || 1)))} (GWS=avg, STL=max).`);
    } else {
      updateSmoothedAngleRadiusPlot();
    }
  } catch (err) {
    console.error(err);
    setStatus(`Failed: ${err.message}`);
  }
});

canvas.addEventListener("pointermove", (ev) => {
  updateCursorPickFromEvent(ev);
});

canvas.addEventListener("pointerleave", () => {
  clearHover();
});

canvas.addEventListener("click", () => {
  if (!state.hoveredPoint) return;
  setStatus(`Cursor point selected at Z=${state.hoveredPoint.z.toFixed(4)} in. Enter desired Z manually to run analysis.`);
});

ui.resetViewBtn.addEventListener("click", () => {
  if (state.stlBounds) {
    fitCamera(state.stlBounds);
  } else {
    controls.target.set(0, 0, 0);
    camera.position.set(2.4, 2.2, 2.8);
  }
});
