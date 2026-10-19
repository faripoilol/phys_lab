const STORAGE_KEY = "physlab-oscillation-lab-v2";

const MODE_CONFIG = {
  "mass-independence": {
    tabId: "mode-tab-mass",
    label: "Mass Independence",
    summary: "Hold pendulum length fixed, vary bob mass, and compare the saved frequencies.",
    controlledVariable: "Length",
    variedVariable: "Mass",
    controlledField: "length",
    variedField: "mass",
    controlledUnit: "m",
    variedUnit: "g",
    controlledTolerance: 0.005,
    controlledDecimals: 3,
    warning:
      "Session warnings will fire if saved runs in this mode use inconsistent lengths.",
    secondaryField: "length",
    secondaryLabel: "Length",
    secondaryInputLabel: "Length, m",
    secondaryInputPlaceholder: "0.750",
    secondaryValueSuffix: " m",
    secondaryHeaderLabel: "Length",
    reviewSecondaryLabel: "Draft Length",
    signalAxisKey: "horizontal",
    signalAxisLabel: "Horizontal Axis",
    signalAxisPrefix: "x",
    signalName: "horizontal",
    minFrequencyHz: 0.3,
    maxFrequencyHz: 2.5,
    cameraTitle: "Red-marker tracking view",
    cameraDescription:
      "Enable the webcam, place the red pendulum marker in frame, and align the motion to move mostly left-to-right on screen. The overlay will mark the detected bob and the current horizontal analysis axis.",
    cameraMotionTip: "Keep the swing mostly horizontal in the camera frame",
    traceEmptyDetail: "Start a run and swing the red marker left-to-right.",
  },
  "length-law": {
    tabId: "mode-tab-length",
    label: "Length Law",
    summary:
      "Hold bob mass fixed, vary pendulum length, and compare how the measured frequency changes.",
    controlledVariable: "Mass",
    variedVariable: "Length",
    controlledField: "mass",
    variedField: "length",
    controlledUnit: "g",
    variedUnit: "m",
    controlledTolerance: 0.5,
    controlledDecimals: 1,
    warning: "Session warnings will fire if saved runs in this mode use inconsistent masses.",
    secondaryField: "length",
    secondaryLabel: "Length",
    secondaryInputLabel: "Length, m",
    secondaryInputPlaceholder: "0.750",
    secondaryValueSuffix: " m",
    secondaryHeaderLabel: "Length",
    reviewSecondaryLabel: "Draft Length",
    signalAxisKey: "horizontal",
    signalAxisLabel: "Horizontal Axis",
    signalAxisPrefix: "x",
    signalName: "horizontal",
    minFrequencyHz: 0.3,
    maxFrequencyHz: 2.5,
    cameraTitle: "Red-marker tracking view",
    cameraDescription:
      "Enable the webcam, place the red pendulum marker in frame, and align the motion to move mostly left-to-right on screen. The overlay will mark the detected bob and the current horizontal analysis axis.",
    cameraMotionTip: "Keep the swing mostly horizontal in the camera frame",
    traceEmptyDetail: "Start a run and swing the red marker left-to-right.",
  },
  "spring-pendulum": {
    tabId: "mode-tab-spring",
    label: "Spring Pendulum",
    summary:
      "Keep one spring fixed, vary the attached mass, and compare the saved vertical oscillation frequencies.",
    controlledVariable: "Spring Constant",
    variedVariable: "Mass",
    controlledField: "springConstant",
    variedField: "mass",
    controlledUnit: "N/m",
    variedUnit: "g",
    controlledTolerance: 0.1,
    controlledDecimals: 2,
    warning:
      "Session warnings will fire if saved runs in this mode use inconsistent spring constants.",
    secondaryField: "springConstant",
    secondaryLabel: "Spring Constant",
    secondaryInputLabel: "Spring Constant, N/m",
    secondaryInputPlaceholder: "5.00",
    secondaryValueSuffix: " N/m",
    secondaryHeaderLabel: "Spring k",
    reviewSecondaryLabel: "Draft Spring Constant",
    signalAxisKey: "vertical",
    signalAxisLabel: "Vertical Axis",
    signalAxisPrefix: "y",
    signalName: "vertical",
    minFrequencyHz: 0.3,
    maxFrequencyHz: 6,
    cameraTitle: "Vertical spring tracking view",
    cameraDescription:
      "Enable the webcam, place the red marker on the spring mass in frame, and align the motion to move mostly up-and-down on screen. The overlay will mark the detected mass and the current vertical analysis axis.",
    cameraMotionTip: "Keep the spring motion mostly vertical in the camera frame",
    traceEmptyDetail: "Start a run and move the red marker up-and-down.",
  },
};

const TRACKING_CONFIG = {
  analysisWidthPx: 240,
  sampleStepPx: 2,
  minMaskFraction: 0.001,
  minMaskPixels: 20,
  minSaturation: 0.45,
  minValue: 0.35,
  maxRedHue: 18,
  minWrapRedHue: 342,
  trackingGateFraction: 0.25,
  trackingMinRelativeArea: 0.1,
  minCorrelationPeak: 0.35,
  minEstimateDurationS: 2.2,
  analysisRateHz: 30,
  estimatorWindowS: 10,
  finalWindowS: 30,
  traceWindowS: 12,
  liveEstimateIntervalMs: 140,
  pronyOrder: 6,
  pronyDisplayModes: 6,
  minPronyAmplitude: 0.05,
  maxGrowthRatePerS: 0.75,
  maxDecayRatePerS: 5,
};

const DEFAULT_FREQUENCY_RANGE = { minFrequencyHz: 0.3, maxFrequencyHz: 2.5 };

function resolveFrequencyRange(range) {
  return {
    minFrequencyHz:
      range && Number.isFinite(range.minFrequencyHz)
        ? range.minFrequencyHz
        : DEFAULT_FREQUENCY_RANGE.minFrequencyHz,
    maxFrequencyHz:
      range && Number.isFinite(range.maxFrequencyHz)
        ? range.maxFrequencyHz
        : DEFAULT_FREQUENCY_RANGE.maxFrequencyHz,
  };
}

function formatFrequencyRange(range) {
  const { minFrequencyHz, maxFrequencyHz } = resolveFrequencyRange(range);
  return `${minFrequencyHz}–${maxFrequencyHz} Hz`;
}

function createDefaultModeState() {
  return {
    draft: {
      mass: "",
      length: "",
      springConstant: "",
      notes: "",
    },
    runs: [],
    lastSavedAt: null,
  };
}

function createDefaultState() {
  return {
    activeMode: "mass-independence",
    modes: {
      "mass-independence": createDefaultModeState(),
      "length-law": createDefaultModeState(),
      "spring-pendulum": createDefaultModeState(),
    },
  };
}

function createEmptyDetection() {
  return {
    detected: false,
    horizontalAxisNormalized: null,
    verticalAxisNormalized: null,
    areaFraction: 0,
    centroidXPx: null,
    centroidYPx: null,
    frameWidth: 0,
    frameHeight: 0,
    bounds: null,
  };
}

function createRuntime() {
  const processingCanvas = document.createElement("canvas");
  const processingContext = processingCanvas.getContext("2d", { willReadFrequently: true });

  return {
    stream: null,
    frameRequest: null,
    processingCanvas,
    processingContext,
    currentDetection: createEmptyDetection(),
    run: {
      active: false,
      startedAtMs: null,
      samples: [],
      metadata: null,
      liveEstimate: null,
      lastEstimateUpdateMs: 0,
      lastCompleted: null,
    },
  };
}

function isReviewPending(runtime) {
  return Boolean(runtime.run.lastCompleted && runtime.run.lastCompleted.pendingReview);
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }

    const parsed = JSON.parse(raw);
    const state = createDefaultState();
    if (parsed && typeof parsed === "object") {
      if (parsed.activeMode in MODE_CONFIG) {
        state.activeMode = parsed.activeMode;
      }

      if (parsed.modes && typeof parsed.modes === "object") {
        for (const modeId of Object.keys(MODE_CONFIG)) {
          const incoming = parsed.modes[modeId];
          if (!incoming || typeof incoming !== "object") {
            continue;
          }

          if (incoming.draft && typeof incoming.draft === "object") {
            state.modes[modeId].draft = {
              mass: typeof incoming.draft.mass === "string" ? incoming.draft.mass : "",
              length: typeof incoming.draft.length === "string" ? incoming.draft.length : "",
              springConstant:
                typeof incoming.draft.springConstant === "string" ? incoming.draft.springConstant : "",
              notes: typeof incoming.draft.notes === "string" ? incoming.draft.notes : "",
            };
          }

          if (Array.isArray(incoming.runs)) {
            state.modes[modeId].runs = incoming.runs;
          }

          if (typeof incoming.lastSavedAt === "string") {
            state.modes[modeId].lastSavedAt = incoming.lastSavedAt;
          }
        }
      }
    }

    return state;
  } catch (_error) {
    return createDefaultState();
  }
}

function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_error) {
    // Ignore storage failures and keep the app usable.
  }
}

