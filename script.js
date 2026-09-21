// ======================================================
// STATE
// 所有 UI 都只修改这里
// p5 draw() 只读取这里
// ======================================================

const MAX_PEAKS = 8;
let LOGO_SCALE = 1;
const CANVAS_SIZE = { width: 500 * LOGO_SCALE, height: 500 * LOGO_SCALE };

const state = {
  "isEditing": false,
  "keepEditing": false,
  "rotation": 0,
  "showGuides": false,
  "baseRadius": 141,
  "baseShapeThickness": 136,
  "speed": 0,
  "baseShapeStrength": 1,
  "baseShapeRotation": 45,
  "baseShapeWaves": [
    {
      "amplitude": 9,
      "frequency": 1,
      "phase": -3.15,
      "type": "sin"
    },
    {
      "amplitude": 7.5,
      "frequency": 3,
      "phase": -1.2,
      "type": "sin"
    },
    {
      "amplitude": 4,
      "frequency": 1,
      "phase": -0.72,
      "type": "cos"
    }
  ],
  "microWaveStrength": 0,
  "peakCount": 4,
  "peakHeight": -60,
  "valleyDepth": 0,
  "peaks": [
    {
      "height": -0.55,
      "angle": 74,
      "width": 0.64
    },
    {
      "height": -0.25,
      "angle": 11,
      "width": 0.98
    },
    {
      "height": -0.35,
      "angle": 195,
      "width": 0.85
    },
    {
      "height": 0.25,
      "angle": 125,
      "width": 0.48
    },
    {
      "height": 2.4,
      "angle": 47,
      "width": 0.66
    },
    {
      "height": 1,
      "angle": 273,
      "width": 1.28
    },
    {
      "height": 0.65,
      "angle": 110,
      "width": 0.4
    },
    {
      "height": 0.9,
      "angle": 290,
      "width": 0.55
    }
  ]
};


let time = 51.787499999997856;
let frameVertices = [];
let frameParameters = null;
const canvasView = {"x": -36.05453853325014, "y": -41.42685945874289, "zoom": 1.099029165595923};
let logoNoiseSeed = 503285139;
let syncCanvasNavigation = () => {};
const INNER_CIRCLE = { x: -7, y: -3, radius: 95 };

const undoHistory = [];
const redoHistory = [];
let pendingHistory = null;
let restoringHistory = false;
let wheelHistoryTimer;
const referenceHistoryUrls = new Set();

function captureLogoHistory() {
  const savedState = JSON.parse(JSON.stringify(state));
  delete savedState.isEditing;
  return {
    state: savedState, time, seed: logoNoiseSeed, scale: LOGO_SCALE,
    canvas: { ...CANVAS_SIZE }, innerCircle: { ...INNER_CIRCLE }, view: { ...canvasView },
    reference: { url: referenceUrl, opacity: String(Number(referenceImage.style.opacity || 0.5) * 100), status: referenceStatus.textContent }
  };
}

function beginLogoChange() {
  if (!restoringHistory && !pendingHistory) pendingHistory = captureLogoHistory();
}

function finishLogoChange() {
  clearTimeout(wheelHistoryTimer);
  if (restoringHistory || !pendingHistory) return;
  const before = pendingHistory;
  pendingHistory = null;
  const after = captureLogoHistory();
  // Animation advancing on its own is not an edit.
  if (JSON.stringify({ ...before, time: 0 }) === JSON.stringify({ ...after, time: 0 })) return;
  undoHistory.push(before);
  if (undoHistory.length > 100) undoHistory.shift();
  redoHistory.length = 0;
  releaseUnusedReferences();
}

function releaseUnusedReferences() {
  const used = new Set([referenceUrl, pendingHistory?.reference.url,
    ...undoHistory.map(item => item.reference.url), ...redoHistory.map(item => item.reference.url)]);
  for (const url of referenceHistoryUrls) {
    if (!used.has(url)) { URL.revokeObjectURL(url); referenceHistoryUrls.delete(url); }
  }
}

function restoreLogoHistory(saved) {
  restoringHistory = true;
  try {
    for (const key of Object.keys(saved.state)) {
      if (key === "peaks" || key === "baseShapeWaves") {
        saved.state[key].forEach((item, i) => Object.assign(state[key][i], item));
      } else state[key] = saved.state[key];
    }
    time = saved.time;
    logoNoiseSeed = saved.seed;
    noiseSeed(logoNoiseSeed);
    LOGO_SCALE = saved.scale;
    Object.assign(CANVAS_SIZE, saved.canvas);
    Object.assign(INNER_CIRCLE, saved.innerCircle);
    Object.assign(canvasView, saved.view);
    resizeCanvas(CANVAS_SIZE.width, CANVAS_SIZE.height, true);
    referenceRequest++;
    referenceUrl = saved.reference.url;
    if (referenceUrl) referenceImage.src = referenceUrl;
    else referenceImage.removeAttribute("src");
    referenceImage.hidden = !referenceUrl;
    referenceOpacity.value = saved.reference.opacity;
    referenceImage.style.opacity = Number(saved.reference.opacity) / 100;
    referenceOpacityValue.textContent = `${saved.reference.opacity}%`;
    referenceOpacity.disabled = removeReference.disabled = !referenceUrl;
    referenceStatus.textContent = saved.reference.status;
    syncLogoControls();
    syncCanvasNavigation();
  } finally { restoringHistory = false; }
}

