// ======================================================
// STATE
// 所有 UI 都只修改这里
// p5 draw() 只读取这里
// ======================================================

const MAX_PEAKS = 8;

const state = {
  baseRadius: 135,
  speed: 1,
  peakCount: 4,

  peakHeight: 20,
  valleyDepth: 10,

  peaks: [
    { height: 1.00, angle: 20,  width: 0.55 },
    { height: 0.70, angle: 145, width: 0.42 },
    { height: 1.20, angle: 250, width: 0.50 },
    { height: 0.45, angle: 325, width: 0.36 },
    { height: 0.80, angle: 70,  width: 0.50 },
    { height: 1.10, angle: 200, width: 0.45 },
    { height: 0.65, angle: 110, width: 0.40 },
    { height: 0.90, angle: 290, width: 0.55 }
  ]
};


let time = 0;
let frameVertices = [];
const INNER_CIRCLE = { x: -7, y: -3, radius: 95 };

const exportSvgButton = document.getElementById("export-svg");
exportSvgButton.addEventListener("click", exportSvg);

function exportSvg() {
  if (!frameVertices.length) return;

  const outline = frameVertices.map(([x, y], i) =>
    `${i === 0 ? "M" : "L"} ${x} ${y}`
  ).join(" ") + " Z";
  const cx = width / 2 + INNER_CIRCLE.x;
  const cy = height / 2 + INNER_CIRCLE.y;
  const radius = INNER_CIRCLE.radius;
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
  <path d="${outline}" fill="${FG}" clip-path="url(#ring-cutout)" />
</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "omi-logo.svg";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const BG = "#ffffff";
const FG = "#000000";


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


// ======================================================
// GLOBAL CONTROLS
// ======================================================

speedInput.value = state.speed;
speedValue.textContent = `${state.speed.toFixed(2)}×`;

speedInput.addEventListener("input", () => {
  state.speed = Number(speedInput.value);
  speedValue.textContent = `${state.speed.toFixed(2)}×`;
});

baseThicknessInput.value = state.baseRadius;
baseThicknessValue.textContent = state.baseRadius;

baseThicknessInput.addEventListener("input", () => {
  state.baseRadius = Number(baseThicknessInput.value);
  baseThicknessValue.textContent = state.baseRadius;
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

    min: 0,
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
    createCanvas(466, 472);

  canvas.parent(
    "canvas-container"
  );

  noiseDetail(2, 0.5);
}


// ======================================================
// P5 DRAW
// ======================================================

function draw() {

  background(BG);

  translate(
    width / 2,
    height / 2
  );

  noStroke();
  fill(FG);

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


    const baseShape =
      sin(angle * 2 + 0.5) * 13 +
      sin(angle * 3 - 1.2) * 9 +
      cos(angle - 0.8) * 8;


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
      //+ baseShape
      + movingPeaks
      + movingValleys
      + microWave
      + n;


    const x =
      cos(angle) * r;

    const y =
      sin(angle) * r;


    vertex(x, y);
    frameVertices.push([x + width / 2, y + height / 2]);
  }


  endShape(CLOSE);


  // ==================================================
  // INNER CIRCLE
  // ==================================================

  fill(BG);

  ellipse(
    INNER_CIRCLE.x,
    INNER_CIRCLE.y,
    INNER_CIRCLE.radius * 2,
    INNER_CIRCLE.radius * 2
  );


  exportSvgButton.disabled = false;
  time += 0.025 * state.speed;
}


// ======================================================
// LOCAL PEAK FUNCTION
// ======================================================

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
