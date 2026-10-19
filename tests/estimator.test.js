// Regression tests for the browser-side estimator and marker detector in script.js.
// Run with: node --test tests/estimator.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const lab = require(path.join(__dirname, "..", "script.js"));

const ROPE = lab.MODE_CONFIG["mass-independence"];
const SPRING = lab.MODE_CONFIG["spring-pendulum"];

// Deterministic pseudo-random generator so failures are reproducible.
function makeRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// Simulate what the tracking loop records: one sample per display frame (rafHz),
// while the camera only delivers new positions at camHz, so values repeat between
// camera frames exactly as they do in the browser.
function makeSamples({
  components,
  rafHz = 60,
  camHz = 30,
  durationS = 10,
  noise = 0,
  dropRate = 0,
  seed = 1,
}) {
  const rand = makeRandom(seed);
  const samples = [];
  const camDt = 1 / camHz;
  let lastCamFrame = -1;
  let held = 0;
  for (let t = 0; t <= durationS; t += 1 / rafHz) {
    const camFrame = Math.floor(t / camDt);
    if (camFrame !== lastCamFrame) {
      lastCamFrame = camFrame;
      const tc = camFrame * camDt;
      held = noise * (rand() - 0.5);
      for (const { freqHz, amp, dampingPerS = 0, phase = 0 } of components) {
        held += amp * Math.exp(dampingPerS * tc) * Math.cos(2 * Math.PI * freqHz * tc + phase);
      }
    }
    const dropped = rand() < dropRate;
    samples.push({
      elapsedMs: t * 1000 + (rand() - 0.5) * 2,
      axis: dropped ? null : held,
      areaFraction: 0.01,
    });
  }
  return samples;
}

function pendulum(overrides = {}) {
  return makeSamples({
    components: [{ freqHz: 0.58, amp: 0.4, dampingPerS: -0.02 }],
    noise: 0.02,
    ...overrides,
  });
}