function parseNumeric(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function pluralize(word, count) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function formatValue(value, suffix) {
  return value ? `${value}${suffix}` : "Not set";
}

function formatFrequency(value, suffix = "Hz") {
  return Number.isFinite(value) ? `${value.toFixed(3)} ${suffix}` : "Not available";
}

function formatTrackedAxisValue(value, modeConfig) {
  return Number.isFinite(value) ? `${modeConfig.signalAxisPrefix} = ${value.toFixed(2)}` : "No signal";
}

function formatPeriod(value) {
  return Number.isFinite(value) ? `${value.toFixed(3)} s` : "Not available";
}

function formatAmplitude(value) {
  return Number.isFinite(value) ? value.toFixed(3) : "Not available";
}

function formatDamping(value) {
  return Number.isFinite(value) ? `${value.toFixed(3)} 1/s` : "Not available";
}

function formatTimestamp(value) {
  if (!value) {
    return "Draft only";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Draft only";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function makeRunId() {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getDetectionAxisValue(detection, signalAxisKey) {
  if (!detection || !detection.detected) {
    return null;
  }

  return signalAxisKey === "vertical"
    ? detection.verticalAxisNormalized
    : detection.horizontalAxisNormalized;
}

function getCurrentModeConfig(state, runtime) {
  if (runtime.run.active && runtime.run.metadata) {
    return MODE_CONFIG[runtime.run.metadata.mode];
  }

  if (runtime.run.lastCompleted && runtime.run.lastCompleted.metadata) {
    return MODE_CONFIG[runtime.run.lastCompleted.metadata.mode];
  }

  return MODE_CONFIG[state.activeMode];
}

function formatSecondaryValue(source, modeConfig) {
  return formatValue(source ? source[modeConfig.secondaryField] : null, modeConfig.secondaryValueSuffix);
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

function setStorageMessage(elements, message) {
  elements.storageStatus.textContent = message;
}

function rgbToHsv(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  if (hue < 0) {
    hue += 360;
  }

  return {
    hue,
    saturation: max === 0 ? 0 : delta / max,
    value: max,
  };
}

function median(values) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
  }
  return sorted[midpoint];
}

function linearDetrend(timesS, values) {
  if (values.length === 0) {
    return [];
  }

  const n = values.length;
  let sumT = 0;
  let sumV = 0;
  let sumTT = 0;
  let sumTV = 0;

  for (let index = 0; index < n; index += 1) {
    const t = timesS[index];
    const value = values[index];
    sumT += t;
    sumV += value;
    sumTT += t * t;
    sumTV += t * value;
  }

  const denominator = n * sumTT - sumT * sumT;
  if (Math.abs(denominator) < 1e-9) {
    const mean = sumV / n;
    return values.map((value) => value - mean);
  }

  const slope = (n * sumTV - sumT * sumV) / denominator;
  const intercept = (sumV - slope * sumT) / n;
  return values.map((value, index) => value - (slope * timesS[index] + intercept));
}

function buildUniformSignal(samples, options = {}) {
  const windowS = Number.isFinite(options.windowS) ? options.windowS : TRACKING_CONFIG.estimatorWindowS;
  const validSamples = samples.filter((sample) => Number.isFinite(sample.axis));
  if (validSamples.length < 8) {
    return null;
  }

  const lastElapsedMs = validSamples[validSamples.length - 1].elapsedMs;
  const limitedSamples = validSamples.filter(
    (sample) => sample.elapsedMs >= lastElapsedMs - windowS * 1000,
  );
  const timesS = limitedSamples.map((sample) => sample.elapsedMs / 1000);
  const values = limitedSamples.map((sample) => sample.axis);

  const uniqueTimes = [];
  const uniqueValues = [];
  for (let index = 0; index < timesS.length; index += 1) {
    const time = timesS[index];
    const value = values[index];
    const previousTime = uniqueTimes[uniqueTimes.length - 1];
    if (uniqueTimes.length > 0 && Math.abs(time - previousTime) < 1e-6) {
      uniqueValues[uniqueValues.length - 1] = value;
    } else {
      uniqueTimes.push(time);
      uniqueValues.push(value);
    }
  }

  if (uniqueTimes.length < 8) {
    return null;
  }

  const deltas = [];
  for (let index = 1; index < uniqueTimes.length; index += 1) {
    const delta = uniqueTimes[index] - uniqueTimes[index - 1];
    if (delta > 0) {
      deltas.push(delta);
    }
  }

  const medianDtS = median(deltas);
  if (!medianDtS || medianDtS <= 0) {
    return null;
  }

  // Resample at a fixed analysis rate so the estimator behaves the same on a
  // 60 Hz and a 144 Hz display; faster sampling only duplicates camera frames.
  const dtS = Math.max(medianDtS, 1 / TRACKING_CONFIG.analysisRateHz);

  const durationS = uniqueTimes[uniqueTimes.length - 1] - uniqueTimes[0];
  if (durationS < TRACKING_CONFIG.minEstimateDurationS) {
    return null;
  }

  const uniformTimesS = [];
  const uniformValues = [];
  let sourceIndex = 0;
  const maxSteps = Math.floor(durationS / dtS);

  for (let step = 0; step <= maxSteps; step += 1) {
    const targetTime = uniqueTimes[0] + step * dtS;
    while (
      sourceIndex + 1 < uniqueTimes.length &&
      uniqueTimes[sourceIndex + 1] < targetTime
    ) {
      sourceIndex += 1;
    }

    const leftTime = uniqueTimes[sourceIndex];
    const rightTime = uniqueTimes[Math.min(sourceIndex + 1, uniqueTimes.length - 1)];
    const leftValue = uniqueValues[sourceIndex];
    const rightValue = uniqueValues[Math.min(sourceIndex + 1, uniqueValues.length - 1)];

    let interpolated = leftValue;
    if (rightTime > leftTime) {
      const ratio = (targetTime - leftTime) / (rightTime - leftTime);
      interpolated = leftValue + ratio * (rightValue - leftValue);
    }

    uniformTimesS.push(targetTime - uniqueTimes[0]);
    uniformValues.push(interpolated);
  }

  if (uniformValues.length < 8) {
    return null;
  }

  const detrended = linearDetrend(uniformTimesS, uniformValues);
  const minValue = Math.min(...detrended);
  const maxValue = Math.max(...detrended);
  const axisSpan = maxValue - minValue;
  if (!Number.isFinite(axisSpan) || axisSpan < 0.04) {
    return null;
  }

  return {
    dtS,
    durationS,
    windowS,
    timesS: uniformTimesS,
    values: detrended,
    axisSpan,
    validSamples: limitedSamples.length,
    totalSamples: samples.length,
  };
}

function estimateFrequencyFromSignal(signal, range) {
  if (!signal || signal.values.length < 10) {
    return null;
  }

  const { minFrequencyHz, maxFrequencyHz } = resolveFrequencyRange(range);
  const sampleCount = signal.values.length;
  const maxLag = Math.min(sampleCount - 3, Math.ceil(1 / (minFrequencyHz * signal.dtS)));
  if (maxLag <= 3) {
    return null;
  }

  // Normalised autocorrelation for every lag up to the slowest allowed period.
  const scores = new Array(maxLag + 1).fill(null);
  for (let lag = 1; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;

    for (let index = 0; index < sampleCount - lag; index += 1) {
      const left = signal.values[index];
      const right = signal.values[index + lag];
      correlation += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }

    const denominator = Math.sqrt(leftEnergy * rightEnergy);
    scores[lag] = denominator > 0 ? correlation / denominator : null;
  }

  // The autocorrelation starts near 1 and must fall through zero before the
  // first genuine period peak. Taking the first peak after that crossing picks
  // the fundamental rather than a multiple of the period.
  let crossedZero = false;
  let peakLag = null;
  for (let lag = 2; lag < maxLag; lag += 1) {
    const current = scores[lag];
    if (current === null) {
      continue;
    }
    if (!crossedZero) {
      if (current < 0) {
        crossedZero = true;
      }
      continue;
    }

    const previous = scores[lag - 1];
    const next = scores[lag + 1];
    if (
      previous !== null &&
      next !== null &&
      current >= previous &&
      current > next &&
      current >= TRACKING_CONFIG.minCorrelationPeak
    ) {
      peakLag = lag;
      break;
    }
  }

  if (peakLag === null) {
    return null;
  }

  // Parabolic refinement of the peak for sub-sample period accuracy.
  const left = scores[peakLag - 1];
  const centre = scores[peakLag];
  const right = scores[peakLag + 1];
  const curvature = left - 2 * centre + right;
  const offset = curvature < 0 ? (0.5 * (left - right)) / curvature : 0;
  const refinedLag = peakLag + Math.max(-0.5, Math.min(0.5, offset));
  const frequencyHz = 1 / (refinedLag * signal.dtS);

  // A fundamental faster than the mode allows must not be reported as a
  // confident reading at a multiple of its period.
  if (frequencyHz > maxFrequencyHz * 1.02 || frequencyHz < minFrequencyHz / 1.02) {
    return null;
  }

  return {
    frequencyHz,
    qualityScore: centre,
  };
}

function createComplex(re, im = 0) {
  return { re, im };
}

function cloneComplex(value) {
  return { re: value.re, im: value.im };
}

function addComplex(left, right) {
  return createComplex(left.re + right.re, left.im + right.im);
}

function subtractComplex(left, right) {
  return createComplex(left.re - right.re, left.im - right.im);
}

function multiplyComplex(left, right) {
  return createComplex(
    left.re * right.re - left.im * right.im,
    left.re * right.im + left.im * right.re,
  );
}

function divideComplex(left, right) {
  const denominator = right.re * right.re + right.im * right.im;
  if (denominator === 0) {
    return createComplex(0, 0);
  }
  return createComplex(
    (left.re * right.re + left.im * right.im) / denominator,
    (left.im * right.re - left.re * right.im) / denominator,
  );
}

function conjugateComplex(value) {
  return createComplex(value.re, -value.im);
}

function absComplex(value) {
  return Math.hypot(value.re, value.im);
}

function logComplex(value) {
  return createComplex(Math.log(absComplex(value)), Math.atan2(value.im, value.re));
}

function evaluatePolynomial(coefficients, value) {
  let result = createComplex(coefficients[0], 0);
  for (let index = 1; index < coefficients.length; index += 1) {
    result = addComplex(multiplyComplex(result, value), createComplex(coefficients[index], 0));
  }
  return result;
}

function solveRealLinearSystem(matrix, vector) {
  const n = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < n; column += 1) {
    let pivotRow = column;
    let pivotMagnitude = Math.abs(augmented[column][column]);
    for (let row = column + 1; row < n; row += 1) {
      const magnitude = Math.abs(augmented[row][column]);
      if (magnitude > pivotMagnitude) {
        pivotMagnitude = magnitude;
        pivotRow = row;
      }
    }

    if (pivotMagnitude < 1e-10) {
      return null;
    }

    if (pivotRow !== column) {
      [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]];
    }

    const pivot = augmented[column][column];
    for (let entry = column; entry <= n; entry += 1) {
      augmented[column][entry] /= pivot;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === column) {
        continue;
      }

      const factor = augmented[row][column];
      if (Math.abs(factor) < 1e-10) {
        continue;
      }

      for (let entry = column; entry <= n; entry += 1) {
        augmented[row][entry] -= factor * augmented[column][entry];
      }
    }
  }

  return augmented.map((row) => row[n]);
}

