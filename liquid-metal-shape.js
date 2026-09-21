// Same time-zero polar geometry as script.js. The small noise offsets are
// sampled from the existing seed-42 mask so the initial silhouette stays exact.
window.OmiMetalShape = (() => {
  const snapshotDefaults = {
    baseRadius: 135, baseShapeThickness: 135, peakCount: 4, peakHeight: 20, valleyDepth: 10, speed: 0,
    rotation: 0, microWaveStrength: 1, baseShapeStrength: 1, baseShapeRotation: 0,
    innerX: -7, innerY: -3, innerRadius: 95,
    canvasWidth: 500, canvasHeight: 500, logoScale: 1, noiseSeed: null,
    peaks: [
      { height: 1, angle: 20, width: .55 }, { height: .7, angle: 145, width: .42 },
      { height: 1.2, angle: 250, width: .5 }, { height: .45, angle: 325, width: .36 },
      { height: .8, angle: 70, width: .5 }, { height: 1.1, angle: 200, width: .45 },
      { height: .65, angle: 110, width: .4 }, { height: .9, angle: 290, width: .55 },
    ],
    waves: [
      { amplitude: 13, frequency: 2, phase: .5, type: 'sin' },
      { amplitude: 9, frequency: 3, phase: -1.2, type: 'sin' },
      { amplitude: 8, frequency: 1, phase: -.8, type: 'cos' },
    ],
  };
  const defaults = {
  "rotation": 0,
  "baseRadius": 141,
  "baseShapeThickness": 136,
  "speed": 0,
  "baseShapeStrength": 1,
  "baseShapeRotation": 45,
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
  ],
  "waves": [
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
  "innerX": -7,
  "innerY": -3,
  "innerRadius": 95,
  "canvasWidth": 500,
  "canvasHeight": 500,
  "logoScale": 1,
  "noiseSeed": 503285139
};
  const defaultAnimationTime = 51.787499999997856;
  const radians = degrees => degrees * Math.PI / 180;
  const peak = (angle, center, height, width) => {
    const distance = Math.atan2(Math.sin(angle - center), Math.cos(angle - center));
    return height * Math.exp(-((distance / width) ** 2));
  };
  function radius(state, angle, time = 0) {
    const baseAngle = angle - radians(state.baseShapeRotation);
    const base = state.waves.reduce((sum, wave) => sum + wave.amplitude *
      Math[wave.type](baseAngle * wave.frequency + wave.phase), state.baseShapeThickness - 135);
    const peaks = state.peaks.slice(0, state.peakCount).reduce((sum, p) =>
      sum + peak(angle, radians(p.angle) - time * .8, state.peakHeight * p.height, p.width), 0);
    const valleys = peak(angle, radians(85) - time * .8, -state.valleyDepth * .8, .48)
      + peak(angle, radians(195) - time * .8, -state.valleyDepth, .55)
      + peak(angle, radians(290) - time * .8, -state.valleyDepth * .65, .4);
    const micro = Math.sin(angle * 4 - time * 1.2) * 2.2 + Math.sin(angle * 7 - time * .9) * 1.2;
    return state.baseRadius + base * state.baseShapeStrength + peaks + valleys + micro * state.microWaveStrength;
  }
  function create(snapshot) {
    const outline = new DOMParser().parseFromString(snapshot, 'image/svg+xml').querySelector('svg > path');
    const coordinates = [...outline.getAttribute('d').matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)];
    const noise = coordinates.map((point, i) => Math.hypot(Number(point[1]) - 250, Number(point[2]) - 250)
      - radius(snapshotDefaults, i / coordinates.length * Math.PI * 2));
    if (noise.length !== 240) throw new Error('Invalid Omi outline');
    let cachedSeed, perlin;
    function importedNoise(state, angle, time) {
      if (state.noiseSeed === null) return null;
      if (cachedSeed !== state.noiseSeed) {
        cachedSeed = state.noiseSeed;
        let seed = cachedSeed;
        perlin = Array.from({ length: 4096 }, () => {
          seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
          return seed / 4294967296;
        });
      }
      let x = Math.cos(angle) * .7 + 5, y = Math.sin(angle) * .7 + 5, z = time * .03;
      let result = 0, amplitude = .5;
      const fade = v => .5 * (1 - Math.cos(v * Math.PI));
      const mix = (a, b, t) => a + (b - a) * t;
      for (let octave = 0; octave < 2; octave++) {
        const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
        const fx = fade(x - xi), fy = fade(y - yi), fz = fade(z - zi);
        const at = (dx, dy, dz) => perlin[(xi + dx + ((yi + dy) << 4) + ((zi + dz) << 8)) & 4095];
        const layer = dz => mix(mix(at(0, 0, dz), at(1, 0, dz), fx), mix(at(0, 1, dz), at(1, 1, dz), fx), fy);
        result += mix(layer(0), layer(1), fz) * amplitude;
        x *= 2; y *= 2; z *= 2; amplitude *= .5;
      }
      return result * 7 - 3.5;
    }
    return {
      defaults: () => structuredClone(defaults),
      uniforms(state, time = 0) {
        const radii = noise.map((offset, i) => {
          const angle = i / noise.length * Math.PI * 2;
          return Math.max(1, radius(state, angle, time) + (importedNoise(state, angle, time) ?? offset));
        });
        return {
          u_omiCanvas: [state.canvasWidth, state.canvasHeight, state.logoScale],
          u_worldWidth: state.canvasWidth, u_worldHeight: state.canvasHeight,
          u_omiRadii: Array.from({ length: 60 }, (_, i) => radii.slice(i * 4, i * 4 + 4)),
          u_omiHole: [state.innerX, state.innerY, state.innerRadius],
          u_omiRotation: radians(state.rotation),
        };
      },
      svg(state, time = 0) {
        const outline = noise.map((offset, i) => {
          const angle = i / noise.length * Math.PI * 2;
          const r = Math.max(1, radius(state, angle, time) + offset);
          return `${i ? 'L' : 'M'}${250 + Math.cos(angle) * r} ${250 + Math.sin(angle) * r}`;
        }).join(' ') + ' Z';
        const cx = 250 + state.innerX, cy = 250 + state.innerY, r = state.innerRadius;
        const hole = r > 0 ? `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0Z` : '';
        return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500"><defs><clipPath id="cut"><path d="M0 0H500V500H0Z ${hole}" clip-rule="evenodd"/></clipPath></defs><g transform="rotate(${state.rotation} 250 250)"><path d="${outline}" fill="black" clip-path="url(#cut)"/></g></svg>`;
      },
    };
  }
  function controls(container, state, onChange) {
    const bindings = [], peakGroups = [];
    function slider(parent, target, key, label, min, max, step) {
      const row = document.createElement('div');
      row.className = 'control';
      const id = `geometry-${bindings.length}`;
      row.innerHTML = `<label for="${id}">${label}<output for="${id}"></output></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}">`;
      const input = row.querySelector('input'), output = row.querySelector('output');
      const sync = () => {
        input.min = Math.min(min, target[key]); input.max = Math.max(max, target[key]);
        input.value = target[key]; output.value = String(target[key]);
      };
      input.addEventListener('input', () => {
        target[key] = Number(input.value);
        output.value = input.value;
        visibility();
        onChange();
      });
      bindings.push(sync);
      parent.append(row);
      sync();
    }
    function section(label, open = false) {
      const details = document.createElement('details');
      details.open = open;
      const summary = document.createElement('summary');
      summary.textContent = label;
      details.append(summary);
      container.append(details);
      return details;
    }
    function visibility() { peakGroups.forEach((group, i) => { group.hidden = i >= state.peakCount; }); }
    const main = section('Outline Parameters', true);
    for (const args of [
      ['speed', 'Logo Speed', 0, 3, .05],
      ['baseRadius', 'Base Thickness', 95, 200, 1], ['peakCount', 'Peak Count', 1, 8, 1],
      ['baseShapeThickness', 'Base Shape Thickness', 95, 200, 1],
      ['peakHeight', 'Peak Height', -60, 60, 1], ['valleyDepth', 'Valley Depth', 0, 50, 1],
      ['rotation', 'Rotation', 0, 360, 1], ['microWaveStrength', 'Micro Wave Strength', 0, 3, .05],
      ['baseShapeStrength', 'Base Shape Strength', 0, 3, .05], ['baseShapeRotation', 'Base Shape Rotation', 0, 360, 1],
    ]) slider(main, state, ...args);
    state.peaks.forEach((p, i) => {
      const group = section(`Peak ${i + 1}`);
      peakGroups.push(group);
      slider(group, p, 'height', 'Height Multiplier', -3, 3, .05);
      slider(group, p, 'angle', 'Angle', 0, 360, 1);
      slider(group, p, 'width', 'Width', .05, 1.5, .01);
    });
    state.waves.forEach((wave, i) => {
      const group = section(`Base Wave ${i + 1} · ${wave.type}`);
      bindings.push(() => { group.querySelector('summary').textContent = `Base Wave ${i + 1} · ${wave.type}`; });
      slider(group, wave, 'amplitude', 'Amplitude', 0, 40, .5);
      slider(group, wave, 'frequency', 'Frequency', 1, 12, 1);
      slider(group, wave, 'phase', 'Phase', -3.15, 3.15, .01);
    });
    const hole = section('Circular Cutout');
    slider(hole, state, 'innerRadius', 'Radius', 0, 160, 1);
    slider(hole, state, 'innerX', 'Horizontal Offset', -100, 100, 1);
    slider(hole, state, 'innerY', 'Vertical Offset', -100, 100, 1);
    visibility();
    return (fresh = structuredClone(defaults)) => {
      for (const key of Object.keys(fresh)) {
        if (Array.isArray(fresh[key])) fresh[key].forEach((value, i) => Object.assign(state[key][i], value));
        else state[key] = fresh[key];
      }
      bindings.forEach(sync => sync());
      visibility();
    };
  }
  // Adapt the pinned Paper shader's image branch to an analytic dynamic mask.
  // 60 vec4 uniforms hold the same 240 polygon radii; no image processing or uploads.
  function dynamicShader(source) {
    const mask = `
uniform vec4 u_omiRadii[60];
uniform vec3 u_omiHole;
uniform vec3 u_omiCanvas;
uniform float u_omiRotation;
float omiRadius(int index) {
  int wrapped = index % 240;
  return u_omiRadii[wrapped / 4][wrapped % 4];
}
vec4 omiMask(vec2 uv) {
  vec2 point = (uv - .5) * u_omiCanvas.xy / u_omiCanvas.z;
  float c = cos(u_omiRotation), s = sin(u_omiRotation);
  point = mat2(c, -s, s, c) * point;
  float angle = dot(point, point) > .000001 ? atan(point.y, point.x) : 0.;
  angle = mod(angle + 6.28318530718, 6.28318530718);
  float sector = angle * 240. / 6.28318530718;
  int index = min(239, int(floor(sector)));
  float a = float(index) * 6.28318530718 / 240.;
  float b = float(index + 1) * 6.28318530718 / 240.;
  vec2 first = omiRadius(index) * vec2(cos(a), sin(a));
  vec2 last = omiRadius(index + 1) * vec2(cos(b), sin(b));
  vec2 segment = last - first;
  vec2 relative = point - first;
  float outer = (segment.x * relative.y - segment.y * relative.x) / max(length(segment), .0001);
  float inner = u_omiHole.z > 0. ? length(point - u_omiHole.xy) - u_omiHole.z : 10000.;
  float distanceInside = min(outer, inner);
  float aa = max(fwidth(distanceInside), .01);
  float opacity = smoothstep(-aa, aa, distanceInside);
  float edge = 1. - smoothstep(0., 24., max(distanceInside, 0.));
  return vec4(edge, opacity, 0., 1.);
}
`;
    const replacements = [
      ['void main() {', mask + '\nvoid main() {'],
      ['vec2 uv = v_imageUV;', 'vec2 uv = v_objectUV + .5; uv.y = 1. - uv.y;'],
      ['vec4 img = textureGrad(u_image, uv, dudx, dudy);', 'vec4 img = omiMask(uv);'],
      ['edge = blurEdge3x3(u_image, uv, dudx, dudy, 6., edgeRaw);', 'edge = edgeRaw;'],
      ['float frame = getImgFrame(v_imageUV, 0.);', 'float frame = 1.;'],
    ];
    for (const [from, to] of replacements) {
      if (!source.includes(from)) throw new Error('Incompatible Liquid Metal shader');
      source = source.replace(from, to);
    }
    return source;
  }
  function parseParameters(text) {
    const data = JSON.parse(text.replace(/^\uFEFF/, ''));
    const fail = () => { throw new Error('Please select a valid parameter TXT / JSON file exported from the logo editor.'); };
    const number = (value, min, max) => {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail();
      return value;
    };
    if (!data || data.formatVersion !== 1 || !data.state || !data.noise || !data.canvas || !data.innerCircle) fail();
    const state = structuredClone(defaults);
    for (const [key, min, max] of [
      ['rotation', 0, 360], ['baseRadius', 95, 200], ['speed', 0, 3],
      ['baseShapeStrength', 0, 3], ['baseShapeRotation', 0, 360], ['microWaveStrength', 0, 3],
      ['peakCount', 1, 8], ['peakHeight', -60, 60], ['valleyDepth', 0, 50],
    ]) state[key] = number(data.state[key], min, max);
    state.baseShapeThickness = 'baseShapeThickness' in data.state ? number(data.state.baseShapeThickness, 95, 200) : 135;
    if (!Number.isInteger(state.peakCount)) fail();
    if (!Array.isArray(data.state.peaks) || data.state.peaks.length !== 8) fail();
    state.peaks = data.state.peaks.map(p => {
      if (!p) fail();
      return { height: number(p.height, -3, 3), angle: number(p.angle, 0, 360), width: number(p.width, .05, 1.5) };
    });
    if (!Array.isArray(data.state.baseShapeWaves) || data.state.baseShapeWaves.length !== 3) fail();
    state.waves = data.state.baseShapeWaves.map(w => {
      if (!w || !['sin', 'cos'].includes(w.type) || !Number.isInteger(w.frequency)) fail();
      return { type: w.type, amplitude: number(w.amplitude, 0, 40), frequency: number(w.frequency, 1, 12), phase: number(w.phase, -3.15, 3.15) };
    });
    state.innerX = number(data.innerCircle.x, -4096, 4096);
    state.innerY = number(data.innerCircle.y, -4096, 4096);
    state.innerRadius = number(data.innerCircle.radius, 1, 4096);
    state.canvasWidth = number(data.canvas.width, 1, 4096);
    state.canvasHeight = number(data.canvas.height, 1, 4096);
    state.logoScale = number(data.canvas.logoScale, .1, 8);
    state.noiseSeed = number(data.noise.seed, 0, 4294967295);
    if (!Number.isInteger(state.noiseSeed) || data.noise.octaves !== 2 || data.noise.falloff !== .5) fail();
    return { state, time: number(data.animationTime, 0, Number.MAX_SAFE_INTEGER) };
  }
  return { create, controls, dynamicShader, parseParameters, defaultAnimationTime };
})();