document.addEventListener("keydown", event => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "z") return;
  event.preventDefault();
  finishLogoChange();
  const from = event.shiftKey ? redoHistory : undoHistory;
  const to = event.shiftKey ? undoHistory : redoHistory;
  if (!from.length) return;
  to.push(captureLogoHistory());
  restoreLogoHistory(from.pop());
}, true);

document.addEventListener("pointerdown", event => {
  if (event.target.closest('#controls input[type="range"], #controls input[type="number"], #canvas-container')) {
    finishLogoChange();
    beginLogoChange();
  }
}, true);
document.addEventListener("input", event => {
  if (event.target.matches('#controls input[type="range"], #controls input[type="number"]')) beginLogoChange();
}, true);
document.addEventListener("change", event => {
  if (event.target.matches('#controls input[type="range"], #controls input[type="number"]')) finishLogoChange();
});
document.addEventListener("pointerup", () => queueMicrotask(finishLogoChange));
document.addEventListener("pointercancel", () => queueMicrotask(finishLogoChange));
document.addEventListener("click", event => {
  if (event.target.closest('#toggle-guides, #keep-editing, #remove-reference')) {
    beginLogoChange();
    queueMicrotask(finishLogoChange);
  }
}, true);

const exportSvgButton = document.getElementById("export-svg");
const exportParametersButton = document.getElementById("export-parameters");
const export10SvgButton = document.getElementById("export-10-svg");
const toggleGuidesButton = document.getElementById("toggle-guides");
toggleGuidesButton.addEventListener("click", () => {
  state.showGuides = !state.showGuides;
  toggleGuidesButton.setAttribute("aria-pressed", String(state.showGuides));
  toggleGuidesButton.textContent = state.showGuides
    ? "Turn off guides"
    : "Turn on guides";
});
let exportingBatch = false;
exportSvgButton.addEventListener("click", () => exportSvg());
exportParametersButton.addEventListener("click", () => exportParameters());
export10SvgButton.addEventListener("click", export10Svg);

async function export10Svg() {
  if (!frameVertices.length || exportingBatch) return;

  exportingBatch = true;
  export10SvgButton.disabled = true;
  const batchName = createExportName();
  try {
    for (let i = 1; i <= 10; i++) {
      if (i > 1) await new Promise(resolve => setTimeout(resolve, 400));
      exportSvg(`${batchName}-${String(i).padStart(2, "0")}.svg`);
    }
  } finally {
    exportingBatch = false;
    export10SvgButton.disabled = false;
  }
}