function solveRealLeastSquares(lhsRows, rhs) {
  if (lhsRows.length === 0) {
    return null;
  }

  const width = lhsRows[0].length;
  const gram = Array.from({ length: width }, () => Array(width).fill(0));
  const projected = Array(width).fill(0);

  for (let rowIndex = 0; rowIndex < lhsRows.length; rowIndex += 1) {
    const row = lhsRows[rowIndex];
    const rhsValue = rhs[rowIndex];
    for (let i = 0; i < width; i += 1) {
      projected[i] += row[i] * rhsValue;
      for (let j = i; j < width; j += 1) {
        gram[i][j] += row[i] * row[j];
      }
    }
  }

  for (let i = 0; i < width; i += 1) {
    for (let j = 0; j < i; j += 1) {
      gram[i][j] = gram[j][i];
    }
    gram[i][i] += 1e-8;
  }

  return solveRealLinearSystem(gram, projected);
}

function solveComplexLinearSystem(matrix, vector) {
  const n = vector.length;
  const augmented = matrix.map((row, index) => [...row.map(cloneComplex), cloneComplex(vector[index])]);

  for (let column = 0; column < n; column += 1) {
    let pivotRow = column;
    let pivotMagnitude = absComplex(augmented[column][column]);
    for (let row = column + 1; row < n; row += 1) {
      const magnitude = absComplex(augmented[row][column]);
      if (magnitude > pivotMagnitude) {
        pivotMagnitude = magnitude;
        pivotRow = row;
      }
    }

    if (pivotMagnitude < 1e-12) {
      return null;
    }

    if (pivotRow !== column) {
      [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]];
    }

    const pivot = augmented[column][column];
    for (let entry = column; entry <= n; entry += 1) {
      augmented[column][entry] = divideComplex(augmented[column][entry], pivot);
    }

    for (let row = 0; row < n; row += 1) {
      if (row === column) {
        continue;
      }

      const factor = augmented[row][column];
      if (absComplex(factor) < 1e-12) {
        continue;
      }

      for (let entry = column; entry <= n; entry += 1) {
        augmented[row][entry] = subtractComplex(
          augmented[row][entry],
          multiplyComplex(factor, augmented[column][entry]),
        );
      }
    }
  }

  return augmented.map((row) => row[n]);
}

function findPolynomialRoots(coefficients) {
  const degree = coefficients.length - 1;
  if (degree < 1) {
    return [];
  }

  const radius = 1 + Math.max(...coefficients.slice(1).map((value) => Math.abs(value)), 0);
  let roots = Array.from({ length: degree }, (_, index) => {
    const angle = (2 * Math.PI * index) / degree + 0.3;
    return createComplex(radius * Math.cos(angle), radius * Math.sin(angle));
  });

  for (let iteration = 0; iteration < 80; iteration += 1) {
    let maxDelta = 0;
    const nextRoots = roots.map((root, rootIndex) => {
      let denominator = createComplex(1, 0);
      for (let otherIndex = 0; otherIndex < roots.length; otherIndex += 1) {
        if (otherIndex === rootIndex) {
          continue;
        }
        denominator = multiplyComplex(denominator, subtractComplex(root, roots[otherIndex]));
      }

      if (absComplex(denominator) < 1e-12) {
        denominator = addComplex(denominator, createComplex(1e-12, 1e-12));
      }

      const numerator = evaluatePolynomial(coefficients, root);
      const delta = divideComplex(numerator, denominator);
      maxDelta = Math.max(maxDelta, absComplex(delta));
      return subtractComplex(root, delta);
    });

    roots = nextRoots;
    if (maxDelta < 1e-10) {
      break;
    }
  }

  return roots;
}

function fitComplexModeAmplitudes(values, roots) {
  const modeCount = roots.length;
  const gram = Array.from({ length: modeCount }, () =>
    Array.from({ length: modeCount }, () => createComplex(0, 0)),
  );
  const projected = Array.from({ length: modeCount }, () => createComplex(0, 0));
  const powers = roots.map(() => createComplex(1, 0));

  for (let sampleIndex = 0; sampleIndex < values.length; sampleIndex += 1) {
    const signalValue = values[sampleIndex];

    for (let i = 0; i < modeCount; i += 1) {
      const left = conjugateComplex(powers[i]);
      projected[i] = addComplex(projected[i], multiplyComplex(left, createComplex(signalValue, 0)));

      for (let j = 0; j < modeCount; j += 1) {
        gram[i][j] = addComplex(gram[i][j], multiplyComplex(left, powers[j]));
      }
    }

    for (let i = 0; i < modeCount; i += 1) {
      powers[i] = multiplyComplex(powers[i], roots[i]);
    }
  }

  for (let index = 0; index < modeCount; index += 1) {
    gram[index][index] = addComplex(gram[index][index], createComplex(1e-8, 0));
  }

  return solveComplexLinearSystem(gram, projected);
}

function classifyPronyMode(mode, range) {
  const { minFrequencyHz, maxFrequencyHz } = resolveFrequencyRange(range);
  if (mode.frequencyHz < minFrequencyHz || mode.frequencyHz > maxFrequencyHz) {
    return `Rejected: outside ${formatFrequencyRange(range)}`;
  }
  if (mode.dampingPerS > TRACKING_CONFIG.maxGrowthRatePerS) {
    return "Rejected: unstable";
  }
  if (mode.dampingPerS < -TRACKING_CONFIG.maxDecayRatePerS) {
    return "Rejected: overdamped";
  }
  return null;
}

function modeEnergy(amplitude, root, sampleCount) {
  const amplitudeSq = amplitude.re * amplitude.re + amplitude.im * amplitude.im;
  const magnitudeSq = root.re * root.re + root.im * root.im;
  const geometricSum =
    Math.abs(1 - magnitudeSq) < 1e-12
      ? sampleCount
      : (1 - magnitudeSq ** sampleCount) / (1 - magnitudeSq);
  return amplitudeSq * geometricSum;
}

function analyzePronySignal(signal, range) {
  if (!signal) {
    return {
      candidateModes: [],
      primaryMode: null,
      preparedSampleCount: 0,
      sampleDtS: null,
      error: "Signal preparation failed.",
    };
  }

  if (signal.values.length <= 2 * TRACKING_CONFIG.pronyOrder) {
    return {
      candidateModes: [],
      primaryMode: null,
      preparedSampleCount: signal.values.length,
      sampleDtS: signal.dtS,
      error: "Not enough prepared samples for Prony analysis.",
    };
  }

  const rhs = signal.values.slice(TRACKING_CONFIG.pronyOrder).map((value) => -value);
  const lhsRows = [];

  for (let rowIndex = TRACKING_CONFIG.pronyOrder; rowIndex < signal.values.length; rowIndex += 1) {
    const row = [];
    for (let lag = 0; lag < TRACKING_CONFIG.pronyOrder; lag += 1) {
      row.push(signal.values[rowIndex - lag - 1]);
    }
    lhsRows.push(row);
  }

  const coefficients = solveRealLeastSquares(lhsRows, rhs);
  if (!coefficients) {
    return {
      candidateModes: [],
      primaryMode: null,
      preparedSampleCount: signal.values.length,
      sampleDtS: signal.dtS,
      error: "Prony coefficient solve failed.",
    };
  }

  const roots = findPolynomialRoots([1, ...coefficients]);
  const amplitudes = fitComplexModeAmplitudes(signal.values, roots);
  if (!amplitudes) {
    return {
      candidateModes: [],
      primaryMode: null,
      preparedSampleCount: signal.values.length,
      sampleDtS: signal.dtS,
      error: "Mode-amplitude solve failed.",
    };
  }

  const nyquistHz = 0.5 / signal.dtS;
  const rawModes = [];

  for (let index = 0; index < roots.length; index += 1) {
    const root = roots[index];
    const amplitude = amplitudes[index];
    if (absComplex(root) === 0) {
      continue;
    }

    const exponent = logComplex(root);
    const dampingPerS = exponent.re / signal.dtS;
    const angularFrequency = exponent.im / signal.dtS;
    if (!Number.isFinite(dampingPerS) || !Number.isFinite(angularFrequency)) {
      continue;
    }
    if (angularFrequency <= 1e-9) {
      continue;
    }

    const frequencyHz = angularFrequency / (2 * Math.PI);
    if (frequencyHz > nyquistHz) {
      continue;
    }

    const amplitudePx = 2 * absComplex(amplitude);
    if (amplitudePx < TRACKING_CONFIG.minPronyAmplitude) {
      continue;
    }

    rawModes.push({
      rank: 0,
      frequencyHz,
      periodS: 1 / frequencyHz,
      amplitudePx,
      energy: modeEnergy(amplitude, root, signal.values.length),
      dampingPerS,
      phaseRad: Math.atan2(amplitude.im, amplitude.re),
      rootMagnitude: absComplex(root),
      sampleDtS: signal.dtS,
      preparedSampleCount: signal.values.length,
      status: "Pending review",
      selected: false,
    });
  }

  // Rank by energy over the analysed window so a sustained oscillation beats
  // a large but short-lived transient.
  const sortedModes = [...rawModes].sort((left, right) => right.energy - left.energy);
  const acceptedModes = [];
  const displayModes = [];

  for (const mode of sortedModes) {
    const reviewedMode = { ...mode };
    const rejection = classifyPronyMode(reviewedMode, range);

    if (rejection) {
      reviewedMode.status = rejection;
    } else if (
      acceptedModes.some(
        (candidate) =>
          Math.abs(reviewedMode.frequencyHz - candidate.frequencyHz) <=
          Math.max(0.05, 0.02 * reviewedMode.frequencyHz),
      )
    ) {
      reviewedMode.status = "Rejected: near stronger mode";
    } else {
      reviewedMode.status = "Accepted candidate";
      acceptedModes.push(reviewedMode);
    }

    displayModes.push(reviewedMode);
  }

  acceptedModes.forEach((mode, index) => {
    mode.rank = index + 1;
    mode.selected = index === 0;
    mode.status = index === 0 ? "Selected primary mode" : "Accepted candidate";
  });

  return {
    candidateModes: displayModes.slice(0, TRACKING_CONFIG.pronyDisplayModes),
    primaryMode: acceptedModes[0] || null,
    preparedSampleCount: signal.values.length,
    sampleDtS: signal.dtS,
    error: acceptedModes[0]
      ? null
      : `No stable Prony mode inside ${formatFrequencyRange(range)} survived filtering.`,
  };
}

