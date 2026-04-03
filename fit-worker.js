function computeBounds(points) {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };

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
    center: {
      x: (min.x + max.x) * 0.5,
      y: (min.y + max.y) * 0.5,
      z: (min.z + max.z) * 0.5,
    },
    size: {
      x: max.x - min.x,
      y: max.y - min.y,
      z: max.z - min.z,
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
    const pivot = axis === 0 ? points[i] : axis === 1 ? points[i + 1] : points[i + 2];
    const delta = (axis === 0 ? x : axis === 1 ? y : z) - pivot;

    const first = delta < 0 ? node.left : node.right;
    const second = delta < 0 ? node.right : node.left;

    walk(first);
    if (delta * delta < best) walk(second);
  }

  walk(tree);
  return best;
}

function evaluateTransform(stlPoints, kdTree, masterPoints, params, sampleStride, roi, proxMaxDistSq) {
  let sumSq = 0;
  let count = 0;

  for (let i = 0; i < stlPoints.length; i += 3 * sampleStride) {
    const x = stlPoints[i] * params.sx + params.tx;
    const y = stlPoints[i + 1] * params.sy + params.ty;
    const z = stlPoints[i + 2] * params.sz + params.tz;
    if (roi && !isInsideRoi(x, y, z, roi)) continue;
    const d2 = nearestDistanceSquared(kdTree, masterPoints, x, y, z);
    if (proxMaxDistSq != null && d2 > proxMaxDistSq) continue;
    sumSq += d2;
    count += 1;
  }

  if (count === 0) return Number.POSITIVE_INFINITY;
  return Math.sqrt(sumSq / Math.max(count, 1));
}

function getPermutations() {
  return [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
}

function determinantSign(axes, signs) {
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (let row = 0; row < 3; row += 1) {
    m[row][axes[row]] = signs[row];
  }

  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function getOrientationCandidates() {
  const orientations = [];

  for (const axes of getPermutations()) {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const signs = [sx, sy, sz];
          if (determinantSign(axes, signs) < 0) continue;
          orientations.push({
            axes,
            signs,
            label: `x<=${signs[0] < 0 ? "-" : ""}${"xyz"[axes[0]]}, y<=${signs[1] < 0 ? "-" : ""}${"xyz"[axes[1]]}, z<=${signs[2] < 0 ? "-" : ""}${"xyz"[axes[2]]}`,
          });
        }
      }
    }
  }

  return orientations;
}

function orientPoints(points, center, orientation) {
  const out = new Float32Array(points.length);

  for (let i = 0; i < points.length; i += 3) {
    const shifted0 = points[i] - center.x;
    const shifted1 = points[i + 1] - center.y;
    const shifted2 = points[i + 2] - center.z;
    const shifted = [shifted0, shifted1, shifted2];
    out[i] = orientation.signs[0] * shifted[orientation.axes[0]];
    out[i + 1] = orientation.signs[1] * shifted[orientation.axes[1]];
    out[i + 2] = orientation.signs[2] * shifted[orientation.axes[2]];
  }

  return out;
}

function refineScaleAndTranslation(points, gws, initialParams, scaleLimit, sampleStride, rounds, roi, uniformScaling, proxMaxDistSq) {
  let best = { ...initialParams };
  if (uniformScaling) {
    const s = (best.sx + best.sy + best.sz) / 3;
    best.sx = s;
    best.sy = s;
    best.sz = s;
  }
  let bestErr = evaluateTransform(points, gws.kdTree, gws.points, best, sampleStride, roi, proxMaxDistSq);
  const ext = Math.max(gws.bounds.size.x, gws.bounds.size.y, gws.bounds.size.z);
  let scaleStep = 0.008;
  let transStep = ext * 0.025;

  for (let round = 0; round < rounds; round += 1) {
    let improvedInRound = false;

    for (const key of (uniformScaling ? ["s", "tx", "ty", "tz"] : ["sx", "sy", "sz", "tx", "ty", "tz"])) {
      const step = key.startsWith("s") ? scaleStep : transStep;
      for (const delta of [-step, step]) {
        let trial;
        if (key === "s") {
          const sBase = (best.sx + best.sy + best.sz) / 3;
          const sNew = sBase + delta;
          trial = { ...best, sx: sNew, sy: sNew, sz: sNew };
        } else {
          trial = { ...best, [key]: best[key] + delta };
        }
        if (trial.sx < 1 - scaleLimit || trial.sx > 1 + scaleLimit) continue;
        if (trial.sy < 1 - scaleLimit || trial.sy > 1 + scaleLimit) continue;
        if (trial.sz < 1 - scaleLimit || trial.sz > 1 + scaleLimit) continue;

        const err = evaluateTransform(points, gws.kdTree, gws.points, trial, sampleStride, roi, proxMaxDistSq);
        if (err < bestErr) {
          best = trial;
          bestErr = err;
          improvedInRound = true;
        }
      }
    }

    if (!improvedInRound) {
      scaleStep *= 0.55;
      transStep *= 0.55;
      if (scaleStep < 1e-5 && transStep < 1e-5) break;
    }
  }

  return { params: best, rmse: bestErr };
}