let lastExportTimestamp = 0;
function createExportName() {
  lastExportTimestamp = Math.max(Date.now(), lastExportTimestamp + 1000);
  const date = new Date(lastExportTimestamp);
  const pad = (value, digits = 2) => String(value).padStart(digits, "0");
  return `omi-logo-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function exportSvg(filename = `${createExportName()}.svg`) {
  if (!frameVertices.length) return;

  const outline = frameVertices.map(([x, y], i) =>
    `${i === 0 ? "M" : "L"} ${x} ${y}`
  ).join(" ") + " Z";
  const cx = width / 2 + INNER_CIRCLE.x * LOGO_SCALE;
  const cy = height / 2 + INNER_CIRCLE.y * LOGO_SCALE;
  const radius = INNER_CIRCLE.radius * LOGO_SCALE;
  // Clip out the inner circle, including where it extends beyond the outline.
  const cutout = `M 0 0 H ${width} V ${height} H 0 Z
    M ${cx - radius} ${cy}
    a ${radius} ${radius} 0 1 0 ${radius * 2} 0
    a ${radius} ${radius} 0 1 0 ${-radius * 2} 0 Z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <clipPath id="ring-cutout" clipPathUnits="userSpaceOnUse">
      <path d="${cutout}" clip-rule="evenodd" />
    </clipPath>
  </defs>
  <g transform="rotate(${frameParameters.state.rotation} ${width / 2} ${height / 2})">
    <path d="${outline}" fill="${FG}" clip-path="url(#ring-cutout)" />
  </g>
</svg>`;
  downloadLogoArtifact(filename, svg, "image/svg+xml;charset=utf-8");
  exportParameters(filename.replace(/\.svg$/i, "") + ".txt", filename);
}

function exportParameters(filename = `${createExportName()}.txt`, svgFilename) {
  if (!frameParameters) return;
  const parameters = {
    formatVersion: 1,
    ...(svgFilename ? { svgFilename } : {}),
    exportedAt: new Date().toISOString(),
    ...frameParameters,
    canvasView: { ...canvasView },
    canvasViewNote: "Preview pan and zoom only; not applied to SVG output."
  };
  downloadLogoArtifact(filename,
    JSON.stringify(parameters, null, 2), "text/plain;charset=utf-8");
}

// Keep this distinct from p5's global downloadFile(data, filename, extension).
function downloadLogoArtifact(filename, contents, type) {
  const file = new File([contents], filename, { type });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const BG = "#ffffff";
const FG = "#000000";

const referenceImage = document.getElementById("reference-image");
const referenceUpload = document.getElementById("reference-upload");
const referenceOpacity = document.getElementById("reference-opacity");
const referenceOpacityValue = document.getElementById("reference-opacity-value");
const removeReference = document.getElementById("remove-reference");
const referenceStatus = document.getElementById("reference-status");
let referenceUrl = null;
let referenceRequest = 0;

referenceUpload.addEventListener("change", async () => {
  const file = referenceUpload.files[0];
  if (!file) return;
  const request = ++referenceRequest;
  const url = URL.createObjectURL(file);
  const probe = new Image();
  probe.src = url;
  try {
    await probe.decode();
    if (request !== referenceRequest) {
      URL.revokeObjectURL(url);
      return;
    }
    beginLogoChange();
    referenceHistoryUrls.add(url);
    referenceUrl = url;
    referenceImage.src = url;
    referenceImage.hidden = false;
    referenceOpacity.disabled = false;
    removeReference.disabled = false;
    referenceStatus.textContent = `${file.name} · Reference only; excluded from SVG exports.`;
    finishLogoChange();
  } catch {
    URL.revokeObjectURL(url);
    if (request === referenceRequest) {
      referenceStatus.textContent = "Unable to load this image. Please choose another image.";
    }
  }
  if (request === referenceRequest) referenceUpload.value = "";
});

referenceOpacity.addEventListener("input", () => {
  referenceImage.style.opacity = Number(referenceOpacity.value) / 100;
  referenceOpacityValue.textContent = `${referenceOpacity.value}%`;
});

removeReference.addEventListener("click", () => {
  referenceRequest++;
  referenceImage.hidden = true;
  referenceImage.removeAttribute("src");
  referenceUrl = null;
  referenceUpload.value = "";
  referenceOpacity.disabled = true;
  removeReference.disabled = true;
  referenceStatus.textContent = "Reference images are not included in SVG exports.";
});


// ======================================================
// HTML ELEMENTS
// ======================================================

const peakCountInput =
  document.getElementById("peak-count");

const baseThicknessInput =
  document.getElementById("base-thickness");

const baseThicknessValue =
  document.getElementById("base-thickness-value");

const speedInput = document.getElementById("animation-speed");
const rotationInput = document.getElementById("shape-rotation");
const rotationValue = document.getElementById("shape-rotation-value");
rotationInput.value = state.rotation;
rotationValue.textContent = `${state.rotation}°`;
rotationInput.addEventListener("input", () => {
  state.rotation = Number(rotationInput.value);
  rotationValue.textContent = `${state.rotation}°`;
});
const speedValue = document.getElementById("animation-speed-value");

const peakHeightInput =
  document.getElementById("peak-height");

const valleyDepthInput =
  document.getElementById("valley-depth");

const peakHeightValue =
  document.getElementById("peak-height-value");

const valleyDepthValue =
  document.getElementById("valley-depth-value");

const peakControlsContainer =
  document.getElementById("peak-controls");


const peakGroups = [];
let controlId = 0;

const importParametersInput = document.getElementById("import-parameters");
const importParametersStatus = document.getElementById("import-parameters-status");
importParametersInput.addEventListener("change", async () => {
  const file = importParametersInput.files[0];
  if (!file) return;
  importParametersInput.disabled = true;
  try {
    const data = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
    validateLogoParameters(data);
    finishLogoChange();
    beginLogoChange();
    // Preserve wave objects: their controls hold references to these objects.
    for (const key of Object.keys(state)) {
      if (key === "peaks" || key === "baseShapeWaves") {
        data.state[key].forEach((item, i) => Object.assign(state[key][i], item));
      } else if (key in data.state) {
        state[key] = data.state[key];
      }
    }
    state.keepEditing = data.state.keepEditing ?? false;
    state.baseShapeThickness = data.state.baseShapeThickness ?? 135;
    state.isEditing = state.keepEditing;
    time = data.animationTime;
    logoNoiseSeed = data.noise.seed;
    noiseSeed(logoNoiseSeed);
    noiseDetail(data.noise.octaves, data.noise.falloff);
    Object.assign(INNER_CIRCLE, data.innerCircle);
    LOGO_SCALE = data.canvas.logoScale;
    Object.assign(CANVAS_SIZE, { width: data.canvas.width, height: data.canvas.height });
    resizeCanvas(CANVAS_SIZE.width, CANVAS_SIZE.height, true);
    Object.assign(canvasView, data.canvasView ?? { x: 0, y: 0, zoom: 1 });
    syncLogoControls();
    syncCanvasNavigation();
    finishLogoChange();
    importParametersStatus.textContent = `Restored: ${file.name}`;
  } catch (error) {
    importParametersStatus.textContent = `Import failed: ${error.message}`;
  } finally {
    importParametersInput.value = "";
    importParametersInput.disabled = false;
  }
});

function validateLogoParameters(data) {
  const fail = () => { throw new Error("Please select a valid parameter TXT file exported by this tool."); };
  const number = (value, min, max) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) fail();
  };
  if (!data || data.formatVersion !== 1 || !data.state) fail();
  const ranges = {
    rotation: [0, 360], baseRadius: [95, 200], speed: [0, 3],
    baseShapeStrength: [0, 3], baseShapeRotation: [0, 360],
    microWaveStrength: [0, 3], peakCount: [1, MAX_PEAKS],
    peakHeight: [-60, 60], valleyDepth: [0, 50]
  };
  for (const [key, range] of Object.entries(ranges)) number(data.state[key], ...range);
  if ("baseShapeThickness" in data.state) number(data.state.baseShapeThickness, 95, 200);
  if (!Number.isInteger(data.state.peakCount)) fail();
  for (const key of ["isEditing", "keepEditing", "showGuides"]) {
    if (key in data.state && typeof data.state[key] !== "boolean") fail();
  }
  if (!Array.isArray(data.state.peaks) || data.state.peaks.length !== MAX_PEAKS) fail();
  for (const peak of data.state.peaks) {
    if (!peak) fail();
    number(peak.height, -3, 3); number(peak.angle, 0, 360); number(peak.width, 0.05, 1.5);
  }
  if (!Array.isArray(data.state.baseShapeWaves) || data.state.baseShapeWaves.length !== 3) fail();
  for (const wave of data.state.baseShapeWaves) {
    if (!wave || !["sin", "cos"].includes(wave.type)) fail();
    number(wave.amplitude, 0, 40); number(wave.frequency, 1, 12); number(wave.phase, -3.15, 3.15);
    if (!Number.isInteger(wave.frequency)) fail();
  }
  number(data.animationTime, 0, Number.MAX_SAFE_INTEGER);
  if (!data.noise || !data.canvas || !data.innerCircle) fail();
  number(data.noise.seed, 0, 4294967295);
  if (!Number.isInteger(data.noise.seed) || data.noise.octaves !== 2 || data.noise.falloff !== 0.5) fail();
  number(data.canvas.width, 1, 4096); number(data.canvas.height, 1, 4096);
  number(data.canvas.logoScale, 0.1, 8);
  for (const key of ["x", "y"]) number(data.innerCircle[key], -4096, 4096);
  number(data.innerCircle.radius, 1, 4096);
  if (data.canvasView) {
    number(data.canvasView.x, -1e7, 1e7); number(data.canvasView.y, -1e7, 1e7);
    number(data.canvasView.zoom, 0.25, 4);
  }
}

function syncLogoControls() {
  const setInput = (input, value) => {
    input.value = value;
    input.dispatchEvent(new Event("input"));
  };
  for (const [id, key] of Object.entries({
    "peak-count": "peakCount", "base-thickness": "baseRadius", "animation-speed": "speed",
    "base-shape-thickness": "baseShapeThickness",
    "shape-rotation": "rotation", "base-shape": "baseShapeStrength", "micro-wave": "microWaveStrength",
    "peak-height": "peakHeight", "valley-depth": "valleyDepth"
  })) setInput(document.getElementById(id), state[key]);
  const baseValues = [state.baseShapeRotation,
    ...state.baseShapeWaves.flatMap(wave => [wave.amplitude, wave.frequency, wave.phase])];
  baseShapeControls.querySelectorAll('input[type="range"]').forEach((input, i) => setInput(input, baseValues[i]));
  baseShapeControls.querySelectorAll(".peak-title").forEach((title, i) => {
    title.textContent = `Wave ${i + 1} (${state.baseShapeWaves[i].type})`;
  });
  peakGroups.forEach((group, i) => {
    const peak = state.peaks[i];
    const values = [peak.height, peak.angle, peak.width];
    group.querySelectorAll('input[type="range"]').forEach((input, j) => setInput(input, values[j]));
  });
  document.getElementById("keep-editing").checked = state.keepEditing;
  toggleGuidesButton.setAttribute("aria-pressed", String(state.showGuides));
  toggleGuidesButton.textContent = state.showGuides ? "Turn off guides" : "Turn on guides";
  updatePeakVisibility();
}


// ======================================================
// GLOBAL CONTROLS
// ======================================================

speedInput.value = state.speed;
speedValue.textContent = `${state.speed.toFixed(2)}×`;

speedInput.addEventListener("input", () => {
  state.speed = Number(speedInput.value);
  speedValue.textContent = `${state.speed.toFixed(2)}×`;
});

for (const [id, key] of [
  ["base-shape", "baseShapeStrength"],
  ["micro-wave", "microWaveStrength"]
]) {
  const input = document.getElementById(id);
  const value = document.getElementById(`${id}-value`);
  input.value = state[key];
  value.textContent = `${state[key].toFixed(2)}×`;
  input.addEventListener("input", () => {
    state[key] = Number(input.value);
    value.textContent = `${state[key].toFixed(2)}×`;
  });
}

const baseShapeThicknessInput = document.getElementById("base-shape-thickness");
const baseShapeThicknessValue = document.getElementById("base-shape-thickness-value");
for (const [input, value, key] of [
  [baseThicknessInput, baseThicknessValue, "baseRadius"],
  [baseShapeThicknessInput, baseShapeThicknessValue, "baseShapeThickness"]
]) {
  input.value = state[key];
  value.textContent = state[key];
  input.addEventListener("input", () => {
    state[key] = Number(input.value);
    value.textContent = state[key];
  });
}

const baseShapeControls = document.getElementById("base-shape-controls");
createPeakControl({
  parent: baseShapeControls,
  label: "Rotation (°)",
  min: 0, max: 360, step: 1,
  value: state.baseShapeRotation, decimals: 0,
  onChange: value => { state.baseShapeRotation = value; }
});

state.baseShapeWaves.forEach((wave, index) => {
  const group = document.createElement("div");
  group.className = "peak-group";
  const title = document.createElement("div");
  title.className = "peak-title";
  title.textContent = `Wave ${index + 1} (${wave.type})`;
  group.appendChild(title);
  for (const config of [
    { key: "amplitude", label: "Amplitude", min: 0, max: 40, step: 0.5, decimals: 1 },
    { key: "frequency", label: "Frequency", min: 1, max: 12, step: 1, decimals: 0 },
    { key: "phase", label: "Phase (rad)", min: -3.15, max: 3.15, step: 0.01, decimals: 2 }
  ]) {
    createPeakControl({
      parent: group, ...config, value: wave[config.key],
      onChange: value => { wave[config.key] = value; }
    });
  }
  baseShapeControls.appendChild(group);
});

// Peak Count
peakCountInput.addEventListener("input", () => {

  let value =
    parseInt(peakCountInput.value);

  if (isNaN(value)) {
    return;
  }

  value = Math.max(
    1,
    Math.min(MAX_PEAKS, value)
  );

  state.peakCount = value;

  updatePeakVisibility();
});


peakCountInput.addEventListener("change", () => {

  peakCountInput.value =
    state.peakCount;
});


// Peak Height
peakHeightInput.addEventListener("input", () => {

  state.peakHeight =
    Number(peakHeightInput.value);

  peakHeightValue.textContent =
    state.peakHeight;
});


// Valley Depth
valleyDepthInput.addEventListener("input", () => {

  state.valleyDepth =
    Number(valleyDepthInput.value);

  valleyDepthValue.textContent =
    state.valleyDepth;
});


// ======================================================
// BUILD EACH PEAK CONTROL
// ======================================================

for (let i = 0; i < MAX_PEAKS; i++) {

  const group =
    document.createElement("div");

  group.className = "peak-group";


  // title

  const title =
    document.createElement("div");

  title.className = "peak-title";

  title.textContent =
    `Peak ${i + 1}`;

  group.appendChild(title);


  // HEIGHT

  createPeakControl({
    parent: group,

    label: "Height",

    min: -3,
    max: 3,
    step: 0.05,

    value:
      state.peaks[i].height,

    decimals: 2,

    onChange: value => {
      state.peaks[i].height = value;
    }
  });


  // ANGLE

  createPeakControl({
    parent: group,

    label: "Angle",

    min: 0,
    max: 360,
    step: 1,

    value:
      state.peaks[i].angle,

    decimals: 0,

    onChange: value => {
      state.peaks[i].angle = value;
    }
  });


  // WIDTH

  createPeakControl({
    parent: group,

    label: "Width",

    min: 0.05,
    max: 1.5,
    step: 0.01,

    value:
      state.peaks[i].width,

    decimals: 2,

    onChange: value => {
      state.peaks[i].width = value;
    }
  });


  peakControlsContainer.appendChild(group);

  peakGroups.push(group);
}


// ======================================================
// CREATE ONE SLIDER ROW
// ======================================================

function createPeakControl({
  parent,
  label,
  min,
  max,
  step,
  value,
  decimals,
  onChange
}) {

  const row =
    document.createElement("div");

  row.className = "peak-row";


  const labelEl =
    document.createElement("label");

  labelEl.textContent =
    label;


  const slider =
    document.createElement("input");

  slider.type = "range";
  slider.id = `shape-control-${++controlId}`;
  labelEl.htmlFor = slider.id;

  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.value = value;


  const valueEl =
    document.createElement("span");

  valueEl.className =
    "value";

  valueEl.textContent =
    Number(value).toFixed(decimals);


  slider.addEventListener("input", () => {

    const newValue =
      Number(slider.value);

    // 更新真正用于图形的 state
    onChange(newValue);

    // 更新 UI 上显示的数字
    valueEl.textContent =
      newValue.toFixed(decimals);
  });


  row.appendChild(labelEl);
  row.appendChild(slider);
  row.appendChild(valueEl);

  parent.appendChild(row);
}


// ======================================================
// SHOW ONLY ACTIVE PEAKS
// ======================================================

function updatePeakVisibility() {

  for (
    let i = 0;
    i < MAX_PEAKS;
    i++
  ) {

    peakGroups[i].style.display =
      i < state.peakCount
        ? "block"
        : "none";
  }
}


updatePeakVisibility();


// ======================================================
// P5 SETUP
// ======================================================

function setup() {

  const canvas =
    createCanvas(CANVAS_SIZE.width, CANVAS_SIZE.height);

  canvas.parent(
    "canvas-container"
  );

  syncLogoControls();
  setupCanvasNavigation(canvas.elt);

  noiseSeed(logoNoiseSeed);
  noiseDetail(2, 0.5);
}

function setupCanvasNavigation(canvas) {
  const container = document.getElementById("canvas-container");
  container.style.width = `${CANVAS_SIZE.width}px`;
  container.style.height = `${CANVAS_SIZE.height}px`;
  const stage = document.getElementById("preview-stage");
  const preview = document.getElementById("logo-preview");
  const fitPreview = () => {
    const scale = Math.max(0.01, Math.min(1,
      (stage.clientWidth - 48) / preview.offsetWidth,
      (stage.clientHeight - 48) / preview.offsetHeight));
    preview.style.setProperty("--preview-scale", scale);
  };
  const previewObserver = new ResizeObserver(fitPreview);
  previewObserver.observe(stage);
  previewObserver.observe(preview);
  fitPreview();
  const displayScale = () => container.getBoundingClientRect().width / CANVAS_SIZE.width;
  const view = canvasView;
  const frame = document.createElement("div");
  frame.className = "canvas-edit-frame";
  frame.hidden = true;
  for (const corner of ["nw", "ne", "sw", "se"]) {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "canvas-resize-handle";
    handle.dataset.corner = corner;
    handle.setAttribute("aria-label", `Resize canvas ${corner}`);
    frame.appendChild(handle);
  }
  container.appendChild(frame);
  let drag = null;
  const updateView = () => {
    canvas.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
    frame.style.left = `${view.x}px`;
    frame.style.top = `${view.y}px`;
    frame.style.width = `${CANVAS_SIZE.width * view.zoom}px`;
    frame.style.height = `${CANVAS_SIZE.height * view.zoom}px`;
  };
  updateView();

  const setEditing = editing => {
    state.isEditing = editing || state.keepEditing;
    frame.hidden = !state.isEditing;
  };

  syncCanvasNavigation = () => {
    container.style.width = `${CANVAS_SIZE.width}px`;
    container.style.height = `${CANVAS_SIZE.height}px`;
    updateView();
    fitPreview();
    setEditing(state.keepEditing);
  };

  const keepEditingInput = document.getElementById("keep-editing");
  keepEditingInput.checked = state.keepEditing;
  keepEditingInput.addEventListener("change", () => {
    state.keepEditing = keepEditingInput.checked;
    setEditing(state.keepEditing);
  });

  document.addEventListener("pointerdown", event => {
    if (!container.contains(event.target)) setEditing(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") setEditing(false);
  });

  container.addEventListener("pointerdown", event => {
    if (event.button !== 0 || drag) return;
    setEditing(true);
    drag = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      corner: event.target.dataset.corner,
      start: { ...view }
    };
    container.setPointerCapture(event.pointerId);
    container.classList.add("is-dragging");
    event.preventDefault();
  });
  container.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = (event.clientX - drag.x) / displayScale();
    const dy = (event.clientY - drag.y) / displayScale();
    if (drag.corner) {
      const sx = drag.corner.includes("e") ? 1 : -1;
      const sy = drag.corner.includes("s") ? 1 : -1;
      const w = CANVAS_SIZE.width;
      const h = CANVAS_SIZE.height;
      const change = (sx * dx * w + sy * dy * h) / (w * w + h * h);
      view.zoom = Math.max(0.25, Math.min(4, drag.start.zoom + change));
      view.x = drag.start.x + (sx < 0 ? w * (drag.start.zoom - view.zoom) : 0);
      view.y = drag.start.y + (sy < 0 ? h * (drag.start.zoom - view.zoom) : 0);
    } else {
      view.x = drag.start.x + dx;
      view.y = drag.start.y + dy;
    }
    updateView();
  });
  const endDrag = event => {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    container.classList.remove("is-dragging");
    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }
  };
  container.addEventListener("pointerup", endDrag);
  container.addEventListener("pointercancel", endDrag);
  container.addEventListener("lostpointercapture", endDrag);

  container.addEventListener("wheel", event => {
    beginLogoChange();
    clearTimeout(wheelHistoryTimer);
    wheelHistoryTimer = setTimeout(finishLogoChange, 250);
    event.preventDefault();
    const bounds = container.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / displayScale();
    const y = (event.clientY - bounds.top) / displayScale();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1);
    const zoom = Math.max(0.25, Math.min(4, view.zoom * Math.exp(-delta * 0.001)));
    const ratio = zoom / view.zoom;
    view.x = x - (x - view.x) * ratio;
    view.y = y - (y - view.y) * ratio;
    view.zoom = zoom;
    updateView();
  }, { passive: false });

  container.addEventListener("dblclick", () => {
    beginLogoChange();
    view.x = 0;
    view.y = 0;
    view.zoom = 1;
    updateView();
    finishLogoChange();
  });
}


// ======================================================
// P5 DRAW
// ======================================================

const recordingAnimationInputs = ["recording-animation-enabled", "recording-speed", "recording-duration", "recording-strength"]
  .map(id => document.getElementById(id));
const recordingAnimationStatus = document.getElementById("recording-animation-status");
let recordingWasActive = false;
let recordingTransition = null;

function updateRecordingAnimation() {
  const capture = window.P5Capture?.getInstance();
  const active = capture?.state === "capturing";
  if (active && !recordingWasActive) {
    if (recordingAnimationInputs[0].checked) {
      const values = recordingAnimationInputs.slice(1).map(input => input.valueAsNumber);
      const valid = values.every(Number.isFinite)
        && values[0] >= 0 && values[0] <= 3 && values[1] >= 0 && values[1] <= 3600 && values[2] >= 0 && values[2] <= 3;
      if (valid) {
        state.speed = values[0];
        speedInput.value = state.speed;
        speedValue.textContent = `${state.speed.toFixed(2)}×`;
        recordingTransition = {
          from: state.baseShapeStrength, to: values[2], duration: values[1],
          firstFrame: capture.recorder.capturedCount,
          framerate: capture.mergedOptions.framerate
        };
        recordingAnimationStatus.textContent = "Recording: adjusting Strength…";
      } else {
        recordingAnimationStatus.textContent = "Automatic adjustment is disabled for this recording. Check the ranges for x, y, and z.";
      }
    }
    recordingAnimationInputs.forEach(input => { input.disabled = true; });
  }
  if (active && recordingTransition) {
    const transition = recordingTransition;
    // Use recorded frames so y seconds is accurate in the exported video,
    // including when encoding slows the preview below the chosen frame rate.
    const elapsed = (capture.recorder.capturedCount - transition.firstFrame) / transition.framerate;
    const progress = transition.duration === 0 ? 1 : Math.min(1, Math.max(0, elapsed / transition.duration));
    state.baseShapeStrength = transition.from + (transition.to - transition.from) * progress;
    document.getElementById("base-shape").value = state.baseShapeStrength;
    document.getElementById("base-shape-value").textContent = `${state.baseShapeStrength.toFixed(2)}×`;
    if (progress === 1) {
      recordingTransition = null;
      recordingAnimationStatus.textContent = "Strength has reached its target. Recording continues.";
    }
  }
  if (!active && recordingWasActive) {
    recordingTransition = null;
    recordingAnimationInputs.forEach(input => { input.disabled = false; });
    recordingAnimationStatus.textContent = "Recording stopped. Current parameters have been kept.";
  }
  recordingWasActive = active;
}

function draw() {
  updateRecordingAnimation();

  clear();

  translate(
    width / 2,
    height / 2
  );
  scale(LOGO_SCALE);
  rotate(radians(state.rotation));

  noStroke();
  fill(state.isEditing ? "#1683ff66" : FG);

  beginShape();

  const points = 240;
  frameVertices = [];


  for (
    let i = 0;
    i < points;
    i++
  ) {

    const angle =
      map(
        i,
        0,
        points,
        0,
        TWO_PI
      );


    // ==================================================
    // BASE
    // ==================================================

    const baseRadius = state.baseRadius;


    const baseShape = getBaseShapeOffset(angle);


    // ==================================================
    // PEAKS
    // ==================================================

    let movingPeaks = 0;


    for (
      let j = 0;
      j < state.peakCount;
      j++
    ) {

      const p =
        state.peaks[j];


      // 每个 Peak 自己的：
      //
      // height
      // angle
      // width

      movingPeaks +=
        localPeak(
          angle,

          radians(p.angle)
          - time * 0.80,

          state.peakHeight
          * p.height,

          p.width
        );
    }


    // ==================================================
    // VALLEYS
    // ==================================================

    let movingValleys = 0;


    movingValleys +=
      localPeak(
        angle,

        radians(85)
        - time * 0.80,

        -state.valleyDepth * 0.8,

        0.48
      );


    movingValleys +=
      localPeak(
        angle,

        radians(195)
        - time * 0.80,

        -state.valleyDepth,

        0.55
      );


    movingValleys +=
      localPeak(
        angle,

        radians(290)
        - time * 0.80,

        -state.valleyDepth * 0.65,

        0.40
      );


    // ==================================================
    // MICRO WAVE
    // ==================================================

    const microWave =
      sin(
        angle * 4
        - time * 1.2
      ) * 2.2
      +
      sin(
        angle * 7
        - time * 0.9
      ) * 1.2;


    // ==================================================
    // NOISE
    // ==================================================

    let n =
      noise(
        cos(angle) * 0.7 + 5,
        sin(angle) * 0.7 + 5,
        time * 0.03
      );


    n =
      map(
        n,
        0,
        1,
        -3.5,
        3.5
      );


    // ==================================================
    // FINAL RADIUS
    // ==================================================

    const r =
      baseRadius
      + baseShape * state.baseShapeStrength
      + movingPeaks
      + movingValleys
      + microWave * state.microWaveStrength
      + n;


    const x =
      cos(angle) * r;

    const y =
      sin(angle) * r;


    vertex(x, y);
    frameVertices.push([
      x * LOGO_SCALE + width / 2,
      y * LOGO_SCALE + height / 2
    ]);
  }


  endShape(CLOSE);


  // ==================================================
  // INNER CIRCLE
  // ==================================================

  erase();

  ellipse(
    INNER_CIRCLE.x,
    INNER_CIRCLE.y,
    INNER_CIRCLE.radius * 2,
    INNER_CIRCLE.radius * 2
  );
  noErase();

  // Fill behind the finished silhouette so the erased cutout is white too.
  // p5.capture reads this canvas after draw(); CSS backgrounds are not captured.
  if (window.P5Capture?.getInstance()?.state === "capturing") {
    drawingContext.save();
    drawingContext.resetTransform();
    drawingContext.globalCompositeOperation = "destination-over";
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fillRect(0, 0, drawingContext.canvas.width, drawingContext.canvas.height);
    drawingContext.restore();
  }


  if (state.showGuides) {
    drawBaseShapeGuides();
    drawPeakGuides();
  }

  frameParameters = {
    state: JSON.parse(JSON.stringify(state)),
    animationTime: time,
    noise: { seed: logoNoiseSeed, octaves: 2, falloff: 0.5 },
    canvas: { ...CANVAS_SIZE, logoScale: LOGO_SCALE },
    innerCircle: { ...INNER_CIRCLE },
    fill: FG,
    background: "transparent"
  };
  exportSvgButton.disabled = false;
  exportParametersButton.disabled = false;
  export10SvgButton.disabled = exportingBatch;
  time += 0.025 * state.speed;
}


// ======================================================
// LOCAL PEAK FUNCTION
// ======================================================

function getBaseShapeOffset(angle) {
  const baseAngle = angle - radians(state.baseShapeRotation);
  return state.baseShapeWaves.reduce((total, wave) => {
    const phase = baseAngle * wave.frequency + wave.phase;
    return total + (wave.type === "cos" ? cos(phase) : sin(phase)) * wave.amplitude;
  }, state.baseShapeThickness - 135);
}

function drawBaseShapeGuides() {
  push();
  noFill();
  strokeWeight(0.9);
  stroke("#888888");
  drawingContext.setLineDash([3, 3]);
  circle(0, 0, state.baseRadius * 2);

  stroke("#009dff");
  strokeWeight(1.25);
  drawingContext.setLineDash([5, 3]);
  beginShape();
  for (let i = 0; i < 240; i++) {
    const angle = i / 240 * TWO_PI;
    const radius = state.baseRadius + getBaseShapeOffset(angle) * state.baseShapeStrength;
    vertex(cos(angle) * radius, sin(angle) * radius);
  }
  endShape(CLOSE);
  drawingContext.setLineDash([]);
  pop();
}

function drawPeakGuides() {
  // The draw transform already places (0, 0) at the canvas center.
  const colors = ["#d32f2f", "#1565c0", "#2e7d32", "#8e24aa",
    "#bf5600", "#007c91", "#ad1457", "#5d4037"];
  push();
  textAlign(CENTER, CENTER);
  textSize(9);
  textStyle(BOLD);
  for (let i = 0; i < state.peakCount; i++) {
    const angle = radians(state.peaks[i].angle) - time * 0.80;
    const normalizedAngle = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
    const sample = normalizedAngle / TWO_PI * frameVertices.length;
    const index = Math.floor(sample);
    const fraction = sample - index;
    const a = frameVertices[index];
    const b = frameVertices[(index + 1) % frameVertices.length];
    const x = (a[0] + (b[0] - a[0]) * fraction - width / 2) / LOGO_SCALE;
    const y = (a[1] + (b[1] - a[1]) * fraction - height / 2) / LOGO_SCALE;
    stroke(colors[i]);
    strokeWeight(0.75);
    drawingContext.setLineDash([3 * LOGO_SCALE, 3 * LOGO_SCALE]);
    line(0, 0, x, y);
    drawingContext.setLineDash([]);
    fill(colors[i]);
    circle(x, y, 4);

    const peak = state.peaks[i];
    const directionX = cos(angle);
    const directionY = sin(angle);
    const amplitude = state.peakHeight * peak.height;
    const tipRadius = Math.hypot(x, y);
    // Height measures this peak's contribution, excluding the other peaks,
    // valleys and noise that also affect the final outline.
    const startRadius = tipRadius - amplitude;
    const startX = directionX * startRadius;
    const startY = directionY * startRadius;
    const tipX = directionX * tipRadius;
    const tipY = directionY * tipRadius;
    strokeWeight(1.5);
    line(startX, startY, tipX, tipY);
    for (const radius of [startRadius, tipRadius]) {
      const tickX = directionX * radius;
      const tickY = directionY * radius;
      line(tickX - directionY * 4, tickY + directionX * 4,
        tickX + directionY * 4, tickY - directionX * 4);
    }
    drawGuideLabel(
      `H${i + 1}: ${peak.height.toFixed(2)}× (${(amplitude * LOGO_SCALE).toFixed(1)}px)`,
      directionX * (startRadius + amplitude / 2) - directionY * 24,
      directionY * (startRadius + amplitude / 2) + directionX * 24,
      colors[i]
    );

    // Gaussian width is an angular half-width: at angle ± width,
    // the peak's contribution is height / e, not zero.
    const guideRadius = Math.max(25, state.baseRadius * 0.55) + i * 5;
    stroke(colors[i]);
    strokeWeight(0.75);
    noFill();
    arc(0, 0, guideRadius * 2, guideRadius * 2,
      angle - peak.width, angle + peak.width);
    for (const boundaryAngle of [angle - peak.width, angle + peak.width]) {
      const dx = cos(boundaryAngle);
      const dy = sin(boundaryAngle);
      line(dx * (guideRadius - 4), dy * (guideRadius - 4),
        dx * (guideRadius + 4), dy * (guideRadius + 4));
      drawingContext.setLineDash([2, 3]);
      line(dx * guideRadius, dy * guideRadius,
        dx * tipRadius, dy * tipRadius);
      drawingContext.setLineDash([]);
    }
    drawGuideLabel(`W${i + 1}: ±${peak.width.toFixed(2)} rad`,
      directionX * (guideRadius - 10), directionY * (guideRadius - 10), colors[i]);

    // Keep labels inside the canvas even when a peak is near its edge.
    const labelX = constrain(x + cos(angle) * 23,
      -width / (2 * LOGO_SCALE) + 24, width / (2 * LOGO_SCALE) - 24);
    const labelY = constrain(y + sin(angle) * 23,
      -height / (2 * LOGO_SCALE) + 10, height / (2 * LOGO_SCALE) - 10);
    noStroke();
    fill(255, 240);
    rect(labelX - 20, labelY - 8, 40, 16, 3);
    fill(colors[i]);
    text(`Peak ${i + 1}`, labelX, labelY);
  }
  pop();
}

function drawGuideLabel(label, x, y, color) {
  push();
  textSize(7);
  const labelWidth = textWidth(label) + 8;
  const labelX = constrain(x, -width / (2 * LOGO_SCALE) + labelWidth / 2,
    width / (2 * LOGO_SCALE) - labelWidth / 2);
  const labelY = constrain(y, -height / (2 * LOGO_SCALE) + 7,
    height / (2 * LOGO_SCALE) - 7);
  noStroke();
  fill(255, 240);
  rect(labelX - labelWidth / 2, labelY - 6, labelWidth, 12, 2);
  fill(color);
  text(label, labelX, labelY);
  pop();
}

function localPeak(
  angle,
  center,
  amplitude,
  peakWidth
) {

  const d =
    atan2(
      sin(angle - center),
      cos(angle - center)
    );


  const falloff =
    exp(
      -pow(
        d / peakWidth,
        2
      )
    );


  return amplitude * falloff;
}