function describeQuality(detectionRate, score) {
  if (!Number.isFinite(detectionRate) || detectionRate < 0.55) {
    return "Weak visibility";
  }
  if (Number.isFinite(score) && score >= 0.78) {
    return "High confidence";
  }
  if (Number.isFinite(score) && score >= 0.58) {
    return "Usable";
  }
  return "Preliminary";
}

function summarizeRun(samples, metadata) {
  const durationS = samples.length > 0 ? samples[samples.length - 1].elapsedMs / 1000 : 0;
  const validSamples = samples.filter((sample) => Number.isFinite(sample.axis));
  const detectionRate = samples.length > 0 ? validSamples.length / samples.length : 0;
  const modeConfig = metadata ? MODE_CONFIG[metadata.mode] : null;
  const signal = buildUniformSignal(samples, { windowS: TRACKING_CONFIG.finalWindowS });
  const provisionalEstimate = estimateFrequencyFromSignal(signal, modeConfig);
  const prony = analyzePronySignal(signal, modeConfig);
  const qualityLabel = describeQuality(
    detectionRate,
    provisionalEstimate ? provisionalEstimate.qualityScore : null,
  );

  return {
    metadata,
    samples: samples.slice(),
    durationS,
    validSampleCount: validSamples.length,
    totalSampleCount: samples.length,
    detectionRate,
    signal,
    provisionalEstimate,
    prony,
    qualityLabel,
    pendingReview: true,
    savedAt: null,
  };
}

function isRedPixel(red, green, blue) {
  const hsv = rgbToHsv(red, green, blue);
  return (
    (hsv.hue <= TRACKING_CONFIG.maxRedHue || hsv.hue >= TRACKING_CONFIG.minWrapRedHue) &&
    hsv.saturation >= TRACKING_CONFIG.minSaturation &&
    hsv.value >= TRACKING_CONFIG.minValue
  );
}

// Label 4-connected groups of red cells on the sampling grid. Each blob carries
// its cell count, centroid and bounds in frame pixel coordinates.
function findRedBlobs(mask, gridWidth, gridHeight, step) {
  const visited = new Uint8Array(mask.length);
  const blobs = [];
  const stack = [];

  const visit = (index) => {
    if (mask[index] && !visited[index]) {
      visited[index] = 1;
      stack.push(index);
    }
  };

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) {
      continue;
    }

    visited[start] = 1;
    stack.push(start);
    const blob = {
      count: 0,
      sumX: 0,
      sumY: 0,
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };

    while (stack.length > 0) {
      const index = stack.pop();
      const gridX = index % gridWidth;
      const gridY = (index - gridX) / gridWidth;
      const x = gridX * step;
      const y = gridY * step;

      blob.count += 1;
      blob.sumX += x;
      blob.sumY += y;
      blob.minX = Math.min(blob.minX, x);
      blob.minY = Math.min(blob.minY, y);
      blob.maxX = Math.max(blob.maxX, x);
      blob.maxY = Math.max(blob.maxY, y);

      if (gridX > 0) {
        visit(index - 1);
      }
      if (gridX < gridWidth - 1) {
        visit(index + 1);
      }
      if (gridY > 0) {
        visit(index - gridWidth);
      }
      if (gridY < gridHeight - 1) {
        visit(index + gridWidth);
      }
    }

    blob.centroidX = blob.sumX / blob.count;
    blob.centroidY = blob.sumY / blob.count;
    blobs.push(blob);
  }

  return blobs;
}

// Prefer the blob nearest the previous detection so a second red object does
// not steal the marker mid-run; fall back to the largest blob otherwise.
function chooseMarkerBlob(candidates, previousDetection, frameWidth) {
  const largest = candidates.reduce(
    (best, blob) => (blob.count > best.count ? blob : best),
    candidates[0],
  );

  if (
    !previousDetection ||
    !previousDetection.detected ||
    !Number.isFinite(previousDetection.centroidXPx) ||
    !Number.isFinite(previousDetection.centroidYPx)
  ) {
    return largest;
  }

  const gateRadius = frameWidth * TRACKING_CONFIG.trackingGateFraction;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const blob of candidates) {
    if (blob.count < largest.count * TRACKING_CONFIG.trackingMinRelativeArea) {
      continue;
    }
    const distance = Math.hypot(
      blob.centroidX - previousDetection.centroidXPx,
      blob.centroidY - previousDetection.centroidYPx,
    );
    if (distance < nearestDistance) {
      nearest = blob;
      nearestDistance = distance;
    }
  }

  return nearest && nearestDistance <= gateRadius ? nearest : largest;
}

function detectMarkerInImageData(data, frameWidth, frameHeight, previousDetection) {
  const step = TRACKING_CONFIG.sampleStepPx;
  const gridWidth = Math.ceil(frameWidth / step);
  const gridHeight = Math.ceil(frameHeight / step);
  const mask = new Uint8Array(gridWidth * gridHeight);
  let redCells = 0;

  for (let gridY = 0; gridY < gridHeight; gridY += 1) {
    const y = gridY * step;
    for (let gridX = 0; gridX < gridWidth; gridX += 1) {
      const x = gridX * step;
      const offset = (y * frameWidth + x) * 4;
      if (isRedPixel(data[offset], data[offset + 1], data[offset + 2])) {
        mask[gridY * gridWidth + gridX] = 1;
        redCells += 1;
      }
    }
  }

  const totalCells = gridWidth * gridHeight;
  const minCells = Math.max(
    TRACKING_CONFIG.minMaskPixels,
    Math.floor(totalCells * TRACKING_CONFIG.minMaskFraction),
  );
  const candidates =
    redCells >= minCells
      ? findRedBlobs(mask, gridWidth, gridHeight, step).filter((blob) => blob.count >= minCells)
      : [];

  if (candidates.length === 0) {
    return {
      detected: false,
      horizontalAxisNormalized: null,
      verticalAxisNormalized: null,
      areaFraction: redCells / Math.max(1, totalCells),
      centroidXPx: null,
      centroidYPx: null,
      frameWidth,
      frameHeight,
      bounds: null,
    };
  }

  const chosen = chooseMarkerBlob(candidates, previousDetection, frameWidth);
  return {
    detected: true,
    horizontalAxisNormalized: (chosen.centroidX / Math.max(1, frameWidth - 1)) * 2 - 1,
    verticalAxisNormalized: 1 - (chosen.centroidY / Math.max(1, frameHeight - 1)) * 2,
    areaFraction: chosen.count / Math.max(1, totalCells),
    centroidXPx: chosen.centroidX,
    centroidYPx: chosen.centroidY,
    frameWidth,
    frameHeight,
    bounds: {
      minX: chosen.minX,
      minY: chosen.minY,
      maxX: chosen.maxX,
      maxY: chosen.maxY,
    },
  };
}

function analyzeMarkerFrame(video, runtime) {
  const { processingCanvas, processingContext } = runtime;
  if (!processingContext || video.videoWidth === 0 || video.videoHeight === 0) {
    return runtime.currentDetection;
  }

  const frameWidth = TRACKING_CONFIG.analysisWidthPx;
  const frameHeight = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * frameWidth));

  if (processingCanvas.width !== frameWidth || processingCanvas.height !== frameHeight) {
    processingCanvas.width = frameWidth;
    processingCanvas.height = frameHeight;
  }

  processingContext.drawImage(video, 0, 0, frameWidth, frameHeight);
  const image = processingContext.getImageData(0, 0, frameWidth, frameHeight);
  return detectMarkerInImageData(image.data, frameWidth, frameHeight, runtime.currentDetection);
}

function snapshotRunMetadata(state) {
  const draft = state.modes[state.activeMode].draft;
  const modeConfig = MODE_CONFIG[state.activeMode];
  return {
    mode: state.activeMode,
    modeLabel: modeConfig.label,
    mass: draft.mass,
    length: draft.length,
    springConstant: draft.springConstant,
    secondaryField: modeConfig.secondaryField,
    secondaryLabel: modeConfig.secondaryLabel,
    secondaryValueSuffix: modeConfig.secondaryValueSuffix,
    signalAxisKey: modeConfig.signalAxisKey,
    signalAxisLabel: modeConfig.signalAxisLabel,
    signalAxisPrefix: modeConfig.signalAxisPrefix,
    signalName: modeConfig.signalName,
    notes: draft.notes,
  };
}

function appendRunSample(runtime, detection, nowMs) {
  if (!runtime.run.active || runtime.run.startedAtMs === null) {
    return;
  }

  runtime.run.samples.push({
    elapsedMs: nowMs - runtime.run.startedAtMs,
    axis: detection.detected
      ? getDetectionAxisValue(detection, runtime.run.metadata ? runtime.run.metadata.signalAxisKey : "horizontal")
      : null,
    areaFraction: detection.areaFraction,
  });

  if (nowMs - runtime.run.lastEstimateUpdateMs < TRACKING_CONFIG.liveEstimateIntervalMs) {
    return;
  }

  runtime.run.lastEstimateUpdateMs = nowMs;
  const modeConfig = runtime.run.metadata ? MODE_CONFIG[runtime.run.metadata.mode] : null;
  const signal = buildUniformSignal(runtime.run.samples);
  const estimate = estimateFrequencyFromSignal(signal, modeConfig);
  runtime.run.liveEstimate = estimate
    ? {
        ...estimate,
        signal,
      }
    : null;
}