function scalePoints(points, factor) {
  if (factor === 1) return points;
  const out = new Float32Array(points.length);
  for (let i = 0; i < points.length; i += 1) {
    out[i] = points[i] * factor;
  }
  return out;
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
      const tmp = m[col];
      m[col] = m[pivotRow];
      m[pivotRow] = tmp;
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
    center: { x: cx, y: cy, z: cz },
    avgRadius: sumR / n,
  };
}

function isInsideRoi(x, y, z, roi) {
  return x >= roi.xMin && x <= roi.xMax && y >= roi.yMin && y <= roi.yMax && z >= roi.zMin && z <= roi.zMax;
}

function filterPointsByRoi(points, roi) {
  if (!roi) return points;
  const kept = [];
  for (let i = 0; i < points.length; i += 3) {
    const x = points[i];
    const y = points[i + 1];
    const z = points[i + 2];
    if (isInsideRoi(x, y, z, roi)) {
      kept.push(x, y, z);
    }
  }
  return new Float32Array(kept);
}

function buildErrorMappedPoints(sourcePoints, params, radialRef, kdTree, gwsPoints) {
  const transformed = new Float32Array(sourcePoints.length);
  const errors = new Float32Array(sourcePoints.length / 3);
  const pointDistances = new Float32Array(sourcePoints.length / 3);
  let sum = 0;
  let max = 0;

  for (let i = 0; i < sourcePoints.length; i += 3) {
    const x = sourcePoints[i] * params.sx + params.tx;
    const y = sourcePoints[i + 1] * params.sy + params.ty;
    const z = sourcePoints[i + 2] * params.sz + params.tz;
    transformed[i] = x;
    transformed[i + 1] = y;
    transformed[i + 2] = z;

    const dx = x - radialRef.center.x;
    const dy = y - radialRef.center.y;
    const dz = z - radialRef.center.z;
    const pointRadius = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const radialErr = Math.abs(pointRadius - radialRef.avgRadius);
    errors[i / 3] = radialErr;
    sum += radialErr;
    if (radialErr > max) max = radialErr;

    const d2 = nearestDistanceSquared(kdTree, gwsPoints, x, y, z);
    pointDistances[i / 3] = Math.sqrt(d2);
  }

  return {
    transformed,
    errors,
    pointDistances,
    stats: {
      mean: sum / Math.max(errors.length, 1),
      max,
    },
  };
}