function assertWithinPercent(actual, expected, percent, label) {
  const tolerance = Math.abs(expected) * (percent / 100);
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} ±${percent}%, got ${actual}`,
  );
}

test("buildUniformSignal keeps the configured number of seconds on a 144 Hz display", () => {
  const signal = lab.buildUniformSignal(pendulum({ rafHz: 144, durationS: 10 }));
  assert.ok(signal, "signal should be prepared");
  assert.ok(
    signal.durationS >= Math.min(9.5, lab.TRACKING_CONFIG.estimatorWindowS - 0.5),
    `window should be time based, got ${signal.durationS.toFixed(2)} s`,
  );
});

test("buildUniformSignal honours a longer window for the final stopped-run analysis", () => {
  const signal = lab.buildUniformSignal(pendulum({ rafHz: 60, durationS: 30 }), {
    windowS: lab.TRACKING_CONFIG.finalWindowS,
  });
  assert.ok(signal);
  assert.ok(signal.durationS >= 29.5, `expected the whole 30 s run, got ${signal.durationS.toFixed(2)} s`);
});

test("buildUniformSignal resamples to the analysis rate so dt does not follow display refresh", () => {
  const fast = lab.buildUniformSignal(pendulum({ rafHz: 144 }));
  const slow = lab.buildUniformSignal(pendulum({ rafHz: 60 }));
  const expectedDt = 1 / lab.TRACKING_CONFIG.analysisRateHz;
  assertWithinPercent(fast.dtS, expectedDt, 5, "dt at 144 Hz");
  assertWithinPercent(slow.dtS, expectedDt, 5, "dt at 60 Hz");
});

test("estimator recovers a 0.58 Hz pendulum on a 60 Hz display with a 30 fps camera", () => {
  const signal = lab.buildUniformSignal(pendulum({ rafHz: 60 }));
  const provisional = lab.estimateFrequencyFromSignal(signal, ROPE);
  const prony = lab.analyzePronySignal(signal, ROPE);
  assertWithinPercent(provisional && provisional.frequencyHz, 0.58, 2, "provisional");
  assertWithinPercent(prony.primaryMode && prony.primaryMode.frequencyHz, 0.58, 2, "prony");
});

test("estimator recovers a 0.58 Hz pendulum on a 144 Hz display with a 30 fps camera", () => {
  const signal = lab.buildUniformSignal(pendulum({ rafHz: 144 }));
  const provisional = lab.estimateFrequencyFromSignal(signal, ROPE);
  const prony = lab.analyzePronySignal(signal, ROPE);
  assertWithinPercent(provisional && provisional.frequencyHz, 0.58, 2, "provisional");
  assertWithinPercent(prony.primaryMode && prony.primaryMode.frequencyHz, 0.58, 2, "prony");
});

test("estimator tolerates dropped frames", () => {
  const signal = lab.buildUniformSignal(pendulum({ rafHz: 60, dropRate: 0.1 }));
  const prony = lab.analyzePronySignal(signal, ROPE);
  assertWithinPercent(prony.primaryMode && prony.primaryMode.frequencyHz, 0.58, 2, "prony");
});

test("estimator recovers a 3.2 Hz stiff spring inside the spring-mode range", () => {
  const samples = makeSamples({
    components: [{ freqHz: 3.2, amp: 0.3, dampingPerS: -0.05 }],
    noise: 0.01,
    durationS: 8,
  });
  const signal = lab.buildUniformSignal(samples);
  const provisional = lab.estimateFrequencyFromSignal(signal, SPRING);
  const prony = lab.analyzePronySignal(signal, SPRING);
  assertWithinPercent(provisional && provisional.frequencyHz, 3.2, 2, "provisional");
  assertWithinPercent(prony.primaryMode && prony.primaryMode.frequencyHz, 3.2, 2, "prony");
});

test("provisional estimator refuses a signal faster than the mode range instead of reporting a period multiple", () => {
  const samples = makeSamples({
    components: [{ freqHz: 3.2, amp: 0.3, dampingPerS: -0.05 }],
    noise: 0.01,
    durationS: 8,
  });
  const signal = lab.buildUniformSignal(samples);
  const provisional = lab.estimateFrequencyFromSignal(signal, ROPE);
  assert.equal(provisional, null, `expected null for an out-of-range signal, got ${JSON.stringify(provisional)}`);
});

test("Prony lists an out-of-range mode as rejected instead of silently dropping it", () => {
  const samples = makeSamples({
    components: [{ freqHz: 3.2, amp: 0.3, dampingPerS: -0.05 }],
    noise: 0.01,
    durationS: 8,
  });
  const prony = lab.analyzePronySignal(lab.buildUniformSignal(samples), ROPE);
  const outOfRange = prony.candidateModes.find((mode) => Math.abs(mode.frequencyHz - 3.2) < 0.1);
  assert.ok(outOfRange, "the 3.2 Hz mode should still be listed for review");
  assert.match(outOfRange.status, /^Rejected: outside/);
  assert.equal(prony.primaryMode, null);
});

test("classifyPronyMode rejects modes outside the mode range, growing modes, and fast-decaying transients", () => {
  const inRange = { frequencyHz: 0.6, dampingPerS: -0.3 };
  assert.equal(lab.classifyPronyMode(inRange, ROPE), null);
  assert.match(lab.classifyPronyMode({ frequencyHz: 3.2, dampingPerS: -0.1 }, ROPE), /^Rejected: outside/);
  assert.equal(lab.classifyPronyMode({ frequencyHz: 3.2, dampingPerS: -0.1 }, SPRING), null);
  assert.equal(lab.classifyPronyMode({ frequencyHz: 0.6, dampingPerS: 1.0 }, ROPE), "Rejected: unstable");
  assert.equal(lab.classifyPronyMode({ frequencyHz: 0.6, dampingPerS: -6.0 }, ROPE), "Rejected: overdamped");
  assert.equal(lab.classifyPronyMode({ frequencyHz: 0.6, dampingPerS: -4.0 }, ROPE), null);
});

// ---------------------------------------------------------------------------
// Marker detection on raw RGBA pixel buffers (what analyzeMarkerFrame reads back
// from the processing canvas).

function makeFrame(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 40;
    data[i + 1] = 60;
    data[i + 2] = 50;
    data[i + 3] = 255;
  }
  return { data, width, height };
}

function paintRed(frame, x, y) {
  if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) {
    return;
  }
  const offset = (y * frame.width + x) * 4;
  frame.data[offset] = 220;
  frame.data[offset + 1] = 30;
  frame.data[offset + 2] = 30;
}

function paintDisc(frame, cx, cy, radius) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) {
        paintRed(frame, x, y);
      }
    }
  }
}

function paintRect(frame, x0, y0, width, height) {
  for (let y = y0; y < y0 + height; y += 1) {
    for (let x = x0; x < x0 + width; x += 1) {
      paintRed(frame, x, y);
    }
  }
}

function detect(frame, previous = null) {
  return lab.detectMarkerInImageData(frame.data, frame.width, frame.height, previous);
}

test("detector ignores scattered red noise pixels and returns the blob centroid", () => {
  const frame = makeFrame(240, 180);
  paintDisc(frame, 70, 100, 12);
  const rand = makeRandom(7);
  for (let i = 0; i < 60; i += 1) {
    // Even coordinates so every noise pixel lands on the sampling grid.
    const x = 2 * Math.floor(rand() * 120);
    const y = 2 * Math.floor(rand() * 90);
    if (Math.hypot(x - 70, y - 100) > 30) {
      paintRed(frame, x, y);
    }
  }
  const detection = detect(frame);
  assert.equal(detection.detected, true);
  assert.ok(Math.abs(detection.centroidXPx - 70) <= 1.5, `centroid x ${detection.centroidXPx}`);
  assert.ok(Math.abs(detection.centroidYPx - 100) <= 1.5, `centroid y ${detection.centroidYPx}`);
});

test("detector picks the largest blob when there is no previous detection", () => {
  const frame = makeFrame(240, 180);
  paintDisc(frame, 60, 90, 10);
  paintRect(frame, 190, 40, 40, 40);
  const detection = detect(frame, null);
  assert.equal(detection.detected, true);
  assert.ok(Math.abs(detection.centroidXPx - 210) <= 2, `centroid x ${detection.centroidXPx}`);
  assert.ok(Math.abs(detection.centroidYPx - 60) <= 2, `centroid y ${detection.centroidYPx}`);
});

test("detector keeps following the blob nearest the previous detection over a larger distant blob", () => {
  const frame = makeFrame(240, 180);
  paintDisc(frame, 60, 90, 10);
  paintRect(frame, 190, 40, 40, 40);
  const previous = { detected: true, centroidXPx: 62, centroidYPx: 92 };
  const detection = detect(frame, previous);
  assert.equal(detection.detected, true);
  assert.ok(Math.abs(detection.centroidXPx - 60) <= 2, `centroid x ${detection.centroidXPx}`);
  assert.ok(Math.abs(detection.centroidYPx - 90) <= 2, `centroid y ${detection.centroidYPx}`);
});

test("detector reports no marker when the red area is below the minimum", () => {
  const frame = makeFrame(240, 180);
  paintRect(frame, 100, 100, 3, 3);
  const detection = detect(frame);
  assert.equal(detection.detected, false);
});