function beginRun(state, runtime) {
  runtime.run.active = true;
  runtime.run.startedAtMs = performance.now();
  runtime.run.samples = [];
  runtime.run.metadata = snapshotRunMetadata(state);
  runtime.run.liveEstimate = null;
  runtime.run.lastEstimateUpdateMs = 0;
  runtime.run.lastCompleted = null;
}

function endRun(runtime) {
  if (!runtime.run.active) {
    return;
  }

  runtime.run.active = false;
  runtime.run.lastCompleted = summarizeRun(runtime.run.samples, runtime.run.metadata);
  runtime.run.liveEstimate = runtime.run.lastCompleted.provisionalEstimate;
  runtime.run.metadata = null;
}

function serializeRunForState(review) {
  return {
    id: makeRunId(),
    savedAt: new Date().toISOString(),
    mode: review.metadata.mode,
    modeLabel: review.metadata.modeLabel,
    mass: review.metadata.mass,
    length: review.metadata.length,
    springConstant: review.metadata.springConstant,
    notes: review.metadata.notes,
    durationS: review.durationS,
    validSampleCount: review.validSampleCount,
    totalSampleCount: review.totalSampleCount,
    detectionRate: review.detectionRate,
    qualityLabel: review.qualityLabel,
    provisionalFrequencyHz: review.provisionalEstimate ? review.provisionalEstimate.frequencyHz : null,
    finalFrequencyHz: review.prony.primaryMode ? review.prony.primaryMode.frequencyHz : null,
    primaryMode: review.prony.primaryMode ? { ...review.prony.primaryMode } : null,
    candidateModes: review.prony.candidateModes.map((mode) => ({ ...mode })),
    sampleDtS: review.prony.sampleDtS,
    preparedSampleCount: review.prony.preparedSampleCount,
  };
}

function waitForVideoReady(video) {
  if (video.readyState >= 2) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    video.addEventListener("loadedmetadata", () => resolve(), { once: true });
  });
}

function drawEmptyCanvas(canvas, message, detail) {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(18, 33, 29, 0.96)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(255, 255, 255, 0.12)";
  context.lineWidth = 1;
  context.setLineDash([10, 12]);
  context.beginPath();
  context.moveTo(20, canvas.height * 0.7);
  context.lineTo(canvas.width - 20, canvas.height * 0.7);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = "rgba(255, 248, 237, 0.86)";
  context.font = "600 18px 'K2D', sans-serif";
  context.textAlign = "center";
  context.fillText(message, canvas.width / 2, canvas.height / 2 - 8);

  if (detail) {
    context.fillStyle = "rgba(255, 248, 237, 0.64)";
    context.font = "500 14px 'K2D', sans-serif";
    context.fillText(detail, canvas.width / 2, canvas.height / 2 + 22);
  }
}

function drawSignalTrace(elements, runtime, modeConfig) {
  const canvas = elements.signalTrace;
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const sourceSamples = runtime.run.active
    ? runtime.run.samples
    : runtime.run.lastCompleted
      ? runtime.run.lastCompleted.samples
      : [];

  const validSamples = sourceSamples.filter((sample) => Number.isFinite(sample.axis));
  if (validSamples.length < 2) {
    drawEmptyCanvas(canvas, "No captured signal yet", modeConfig.traceEmptyDetail);
    return;
  }

  const finalTimeS = validSamples[validSamples.length - 1].elapsedMs / 1000;
  const windowStartS = Math.max(0, finalTimeS - TRACKING_CONFIG.traceWindowS);
  const windowSamples = validSamples.filter((sample) => sample.elapsedMs / 1000 >= windowStartS);
  const axisValues = windowSamples.map((sample) => sample.axis);
  const minAxis = Math.min(...axisValues, -1);
  const maxAxis = Math.max(...axisValues, 1);
  const padding = 24;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(18, 33, 29, 0.96)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  context.lineWidth = 1;
  context.setLineDash([6, 10]);
  for (let row = 1; row <= 3; row += 1) {
    const y = padding + ((canvas.height - padding * 2) * row) / 4;
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(canvas.width - padding, y);
    context.stroke();
  }
  context.setLineDash([]);

  const zeroY =
    canvas.height -
    padding -
    ((0 - minAxis) / Math.max(1e-6, maxAxis - minAxis)) * (canvas.height - padding * 2);
  context.strokeStyle = "rgba(255, 255, 255, 0.18)";
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(padding, zeroY);
  context.lineTo(canvas.width - padding, zeroY);
  context.stroke();

  context.strokeStyle = "#ffd271";
  context.lineWidth = 4;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.beginPath();

  windowSamples.forEach((sample, index) => {
    const timeS = sample.elapsedMs / 1000;
    const x =
      padding +
      ((timeS - windowStartS) / Math.max(1e-6, finalTimeS - windowStartS || 1)) *
        (canvas.width - padding * 2);
    const y =
      canvas.height -
      padding -
      ((sample.axis - minAxis) / Math.max(1e-6, maxAxis - minAxis)) * (canvas.height - padding * 2);

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });

  context.stroke();

  context.fillStyle = "rgba(255, 248, 237, 0.86)";
  context.font = "600 16px 'K2D', sans-serif";
  context.textAlign = "left";
  context.fillText(
    runtime.run.active ? `Live ${modeConfig.signalName} signal` : `Last stopped-run ${modeConfig.signalName} signal`,
    padding,
    22,
  );
}

function drawOverlay(elements, runtime, modeConfig) {
  const canvas = elements.cameraOverlay;
  const context = canvas.getContext("2d");
  const video = elements.cameraPreview;
  if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
    return;
  }

  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(255, 255, 255, 0.42)";
  context.lineWidth = 2;
  context.setLineDash([10, 12]);
  context.beginPath();
  if (modeConfig.signalAxisKey === "vertical") {
    context.moveTo(0, canvas.height / 2);
    context.lineTo(canvas.width, canvas.height / 2);
  } else {
    context.moveTo(canvas.width / 2, 0);
    context.lineTo(canvas.width / 2, canvas.height);
  }
  context.stroke();
  context.setLineDash([]);

  const detection = runtime.currentDetection;
  if (!detection.detected || !detection.bounds) {
    context.fillStyle = "rgba(255, 248, 237, 0.88)";
    context.font = "700 28px 'K2D', sans-serif";
    context.fillText("Searching for red marker", 24, 42);
    return;
  }

  const scaleX = canvas.width / detection.frameWidth;
  const scaleY = canvas.height / detection.frameHeight;
  const centroidX = detection.centroidXPx * scaleX;
  const centroidY = detection.centroidYPx * scaleY;
  const boxX = detection.bounds.minX * scaleX;
  const boxY = detection.bounds.minY * scaleY;
  const boxWidth = Math.max(12, (detection.bounds.maxX - detection.bounds.minX) * scaleX);
  const boxHeight = Math.max(12, (detection.bounds.maxY - detection.bounds.minY) * scaleY);

  context.strokeStyle = "#ffd271";
  context.lineWidth = 4;
  context.strokeRect(boxX, boxY, boxWidth, boxHeight);

  context.fillStyle = "#ef8a17";
  context.beginPath();
  context.arc(centroidX, centroidY, 12, 0, Math.PI * 2);
  context.fill();

  const axisValue = getDetectionAxisValue(detection, modeConfig.signalAxisKey);
  context.fillStyle = "rgba(255, 248, 237, 0.92)";
  context.font = "700 24px 'K2D', sans-serif";
  context.fillText(
    `${modeConfig.signalAxisPrefix} = ${Number.isFinite(axisValue) ? axisValue.toFixed(2) : "--"}`,
    24,
    42,
  );
}