self.onmessage = (event) => {
  const { mode, uniformScaling, gwsFitPoints, gwsBounds, stlFitPoints, stlDisplayPoints, stlBounds, seedFit, unitScaleCandidates, refineRoi, proxMaxDist } = event.data;
  const proxMaxDistSq = (proxMaxDist != null && proxMaxDist > 0) ? proxMaxDist * proxMaxDist : null;
  const gwsReferencePoints = new Float32Array(gwsFitPoints);
  const gws = {
    points: new Float32Array(gwsFitPoints),
    bounds: gwsBounds,
  };

  const stlFit = {
    points: new Float32Array(stlFitPoints),
    bounds: stlBounds,
  };
  const stlDisplay = new Float32Array(stlDisplayPoints);

  if (mode === "refine" && refineRoi) {
    const roiGws = filterPointsByRoi(gws.points, refineRoi);
    if (roiGws.length >= 300) {
      gws.points = roiGws;
    }
  }
  gws.kdTree = buildKdTree(gws.points);

  const coarseStride = Math.max(1, Math.floor((stlFit.points.length / 3) / (mode === "refine" ? 4000 : 2000)));
  const fineStride = mode === "refine" ? 1 : Math.max(1, Math.floor((stlFit.points.length / 3) / 5000));
  const scaleLimit = mode === "refine" ? 0.08 : 0.12;
  const finalRounds = mode === "refine" ? 14 : 8;
  let bestCandidate = null;
  const baseScaleCandidates = Array.isArray(unitScaleCandidates) && unitScaleCandidates.length > 0 ? unitScaleCandidates : [1, 1 / 25.4, 25.4, 1 / 2.54, 2.54];

  if (mode === "refine" && seedFit && seedFit.orientation && seedFit.unitScale) {
    const orientedPoints = orientPoints(stlFit.points, stlBounds.center, seedFit.orientation);
    const scaledPoints = scalePoints(orientedPoints, seedFit.unitScale);
    bestCandidate = {
      orientation: seedFit.orientation,
      unitScale: seedFit.unitScale,
      orientedPoints: scaledPoints,
      coarseFit: { params: seedFit.params, rmse: seedFit.rmse },
    };
  } else {
    const orientations = getOrientationCandidates();
    const totalCombos = orientations.length * baseScaleCandidates.length;
    let comboIndex = 0;

    for (let s = 0; s < baseScaleCandidates.length; s += 1) {
      const unitScale = baseScaleCandidates[s];

      for (let idx = 0; idx < orientations.length; idx += 1) {
        const orientation = orientations[idx];
        const orientedPoints = orientPoints(stlFit.points, stlFit.bounds.center, orientation);
        const scaledPoints = scalePoints(orientedPoints, unitScale);
        const orientedBounds = computeBounds(scaledPoints);
        const initialParams = {
          sx: 1,
          sy: 1,
          sz: 1,
          tx: gws.bounds.center.x - orientedBounds.center.x,
          ty: gws.bounds.center.y - orientedBounds.center.y,
          tz: gws.bounds.center.z - orientedBounds.center.z,
        };

        const coarseFit = refineScaleAndTranslation(scaledPoints, gws, initialParams, scaleLimit, coarseStride, 6, null, uniformScaling);
        const sizePenalty =
          Math.abs(orientedBounds.size.x - gws.bounds.size.x) +
          Math.abs(orientedBounds.size.y - gws.bounds.size.y) +
          Math.abs(orientedBounds.size.z - gws.bounds.size.z);
        const score = coarseFit.rmse + sizePenalty * 0.03;

        if (!bestCandidate || score < bestCandidate.score) {
          bestCandidate = { score, unitScale, orientation, orientedPoints: scaledPoints, coarseFit };
        }

        comboIndex += 1;
        if (comboIndex % 8 === 0) {
          self.postMessage({ type: "progress", message: `Checked ${comboIndex} of ${totalCombos} orientation/unit combinations...` });
        }
      }
    }
  }

  self.postMessage({ type: "progress", message: mode === "refine" ? "Running refine pass..." : "Finishing coarse fit..." });
  const finalFit = refineScaleAndTranslation(
    bestCandidate.orientedPoints,
    gws,
    bestCandidate.coarseFit.params,
    scaleLimit,
    fineStride,
    finalRounds,
    mode === "refine" ? refineRoi : null,
    uniformScaling,
    proxMaxDistSq,
  );

  self.postMessage({ type: "progress", message: "Computing final error map..." });
  const orientedDisplayPoints = orientPoints(stlDisplay, stlBounds.center, bestCandidate.orientation);
  const scaledDisplayPoints = scalePoints(orientedDisplayPoints, bestCandidate.unitScale || 1);
  const radialRef = fitSphereLeastSquares(gwsReferencePoints) || { center: gws.bounds.center, avgRadius: Math.max(gws.bounds.size.x, gws.bounds.size.y, gws.bounds.size.z) * 0.5 };
  const errorMap = buildErrorMappedPoints(scaledDisplayPoints, finalFit.params, radialRef, gws.kdTree, gws.points);

  let stlRoiCount = bestCandidate.orientedPoints.length / 3;
  if (mode === "refine" && refineRoi) {
    stlRoiCount = 0;
    for (let i = 0; i < bestCandidate.orientedPoints.length; i += 3) {
      const x = bestCandidate.orientedPoints[i] * finalFit.params.sx + finalFit.params.tx;
      const y = bestCandidate.orientedPoints[i + 1] * finalFit.params.sy + finalFit.params.ty;
      const z = bestCandidate.orientedPoints[i + 2] * finalFit.params.sz + finalFit.params.tz;
      if (isInsideRoi(x, y, z, refineRoi)) stlRoiCount += 1;
    }
  }

  let stlProxCount = errorMap.pointDistances.length;
  if (proxMaxDistSq != null) {
    stlProxCount = 0;
    const limit = Math.sqrt(proxMaxDistSq);
    for (let i = 0; i < errorMap.pointDistances.length; i += 1) {
      if (errorMap.pointDistances[i] <= limit) stlProxCount += 1;
    }
  }

  self.postMessage({
    type: "result",
    fitResult: {
      params: finalFit.params,
      rmse: finalFit.rmse,
      orientation: bestCandidate.orientation,
      unitScale: bestCandidate.unitScale || 1,
    },
    fitPointCount: stlFit.points.length / 3,
    roiPointCounts: {
      gws: gws.points.length / 3,
      stl: stlRoiCount,
    },
    proxPointCounts: {
      stl: stlProxCount,
    },
    transformedPoints: errorMap.transformed,
    errors: errorMap.errors,
    pointDistances: errorMap.pointDistances,
    stats: errorMap.stats,
    radialReference: radialRef,
  });
};