function drawComparisonChart(elements, runs, modeConfig) {
  const canvas = elements.comparisonChart;
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const validPoints = runs
    .map((run, index) => ({
      index,
      x: parseNumeric(run[modeConfig.variedField]),
      y: parseNumeric(run.finalFrequencyHz),
      label: `Run ${runs.length - index}`,
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((left, right) => left.x - right.x);

  if (validPoints.length === 0) {
    drawEmptyCanvas(
      canvas,
      "No saved runs for this mode",
      "Keep reviewed runs to compare final frequency against the varied variable.",
    );
    elements.chartCaption.textContent =
      "Save reviewed runs to compare frequency against the varying setup variable in the current experiment mode.";
    return;
  }

  const minX = Math.min(...validPoints.map((point) => point.x));
  const maxX = Math.max(...validPoints.map((point) => point.x));
  const minY = Math.min(...validPoints.map((point) => point.y));
  const maxY = Math.max(...validPoints.map((point) => point.y));
  const padding = { top: 28, right: 26, bottom: 48, left: 62 };
  const xSpan = Math.max(1e-6, maxX - minX || Math.abs(maxX) * 0.1 || 1);
  const ySpan = Math.max(1e-6, maxY - minY || Math.abs(maxY) * 0.1 || 1);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(18, 33, 29, 0.96)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  context.lineWidth = 1;
  context.setLineDash([6, 10]);
  for (let row = 0; row <= 4; row += 1) {
    const y =
      padding.top + ((canvas.height - padding.top - padding.bottom) * row) / 4;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(canvas.width - padding.right, y);
    context.stroke();
  }
  context.setLineDash([]);

  context.strokeStyle = "rgba(255, 255, 255, 0.22)";
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(padding.left, canvas.height - padding.bottom);
  context.lineTo(canvas.width - padding.right, canvas.height - padding.bottom);
  context.lineTo(canvas.width - padding.right, padding.top);
  context.stroke();

  context.strokeStyle = "#ffd271";
  context.lineWidth = 3;
  context.beginPath();
  validPoints.forEach((point, index) => {
    const x =
      padding.left +
      ((point.x - minX) / xSpan) * (canvas.width - padding.left - padding.right);
    const y =
      canvas.height -
      padding.bottom -
      ((point.y - minY) / ySpan) * (canvas.height - padding.top - padding.bottom);

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();

  context.fillStyle = "#ef8a17";
  validPoints.forEach((point) => {
    const x =
      padding.left +
      ((point.x - minX) / xSpan) * (canvas.width - padding.left - padding.right);
    const y =
      canvas.height -
      padding.bottom -
      ((point.y - minY) / ySpan) * (canvas.height - padding.top - padding.bottom);

    context.beginPath();
    context.arc(x, y, 6, 0, Math.PI * 2);
    context.fill();
  });

  context.fillStyle = "rgba(255, 248, 237, 0.84)";
  context.font = "600 16px 'K2D', sans-serif";
  context.textAlign = "left";
  context.fillText(`${modeConfig.label}: frequency vs ${modeConfig.variedVariable.toLowerCase()}`, padding.left, 20);

  context.font = "500 14px 'K2D', sans-serif";
  context.fillText("Frequency (Hz)", 14, padding.top + 10);
  context.fillText(
    `${modeConfig.variedVariable} (${modeConfig.variedUnit})`,
    canvas.width - padding.right - 170,
    canvas.height - 16,
  );

  elements.chartCaption.textContent =
    `${modeConfig.label} comparison using final Prony frequencies against ${modeConfig.variedVariable.toLowerCase()}.`;
}

function renderCandidateTable(elements, review) {
  elements.candidateTableBody.textContent = "";

  if (!review || review.prony.candidateModes.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = review && review.prony.error ? review.prony.error : "No Prony candidates yet.";
    row.appendChild(cell);
    elements.candidateTableBody.appendChild(row);
    return;
  }

  for (const mode of review.prony.candidateModes) {
    const row = document.createElement("tr");
    const values = [
      mode.rank > 0 ? `#${mode.rank}` : "Candidate",
      formatFrequency(mode.frequencyHz),
      formatPeriod(mode.periodS),
      formatAmplitude(mode.amplitudePx),
      formatDamping(mode.dampingPerS),
      mode.status,
    ];

    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }

    elements.candidateTableBody.appendChild(row);
  }
}

function renderModePanel(elements, state) {
  const mode = MODE_CONFIG[state.activeMode];
  const activeDraft = state.modes[state.activeMode].draft;

  for (const tab of elements.modeTabs) {
    const isActive = tab.dataset.mode === state.activeMode;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  }

  elements.modePanel.setAttribute(
    "aria-labelledby",
    mode.tabId,
  );
  elements.modeTitle.textContent = mode.label;
  elements.modeSummary.textContent = mode.summary;
  elements.controlledVariable.textContent = mode.controlledVariable;
  elements.variedVariable.textContent = mode.variedVariable;
  elements.modeWarning.textContent = mode.warning;
  elements.axisStatusLabel.textContent = mode.signalAxisLabel;
  elements.cameraTitle.textContent = mode.cameraTitle;
  elements.cameraDescription.textContent = mode.cameraDescription;
  elements.cameraMotionTip.textContent = mode.cameraMotionTip;
  elements.reviewSecondaryLabel.textContent = mode.reviewSecondaryLabel;
  elements.savedRunsSecondaryHeader.textContent = mode.secondaryHeaderLabel;
  elements.springConstantLabel.textContent = mode.secondaryField === "springConstant"
    ? mode.secondaryInputLabel
    : MODE_CONFIG["spring-pendulum"].secondaryInputLabel;

  elements.massInput.value = activeDraft.mass;
  elements.lengthInput.value = activeDraft.length;
  elements.springConstantInput.value = activeDraft.springConstant;
  elements.notesInput.value = activeDraft.notes;

  const useLengthField = mode.secondaryField === "length";
  elements.lengthField.classList.toggle("is-hidden", !useLengthField);
  elements.springConstantField.classList.toggle("is-hidden", useLengthField);
  elements.springConstantInput.placeholder = MODE_CONFIG["spring-pendulum"].secondaryInputPlaceholder;
}

function buildControlWarning(runs, modeConfig) {
  if (runs.length < 2) {
    return null;
  }

  const controlledValues = runs
    .map((run) => parseNumeric(run[modeConfig.controlledField]))
    .filter((value) => Number.isFinite(value));

  if (controlledValues.length < 2) {
    return null;
  }

  const baseline = controlledValues[0];
  const drifted = controlledValues.filter(
    (value) => Math.abs(value - baseline) > modeConfig.controlledTolerance,
  );

  if (drifted.length === 0) {
    return null;
  }

  return `${modeConfig.controlledVariable} should stay fixed in ${modeConfig.label}. Baseline is ${baseline.toFixed(
    modeConfig.controlledDecimals,
  )} ${modeConfig.controlledUnit}, but ${pluralize("saved run", drifted.length)} drift beyond the soft tolerance.`;
}

function renderSavedRuns(elements, state, runtime) {
  const activeRuns = state.modes[state.activeMode].runs;
  const modeConfig = MODE_CONFIG[state.activeMode];

  let totalRuns = 0;
  for (const modeId of Object.keys(MODE_CONFIG)) {
    totalRuns += state.modes[modeId].runs.length;
  }

  elements.savedRunCount.textContent = String(totalRuns);
  elements.activeModeRunCount.textContent = pluralize("run", activeRuns.length);

  const activeDraft = state.modes[state.activeMode].draft;
  const populatedFields = [activeDraft.mass, activeDraft[modeConfig.secondaryField]].filter(Boolean).length;
  elements.draftCompleteness.textContent = `${populatedFields} / 2 fields`;
  elements.storedModeCount.textContent = String(Object.keys(MODE_CONFIG).length);
  elements.savedRunsSecondaryHeader.textContent = modeConfig.secondaryHeaderLabel;

  const warning = buildControlWarning(activeRuns, modeConfig);
  if (warning) {
    elements.controlWarning.textContent = warning;
    elements.controlWarning.classList.remove("is-hidden");
  } else {
    elements.controlWarning.textContent = "";
    elements.controlWarning.classList.add("is-hidden");
  }

  elements.savedRunsBody.textContent = "";
  if (activeRuns.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = `No saved runs yet for ${modeConfig.label}.`;
    row.appendChild(cell);
    elements.savedRunsBody.appendChild(row);
  } else {
    activeRuns.forEach((run, index) => {
      const row = document.createElement("tr");
      const values = [
        `Run ${activeRuns.length - index}`,
        formatTimestamp(run.savedAt),
        formatValue(run.mass, " g"),
        formatSecondaryValue(run, modeConfig),
        formatFrequency(run.finalFrequencyHz),
        run.qualityLabel,
      ];

      for (const value of values) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      }

      const actionCell = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "table-button";
      button.dataset.deleteRunId = run.id;
      button.textContent = "Delete";
      if (runtime.run.active || isReviewPending(runtime)) {
        button.disabled = true;
      }
      actionCell.appendChild(button);
      row.appendChild(actionCell);
      elements.savedRunsBody.appendChild(row);
    });
  }

  drawComparisonChart(elements, activeRuns, modeConfig);
}

function renderReview(elements, state, runtime) {
  const review = runtime.run.lastCompleted;
  const fallbackDraft = state.modes[state.activeMode].draft;
  const metadata = review ? review.metadata : null;
  const modeConfig = metadata ? MODE_CONFIG[metadata.mode] : MODE_CONFIG[state.activeMode];

  elements.reviewMode.textContent = metadata ? metadata.modeLabel : modeConfig.label;
  elements.reviewMass.textContent = metadata ? formatValue(metadata.mass, " g") : formatValue(fallbackDraft.mass, " g");
  elements.reviewSecondaryLabel.textContent = modeConfig.reviewSecondaryLabel;
  elements.reviewSecondary.textContent = metadata
    ? formatSecondaryValue(metadata, modeConfig)
    : formatSecondaryValue(fallbackDraft, modeConfig);

  if (!review) {
    elements.captureEstimateValue.textContent = "Awaiting captured run";
    elements.captureDurationValue.textContent = "0.0 s";
    elements.captureSamplesValue.textContent = "0";
    elements.captureQualityValue.textContent = "No capture yet";
    elements.primaryModeTitle.textContent = "Awaiting stopped run";
    elements.primaryModeSummary.textContent =
      "Stop a run to prepare the signal, fit Prony modes, and select the strongest stable candidate as the final frequency estimate.";
    elements.reviewStatusTitle.textContent = "No run pending";
    elements.reviewStatusText.textContent =
      "Stopped runs stay in review until you either keep them in the current session or discard them.";
    renderCandidateTable(elements, null);
    return;
  }

  const primaryMode = review.prony.primaryMode;
  elements.captureEstimateValue.textContent = primaryMode
    ? formatFrequency(primaryMode.frequencyHz)
    : "No stable Prony mode";
  elements.captureDurationValue.textContent = `${review.durationS.toFixed(1)} s`;
  elements.captureSamplesValue.textContent = `${review.validSampleCount} / ${review.totalSampleCount}`;
  elements.captureQualityValue.textContent = `${review.qualityLabel} · ${Math.round(
    review.detectionRate * 100,
  )}% visible`;

  const analysedNote = review.signal
    ? ` Analysed the last ${review.signal.durationS.toFixed(1)} s at ${Math.round(
        1 / review.signal.dtS,
      )} samples/s.`
    : "";

  if (primaryMode) {
    elements.primaryModeTitle.textContent = `${formatFrequency(primaryMode.frequencyHz)} selected`;
    elements.primaryModeSummary.textContent =
      `Period ${formatPeriod(primaryMode.periodS)}, amplitude ${formatAmplitude(
        primaryMode.amplitudePx,
      )}, damping ${formatDamping(primaryMode.dampingPerS)}.${analysedNote}`;
  } else {
    elements.primaryModeTitle.textContent = "No stable final mode";
    elements.primaryModeSummary.textContent =
      (review.prony.error ||
        "The stopped run did not produce a stable Prony candidate inside the allowed range.") +
      analysedNote;
  }

  if (review.pendingReview) {
    elements.reviewStatusTitle.textContent = "Review required";
    elements.reviewStatusText.textContent = primaryMode
      ? "This stopped run is ready to keep or discard."
      : "Discard this run or capture another one with cleaner marker visibility.";
  } else if (review.savedAt) {
    elements.reviewStatusTitle.textContent = "Run saved";
    elements.reviewStatusText.textContent = `Saved locally on ${formatTimestamp(review.savedAt)}.`;
  } else {
    elements.reviewStatusTitle.textContent = "Run discarded";
    elements.reviewStatusText.textContent = "This stopped run was discarded and is no longer pending.";
  }

  renderCandidateTable(elements, review);
}

function renderDiagnostics(elements, state, runtime) {
  const modeConfig = getCurrentModeConfig(state, runtime);
  let runState = "Camera off";
  if (runtime.stream) {
    runState = runtime.run.active ? "Running" : "Preview ready";
  }
  if (isReviewPending(runtime)) {
    runState = "Review pending";
  }

  elements.runStateValue.textContent = runState;
  elements.axisStatusLabel.textContent = modeConfig.signalAxisLabel;
  elements.liveFrequencyLabel.textContent = `Live Frequency (${formatFrequencyRange(modeConfig)})`;

  if (!runtime.stream) {
    elements.markerStatusValue.textContent = "Waiting for preview";
    elements.axisStatusValue.textContent = "No signal";
    elements.liveFrequencyValue.textContent = "Awaiting run";
  } else if (runtime.currentDetection.detected) {
    elements.markerStatusValue.textContent = "Red marker tracked";
    elements.axisStatusValue.textContent = formatTrackedAxisValue(
      getDetectionAxisValue(runtime.currentDetection, modeConfig.signalAxisKey),
      modeConfig,
    );
    if (runtime.run.active) {
      elements.liveFrequencyValue.textContent = runtime.run.liveEstimate
        ? formatFrequency(runtime.run.liveEstimate.frequencyHz)
        : "Estimating...";
    } else if (runtime.run.lastCompleted && runtime.run.lastCompleted.prony.primaryMode) {
      elements.liveFrequencyValue.textContent = `Final ${formatFrequency(
        runtime.run.lastCompleted.prony.primaryMode.frequencyHz,
      )}`;
    } else if (runtime.run.lastCompleted && runtime.run.lastCompleted.provisionalEstimate) {
      elements.liveFrequencyValue.textContent = `Provisional ${formatFrequency(
        runtime.run.lastCompleted.provisionalEstimate.frequencyHz,
      )}`;
    } else {
      elements.liveFrequencyValue.textContent = "Ready for run";
    }
  } else {
    elements.markerStatusValue.textContent = "Searching for marker";
    elements.axisStatusValue.textContent = "No lock";
    elements.liveFrequencyValue.textContent = runtime.run.active ? "Estimating..." : "Ready for run";
  }

  if (runtime.run.active) {
    elements.traceCaption.textContent =
      `Live ${modeConfig.signalName} trace is updating during capture. The live readout is provisional until the run stops and Prony analysis completes.`;
  } else if (runtime.run.lastCompleted && runtime.run.lastCompleted.prony.primaryMode) {
    elements.traceCaption.textContent =
      "This stopped run has a final Prony estimate. Keep it to add the run into the current experiment session.";
  } else if (runtime.run.lastCompleted) {
    elements.traceCaption.textContent =
      `This stopped run did not produce a stable Prony mode inside ${formatFrequencyRange(
        modeConfig,
      )}. Improve marker visibility or run duration and try again.`;
  } else {
    elements.traceCaption.textContent =
      `Start a run to capture the ${modeConfig.signalName} marker signal. Final stopped-run frequency is now selected from browser-side Prony analysis.`;
  }

  drawSignalTrace(elements, runtime, modeConfig);
  if (runtime.stream) {
    drawOverlay(elements, runtime, modeConfig);
  } else {
    const overlayContext = elements.cameraOverlay.getContext("2d");
    if (overlayContext) {
      overlayContext.clearRect(0, 0, elements.cameraOverlay.width, elements.cameraOverlay.height);
    }
  }
}

function updateButtons(elements, runtime) {
  const cameraActive = Boolean(runtime.stream);
  const reviewPending = isReviewPending(runtime);

  elements.cameraToggleButton.disabled = runtime.run.active;
  elements.startRunButton.disabled = !cameraActive || runtime.run.active || reviewPending;
  elements.stopRunButton.disabled = !cameraActive || !runtime.run.active;
  elements.saveRunButton.disabled =
    !reviewPending || !(runtime.run.lastCompleted && runtime.run.lastCompleted.prony.primaryMode);
  elements.discardRunButton.disabled = !reviewPending;
  elements.clearModeButton.disabled = runtime.run.active || reviewPending;
  elements.resetAllButton.disabled = runtime.run.active || reviewPending;
  elements.saveDraftButton.disabled = runtime.run.active || reviewPending;

  for (const tab of elements.modeTabs) {
    tab.disabled = runtime.run.active || reviewPending;
  }

  elements.massInput.disabled = runtime.run.active || reviewPending;
  elements.lengthInput.disabled = runtime.run.active || reviewPending;
  elements.springConstantInput.disabled = runtime.run.active || reviewPending;
  elements.notesInput.disabled = runtime.run.active || reviewPending;
}

function refreshUI(elements, state, runtime) {
  renderModePanel(elements, state);
  renderReview(elements, state, runtime);
  renderDiagnostics(elements, state, runtime);
  renderSavedRuns(elements, state, runtime);
  updateButtons(elements, runtime);
}

function getStreamFrameRate(stream, fallbackFps) {
  try {
    const [track] = stream ? stream.getVideoTracks() : [];
    const settings = track && typeof track.getSettings === "function" ? track.getSettings() : null;
    if (settings && Number.isFinite(settings.frameRate) && settings.frameRate > 0) {
      return settings.frameRate;
    }
  } catch (_error) {
    // Fall through to the default rate.
  }
  return fallbackFps;
}

function startTrackingLoop(elements, runtime, state) {
  if (runtime.frameRequest !== null) {
    return;
  }

  const video = elements.cameraPreview;
  // Sample once per camera frame. requestVideoFrameCallback fires exactly then;
  // the requestAnimationFrame fallback is throttled to the track's frame rate so
  // a 144 Hz display does not record the same camera frame five times over.
  const useVideoFrames = typeof video.requestVideoFrameCallback === "function";
  const fallbackIntervalMs = useVideoFrames ? 0 : 1000 / getStreamFrameRate(runtime.stream, 30);
  let lastSampleMs = -Infinity;

  const schedule = (callback) => {
    if (useVideoFrames) {
      const id = video.requestVideoFrameCallback(callback);
      runtime.frameRequest = { cancel: () => video.cancelVideoFrameCallback(id) };
    } else {
      const id = window.requestAnimationFrame(callback);
      runtime.frameRequest = { cancel: () => window.cancelAnimationFrame(id) };
    }
  };

  const step = (now) => {
    if (!runtime.stream) {
      runtime.frameRequest = null;
      return;
    }

    const nowMs = typeof now === "number" ? now : performance.now();
    const ready = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
    if (ready && nowMs - lastSampleMs >= fallbackIntervalMs - 1) {
      lastSampleMs = nowMs;
      runtime.currentDetection = analyzeMarkerFrame(video, runtime);
      appendRunSample(runtime, runtime.currentDetection, nowMs);
      // Only the live readouts change per frame; the session, review and mode
      // panels re-render on user actions so their buttons stay clickable.
      renderDiagnostics(elements, state, runtime);
    }

    schedule(step);
  };

  schedule(step);
}

function stopTrackingLoop(runtime) {
  if (runtime.frameRequest !== null) {
    runtime.frameRequest.cancel();
    runtime.frameRequest = null;
  }
}

async function enableCamera(elements, runtime, state) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Camera preview is not supported in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "environment",
    },
    audio: false,
  });

  runtime.stream = stream;
  elements.cameraPreview.srcObject = stream;
  await waitForVideoReady(elements.cameraPreview);
  await elements.cameraPreview.play().catch(() => {});

  elements.cameraPreview.classList.remove("is-hidden");
  elements.cameraPlaceholder.classList.add("is-hidden");
  elements.cameraStage.style.aspectRatio = `${elements.cameraPreview.videoWidth} / ${elements.cameraPreview.videoHeight}`;

  startTrackingLoop(elements, runtime, state);
  refreshUI(elements, state, runtime);
}

function disableCamera(elements, runtime) {
  if (runtime.run.active) {
    endRun(runtime);
  }

  stopTrackingLoop(runtime);

  if (runtime.stream) {
    for (const track of runtime.stream.getTracks()) {
      track.stop();
    }
  }

  runtime.stream = null;
  runtime.currentDetection = createEmptyDetection();
  elements.cameraPreview.srcObject = null;
  elements.cameraPreview.classList.add("is-hidden");
  elements.cameraPlaceholder.classList.remove("is-hidden");
  elements.cameraStage.style.removeProperty("aspect-ratio");
}

function persistDraftField(state, modeId, field, value) {
  state.modes[modeId].draft[field] = value;
}

function init() {
  const yearNode = document.getElementById("current-year");
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }

  const elements = {
    activeModeRunCount: document.getElementById("active-mode-run-count"),
    axisStatusValue: document.getElementById("axis-status-value"),
    axisStatusLabel: document.querySelector("[data-axis-status-label]"),
    cameraOverlay: document.getElementById("camera-overlay"),
    cameraPlaceholder: document.getElementById("camera-placeholder"),
    cameraPreview: document.getElementById("camera-preview"),
    cameraStage: document.querySelector(".camera-stage"),
    cameraTitle: document.querySelector("[data-camera-title]"),
    cameraDescription: document.querySelector("[data-camera-description]"),
    cameraMotionTip: document.querySelector("[data-camera-motion-tip]"),
    cameraToggleButton: document.getElementById("camera-toggle-button"),
    candidateTableBody: document.getElementById("candidate-table-body"),
    captureDurationValue: document.getElementById("capture-duration-value"),
    captureEstimateValue: document.getElementById("capture-estimate-value"),
    captureQualityValue: document.getElementById("capture-quality-value"),
    captureSamplesValue: document.getElementById("capture-samples-value"),
    clearModeButton: document.getElementById("clear-mode-button"),
    comparisonChart: document.getElementById("comparison-chart"),
    controlWarning: document.getElementById("control-warning"),
    controlledVariable: document.querySelector("[data-controlled-variable]"),
    draftCompleteness: document.getElementById("draft-completeness"),
    chartCaption: document.getElementById("chart-caption"),
    discardRunButton: document.getElementById("discard-run-button"),
    exportButton: document.getElementById("export-button"),
    lengthInput: document.getElementById("length-input"),
    lengthField: document.getElementById("length-field"),
    liveFrequencyLabel: document.querySelector("[data-live-frequency-label]"),
    liveFrequencyValue: document.getElementById("live-frequency-value"),
    markerStatusValue: document.getElementById("marker-status-value"),
    massInput: document.getElementById("mass-input"),
    modePanel: document.getElementById("mode-panel"),
    modeSummary: document.querySelector("[data-mode-summary]"),
    modeTabs: document.querySelectorAll(".mode-tab"),
    modeTitle: document.querySelector("[data-mode-title]"),
    modeWarning: document.querySelector("[data-mode-warning]"),
    notesInput: document.getElementById("notes-input"),
    primaryModeTitle: document.getElementById("primary-mode-title"),
    primaryModeSummary: document.getElementById("primary-mode-summary"),
    resetAllButton: document.getElementById("reset-all-button"),
    reviewMass: document.querySelector("[data-review-mass]"),
    reviewMode: document.querySelector("[data-review-mode]"),
    reviewSecondary: document.querySelector("[data-review-secondary]"),
    reviewSecondaryLabel: document.querySelector("[data-review-secondary-label]"),
    reviewStatusText: document.getElementById("review-status-text"),
    reviewStatusTitle: document.getElementById("review-status-title"),
    runStateValue: document.getElementById("run-state-value"),
    saveDraftButton: document.getElementById("save-draft-button"),
    savedRunCount: document.getElementById("saved-run-count"),
    savedRunsSecondaryHeader: document.getElementById("saved-runs-secondary-header"),
    savedRunsBody: document.getElementById("saved-runs-body"),
    saveRunButton: document.getElementById("save-run-button"),
    signalTrace: document.getElementById("signal-trace"),
    startRunButton: document.getElementById("start-run-button"),
    stopRunButton: document.getElementById("stop-run-button"),
    storageStatus: document.getElementById("storage-status"),
    storedModeCount: document.getElementById("stored-mode-count"),
    springConstantField: document.getElementById("spring-constant-field"),
    springConstantInput: document.getElementById("spring-constant-input"),
    springConstantLabel: document.querySelector("[data-spring-constant-label]"),
    traceCaption: document.getElementById("trace-caption"),
    variedVariable: document.querySelector("[data-varied-variable]"),
  };

  const state = loadState();
  const runtime = createRuntime();

  refreshUI(elements, state, runtime);

  document.querySelectorAll("[data-animation-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.closest("[data-animation-panel]");
      if (!panel) {
        return;
      }

      const paused = panel.classList.toggle("is-paused");
      panel.querySelectorAll("svg").forEach((svg) => {
        if (typeof svg.pauseAnimations !== "function" || typeof svg.unpauseAnimations !== "function") {
          return;
        }

        if (paused) {
          svg.pauseAnimations();
        } else {
          svg.unpauseAnimations();
        }
      });
      button.textContent = paused ? "Play" : "Pause";
      button.setAttribute("aria-pressed", String(paused));
    });
  });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll("[data-animation-panel]").forEach((panel) => {
      panel.classList.add("is-paused");
      panel.querySelectorAll("svg").forEach((svg) => {
        if (typeof svg.pauseAnimations === "function") {
          svg.pauseAnimations();
        }
      });

      const button = panel.querySelector("[data-animation-toggle]");
      if (button) {
        button.textContent = "Play";
        button.setAttribute("aria-pressed", "true");
      }
    });
  }

  const fieldBindings = [
    ["massInput", "mass"],
    ["lengthInput", "length"],
    ["springConstantInput", "springConstant"],
    ["notesInput", "notes"],
  ];

  for (const [elementKey, fieldName] of fieldBindings) {
    elements[elementKey].addEventListener("input", (event) => {
      persistDraftField(state, state.activeMode, fieldName, event.target.value);
      saveState(state);
      refreshUI(elements, state, runtime);
      setStorageMessage(elements, "Draft saved locally.");
    });
  }

  for (const tab of elements.modeTabs) {
    tab.addEventListener("click", () => {
      const nextMode = tab.dataset.mode;
      if (!(nextMode in MODE_CONFIG) || runtime.run.active || isReviewPending(runtime)) {
        return;
      }

      state.activeMode = nextMode;
      saveState(state);
      refreshUI(elements, state, runtime);
      setStorageMessage(elements, `Switched to ${MODE_CONFIG[nextMode].label}.`);
    });
  }

  elements.saveDraftButton.addEventListener("click", () => {
    if (runtime.run.active || isReviewPending(runtime)) {
      return;
    }
    state.modes[state.activeMode].lastSavedAt = new Date().toISOString();
    saveState(state);
    refreshUI(elements, state, runtime);
    setStorageMessage(elements, "Current mode draft checkpoint saved.");
  });

  elements.exportButton.addEventListener("click", () => {
    const filename = `physlab-session-${state.activeMode}.json`;
    downloadJson(filename, state);
    setStorageMessage(elements, "Session JSON exported.");
  });

  elements.clearModeButton.addEventListener("click", () => {
    if (runtime.run.active || isReviewPending(runtime)) {
      return;
    }

    state.modes[state.activeMode] = createDefaultModeState();
    saveState(state);
    refreshUI(elements, state, runtime);
    setStorageMessage(elements, "Current mode draft and saved runs cleared.");
  });

  elements.resetAllButton.addEventListener("click", () => {
    if (runtime.run.active || isReviewPending(runtime)) {
      return;
    }

    const nextState = createDefaultState();
    state.activeMode = nextState.activeMode;
    state.modes = nextState.modes;
    saveState(state);
    runtime.run.lastCompleted = null;
    refreshUI(elements, state, runtime);
    setStorageMessage(elements, "All local state reset.");
  });

  elements.cameraToggleButton.addEventListener("click", async () => {
    try {
      if (runtime.stream) {
        disableCamera(elements, runtime);
        refreshUI(elements, state, runtime);
        setStorageMessage(elements, "Camera preview disabled.");
      } else {
        await enableCamera(elements, runtime, state);
        setStorageMessage(elements, "Camera preview enabled. Place the red marker in frame.");
      }
    } catch (error) {
      disableCamera(elements, runtime);
      refreshUI(elements, state, runtime);
      const message =
        error instanceof Error ? error.message : "Camera preview could not be enabled.";
      setStorageMessage(elements, message);
    }
  });

  elements.startRunButton.addEventListener("click", () => {
    if (!runtime.stream || runtime.run.active || isReviewPending(runtime)) {
      return;
    }

    beginRun(state, runtime);
    refreshUI(elements, state, runtime);
    setStorageMessage(elements, "Run started. Capture several oscillations, then stop for final review.");
  });

  elements.stopRunButton.addEventListener("click", () => {
    if (!runtime.run.active) {
      return;
    }

    endRun(runtime);
    refreshUI(elements, state, runtime);
    setStorageMessage(
      elements,
      runtime.run.lastCompleted && runtime.run.lastCompleted.prony.primaryMode
        ? "Run stopped. Review the selected Prony mode and keep or discard the run."
        : "Run stopped. No stable Prony mode survived filtering; review and discard this run.",
    );
  });

  elements.saveRunButton.addEventListener("click", () => {
    const review = runtime.run.lastCompleted;
    if (!review || !review.pendingReview || !review.prony.primaryMode) {
      return;
    }

    const savedRun = serializeRunForState(review);
    state.modes[state.activeMode].runs.unshift(savedRun);
    state.modes[state.activeMode].lastSavedAt = savedRun.savedAt;
    saveState(state);

    review.pendingReview = false;
    review.savedAt = savedRun.savedAt;
    refreshUI(elements, state, runtime);
    setStorageMessage(elements, "Run kept and added to the current session.");
  });

  elements.discardRunButton.addEventListener("click", () => {
    if (!runtime.run.lastCompleted || !runtime.run.lastCompleted.pendingReview) {
      return;
    }

    runtime.run.lastCompleted = null;
    runtime.run.liveEstimate = null;
    refreshUI(elements, state, runtime);
    setStorageMessage(elements, "Stopped run discarded.");
  });

  elements.savedRunsBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-run-id]");
    if (!button || runtime.run.active || isReviewPending(runtime)) {
      return;
    }

    const runId = button.dataset.deleteRunId;
    state.modes[state.activeMode].runs = state.modes[state.activeMode].runs.filter(
      (run) => run.id !== runId,
    );
    saveState(state);
    refreshUI(elements, state, runtime);
    setStorageMessage(elements, "Saved run deleted from the active mode.");
  });

  window.addEventListener("beforeunload", () => {
    disableCamera(elements, runtime);
  });
}

if (typeof module !== "undefined") {
  module.exports = {
    MODE_CONFIG,
    TRACKING_CONFIG,
    analyzePronySignal,
    buildUniformSignal,
    classifyPronyMode,
    detectMarkerInImageData,
    estimateFrequencyFromSignal,
  };
}

if (typeof document !== "undefined") {
  init();
}
