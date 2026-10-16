import {
  PALETTE,
  ShapeWriter,
  allocate,
  clamp01,
  gaussian,
  mixRgb,
  samplePolyline,
  smoothstep,
  type Random,
  type Rgb,
  type ShapePoints,
} from "./shapeUtils";
import { NECK_BOTTOM, frontSurfaceZ, headNormal, headSdf, radialSurface } from "./robotSdf";

/** Local head units -> shared scene units. */
const SCALE = 1.5;
const OFFSET_Y = 0.42;

const EYE = { x: 0.3, y: 0.06, rx: 0.122, ryUp: 0.056, ryLow: 0.042 } as const;

export interface RobotEye {
  x: number;
  y: number;
  z: number;
  rx: number;
  ryUp: number;
  ryLow: number;
  /** Y of the line the lids close onto. */
  lidY: number;
}

let eyesCache: { left: RobotEye; right: RobotEye } | null = null;

/** Eye placement in final scene units (shared with the blink overlay). */
export function getRobotEyes(): { left: RobotEye; right: RobotEye } {
  if (eyesCache) return eyesCache;
  const z = (frontSurfaceZ(EYE.x, EYE.y) ?? 0.62) + 0.012;
  const make = (side: number): RobotEye => ({
    x: side * EYE.x * SCALE,
    y: EYE.y * SCALE + OFFSET_Y,
    z: z * SCALE,
    rx: EYE.rx * SCALE,
    ryUp: EYE.ryUp * SCALE,
    ryLow: EYE.ryLow * SCALE,
    lidY: (EYE.y - EYE.ryLow * 0.3) * SCALE + OFFSET_Y,
  });
  eyesCache = { left: make(-1), right: make(1) };
  return eyesCache;
}

const KEY = normalize3(-0.45, 0.55, 0.7);
const RIM = normalize3(0.75, 0.25, -0.6);

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

/** Key + rim + fresnel shading from a real surface normal. */
function shadeSurface(n: [number, number, number], y: number) {
  const key = Math.max(0, n[0] * KEY[0] + n[1] * KEY[1] + n[2] * KEY[2]);
  const rim = Math.pow(Math.max(0, n[0] * RIM[0] + n[1] * RIM[1] + n[2] * RIM[2]), 1.5);
  const fresnel = Math.pow(1 - Math.max(0, n[2]), 2.5);
  const lit = Math.pow(key, 1.25);
  let color = mixRgb(PALETTE.slate, PALETTE.ice, lit);
  color = mixRgb(color, PALETTE.cyan, clamp01(rim * 0.55 + fresnel * 0.25));
  const facePlate = n[2] > 0.3 && y < 0.6 && y > -1.1;
  if (facePlate) color = mixRgb(color, PALETTE.white, 0.12);
  const back = n[2] < -0.1 ? 0.5 : 1;
  const brightness = (0.07 + 0.72 * lit + 0.32 * fresnel + 0.3 * rim) * back;
  return { color, brightness };
}

/** Projects a front-view (x, y) onto the face, lifted along the normal. */
function onFront(x: number, y: number, lift: number): [number, number, number] | null {
  const z = frontSurfaceZ(x, y);
  if (z === null) return null;
  const n = headNormal(x, y, z);
  return [x + n[0] * lift, y + n[1] * lift, z + n[2] * lift];
}

const CENTER = [0, 0.15, -0.1] as const;

/** Spherical (azimuth, elevation) around the cranium centre -> surface. */
function onCranium(theta: number, phi: number, lift: number): [number, number, number] | null {
  const dx = Math.cos(phi) * Math.sin(theta);
  const dy = Math.sin(phi);
  const dz = Math.cos(phi) * Math.cos(theta);
  const p = radialSurface(CENTER[0], CENTER[1], CENTER[2], dx, dy, dz);
  if (!p) return null;
  const n = headNormal(p[0], p[1], p[2]);
  return [p[0] + n[0] * lift, p[1] + n[1] * lift, p[2] + n[2] * lift];
}

type Path2 = Array<[number, number]>;

export function createRobotShape(count: number, random: Random): ShapePoints {
  const w = new ShapeWriter(count);
  const budget = allocate(count, {
    surface: 0.535,
    seams: 0.075,
    features: 0.035,
    circuits: 0.095,
    nodes: 0.015,
    eyes: 0.045,
    temples: 0.08,
    neck: 0.07,
    motes: 0.05,
  });

  const emit = (p: [number, number, number] | null, color: Rgb, brightness: number, size: number, tagA = 0, tagB = 0) => {
    if (p) w.push(p[0], p[1], p[2], color, brightness, size, tagA, tagB);
    return !!p;
  };

  // 1. Sculpted surface: shell rejection sampling + projection onto the SDF.
  for (let n = 0, guard = 0; n < budget.surface && guard < budget.surface * 60; guard++) {
    let x = (random() * 2 - 1) * 0.95;
    let y = NECK_BOTTOM + random() * (1.28 - NECK_BOTTOM);
    let z = -1.08 + random() * 2.2;
    let d = headSdf(x, y, z);
    if (Math.abs(d) > 0.05) continue;
    for (let k = 0; k < 3; k++) {
      const nn = headNormal(x, y, z);
      x -= nn[0] * d;
      y -= nn[1] * d;
      z -= nn[2] * d;
      d = headSdf(x, y, z);
    }
    if (Math.abs(d) > 0.003) continue;
    const normal = headNormal(x, y, z);
    const neck = smoothstep(-1.0, -1.7, y);
    const keep = (normal[2] > -0.05 ? 1 : 0.28) * (1 - neck * 0.55);
    if (random() > keep) continue;
    const { color, brightness } = shadeSurface(normal, y);
    w.push(x, y, z, color, brightness * (1 - neck * 0.6), 0.55 + random() * 0.45);
    n++;
  }

  // 2. Engineered panel seams on the face plate and cranium.
  const seamColor = mixRgb(PALETTE.teal, PALETTE.ice, 0.4);
  const frontSeams: Array<{ path: Path2; weight: number }> = [
    { path: Array.from({ length: 13 }, (_, i) => { const x = -0.56 + (i / 12) * 1.12; return [x, 0.6 - 0.1 * (x / 0.56) ** 2] as [number, number]; }), weight: 1.3 },
    ...[-1, 1].map((s) => ({ path: [[s * 0.56, 0.5], [s * 0.6, 0.15], [s * 0.58, -0.2], [s * 0.5, -0.55], [s * 0.36, -0.86], [s * 0.18, -1.04], [0, -1.1]] as Path2, weight: 1.7 })),
    ...[-1, 1].map((s) => ({ path: [[s * 0.14, -0.1], [s * 0.32, -0.15], [s * 0.5, -0.08]] as Path2, weight: 0.45 })),
    ...[-1, 1].map((s) => ({ path: [[s * 0.34, -0.3], [s * 0.42, -0.48], [s * 0.5, -0.62]] as Path2, weight: 0.4 })),
    ...[-1, 1].map((s) => ({ path: [[s * 0.13, -0.38], [s * 0.2, -0.48], [s * 0.24, -0.58]] as Path2, weight: 0.3 })),
    { path: [[-0.17, -0.86], [0, -0.9], [0.17, -0.86]], weight: 0.35 },
    { path: [[0, 0.6], [0, 0.9]], weight: 0.3 },
  ];
  const seamTotal = frontSeams.reduce((a, s) => a + s.weight, 0) + 2.2;
  const seamUnit = (budget.seams * 0.999) / seamTotal;
  frontSeams.forEach(({ path, weight }) =>
    samplePolyline(
      path.map(([x, y]) => [x, y, 0] as const),
      Math.floor(weight * seamUnit),
      random,
      (x, y) => emit(onFront(x, y, 0.008), seamColor, 0.62, 0.7 + random() * 0.25),
      0.003,
    ),
  );
  // Cranium seams: sagittal crest and coronal band.
  for (let i = 0; i < Math.floor(1.2 * seamUnit); i++) {
    const phi = 0.95 + random() * 1.55;
    emit(onCranium(0, phi, 0.008), seamColor, 0.5, 0.7);
  }
  for (let i = 0; i < Math.floor(1.0 * seamUnit); i++) {
    const b = (random() * 2 - 1) * 1.25;
    const dx = Math.sin(b);
    const dy = Math.cos(b);
    const dz = -0.28;
    const l = Math.hypot(dx, dy, dz);
    const p = radialSurface(CENTER[0], CENTER[1], CENTER[2], dx / l, dy / l, dz / l);
    if (p) {
      const n = headNormal(p[0], p[1], p[2]);
      w.push(p[0] + n[0] * 0.008, p[1] + n[1] * 0.008, p[2] + n[2] * 0.008, seamColor, 0.45, 0.7);
    }
  }

  // 3. Anatomical highlight lines: brow crest, nose ridge, lip line.
  const featureColor = mixRgb(PALETTE.ice, PALETTE.white, 0.4);
  const featurePaths: Array<{ path: Path2; weight: number; b: number }> = [
    ...[-1, 1].map((s) => ({ path: [[s * 0.06, 0.25], [s * 0.3, 0.28], [s * 0.5, 0.22]] as Path2, weight: 1, b: 0.7 })),
    { path: [[0, 0.12], [0, -0.28]], weight: 0.8, b: 0.6 },
    { path: [[-0.18, -0.6], [0, -0.6], [0.18, -0.6]], weight: 0.9, b: 0.75 },
    ...[-1, 1].map((s) => ({ path: [[s * 0.03, -0.37], [s * 0.1, -0.39], [s * 0.14, -0.35]] as Path2, weight: 0.35, b: 0.55 })),
  ];
  const featureTotal = featurePaths.reduce((a, f) => a + f.weight, 0);
  featurePaths.forEach(({ path, weight, b }) =>
    samplePolyline(
      path.map(([x, y]) => [x, y, 0] as const),
      Math.floor((weight / featureTotal) * budget.features),
      random,
      (x, y) => emit(onFront(x, y, 0.012), featureColor, b, 0.7 + random() * 0.3),
      0.004,
    ),
  );

  // 4. Layered circuitry over forehead and cranium (mirrored, PCB-style).
  const g = 0.055;
  const traces: Array<{ path: Path2; lift: number; offset: number }> = [];
  for (let k = 0; k < 7; k++) {
    const theta0 = 0.04 + k * 0.085;
    const phi0 = 0.5 + (k % 2) * 0.03;
    const path: Path2 = [[theta0, phi0]];
    let t = theta0;
    let p = phi0;
    const segments = 2 + Math.floor(random() * 3);
    for (let s = 0; s < segments; s++) {
      const up = 1 + Math.floor(random() * 3);
      p += up * g;
      path.push([t, p]);
      if (random() < 0.7) {
        const diag = 1 + Math.floor(random() * 2);
        t += diag * g * (random() < 0.8 ? 1 : -0.5);
        p += diag * g;
        path.push([t, p]);
      }
    }
    if (p > 1.45) continue;
    const offset = random();
    traces.push({ path, lift: 0.01, offset });
    traces.push({ path: path.map(([a, b]) => [-a, b] as [number, number]), lift: 0.01, offset: (offset + 0.5) % 1 });
  }
  // Outer holographic layer floating above the cranium.
  for (let k = 0; k < 4; k++) {
    const theta0 = 0.12 + k * 0.16;
    const path: Path2 = [[theta0, 1.0], [theta0, 1.12 + k * 0.04], [theta0 + 0.12, 1.24 + k * 0.04], [theta0 + 0.12, 1.36]];
    const offset = random();
    traces.push({ path, lift: 0.045, offset });
    traces.push({ path: path.map(([a, b]) => [-a, b] as [number, number]), lift: 0.045, offset: (offset + 0.37) % 1 });
  }
  // Temple feeds: horizontal runs from the temple modules toward the face.
  for (const s of [-1, 1]) {
    traces.push({ path: [[s * 1.3, 0.12], [s * 1.02, 0.12], [s * 0.88, 0.2], [s * 0.74, 0.2]], lift: 0.012, offset: random() });
    traces.push({ path: [[s * 1.32, -0.05], [s * 1.05, -0.05], [s * 0.95, -0.14]], lift: 0.012, offset: random() });
  }

  const traceLengths = traces.map(({ path }) =>
    path.slice(1).reduce((acc, [a, b], i) => acc + Math.hypot(a - path[i][0], b - path[i][1]), 0),
  );
  const totalTrace = traceLengths.reduce((a, b) => a + b, 0);
  const circuitColor = mixRgb(PALETTE.cyan, PALETTE.ice, 0.25);
  const nodes: Array<[number, number, number]> = [];
  traces.forEach(({ path, lift, offset }, ti) => {
    const n = Math.floor((traceLengths[ti] / totalTrace) * budget.circuits);
    let emitted = 0;
    samplePolyline(
      path.map(([a, b]) => [a, b, 0] as const),
      n,
      random,
      (theta, phi) => {
        const s = emitted++ / Math.max(1, n - 1);
        const flow = 0.001 + ((s * 0.6 + offset) % 1) * 0.998;
        const outer = lift > 0.03;
        emit(onCranium(theta, phi, lift), outer ? PALETTE.ice : circuitColor, outer ? 0.55 : 0.68, outer ? 0.6 : 0.7, 0, flow);
      },
      0.0015,
    );
    const end = path[path.length - 1];
    const start = path[0];
    const e = onCranium(end[0], end[1], lift);
    if (e) nodes.push(e);
    if (ti % 3 === 0) {
      const s0 = onCranium(start[0], start[1], lift);
      if (s0) nodes.push(s0);
    }
  });
  for (let i = 0; i < budget.nodes && nodes.length > 0; i++) {
    const [nx, ny, nz] = nodes[i % nodes.length];
    const r = Math.abs(gaussian(random)) * 0.01;
    const a = random() * Math.PI * 2;
    w.push(nx + Math.cos(a) * r, ny + Math.sin(a) * r, nz + 0.004, PALETTE.white, 0.9, 0.9 + random() * 0.6);
  }

  // 5. Eyes: almond rim, iris rings, pupil core and inner glow. Tagged for blinking.
  const eyeZ = (x: number, y: number) => (frontSurfaceZ(x, y) ?? 0.62) + 0.01;
  for (let n = 0; n < budget.eyes; n++) {
    const side = n % 2 === 0 ? -1 : 1;
    const cx = side * EYE.x;
    const cy = EYE.y;
    const tag = side < 0 ? 1 : 2;
    const pick = random();
    const a = random() * Math.PI * 2;
    let x: number;
    let y: number;
    let color: Rgb;
    let brightness: number;
    let size: number;
    if (pick < 0.3) {
      const ry = Math.sin(a) > 0 ? EYE.ryUp : EYE.ryLow;
      x = cx + Math.cos(a) * EYE.rx;
      y = cy + Math.sin(a) * ry + 0.014 * ((x - cx) * side) / EYE.rx;
      color = mixRgb(PALETTE.cyan, PALETTE.ice, 0.3);
      brightness = 0.55;
      size = 0.85 + random() * 0.3;
    } else if (pick < 0.55) {
      const r = random() < 0.6 ? 0.042 : 0.03;
      x = cx + Math.cos(a) * r;
      y = cy + Math.sin(a) * r;
      color = r > 0.035 ? PALETTE.cyan : mixRgb(PALETTE.cyan, PALETTE.white, 0.5);
      brightness = 0.7;
      size = 0.8 + random() * 0.3;
    } else if (pick < 0.7) {
      const r = Math.pow(random(), 0.6) * 0.016;
      x = cx + Math.cos(a) * r;
      y = cy + Math.sin(a) * r;
      color = PALETTE.white;
      brightness = 0.9;
      size = 1.1 + random() * 0.7;
    } else {
      const r = Math.sqrt(random());
      const ry = Math.sin(a) > 0 ? EYE.ryUp : EYE.ryLow;
      x = cx + Math.cos(a) * EYE.rx * r * 0.92;
      y = cy + Math.sin(a) * ry * r * 0.9;
      color = mixRgb(PALETTE.teal, PALETTE.cyan, random());
      brightness = 0.22;
      size = 0.6 + random() * 0.3;
    }
    w.push(x, y, eyeZ(x, y), color, brightness, size, tag, 0);
  }

  // 6. Temple modules: layered rings, spokes and a recessed core.
  for (const side of [-1, 1]) {
    const surface = radialSurface(0, 0.02, -0.1, side, 0, 0);
    const baseX = surface ? surface[0] : side * 0.78;
    const per = Math.floor(budget.temples / 2);
    for (let i = 0; i < per; i++) {
      const pick = random();
      const a = random() * Math.PI * 2;
      let r: number;
      let dx: number;
      let color: Rgb = mixRgb(PALETTE.steel, PALETTE.teal, 0.45);
      let brightness = 0.55;
      if (pick < 0.22) {
        r = 0.27;
        dx = -random() * 0.05;
      } else if (pick < 0.42) {
        r = 0.2;
        dx = 0.025;
        color = mixRgb(PALETTE.teal, PALETTE.ice, 0.4);
        brightness = 0.65;
      } else if (pick < 0.58) {
        r = 0.13;
        dx = 0.045;
        color = PALETTE.cyan;
        brightness = 0.8;
      } else if (pick < 0.72) {
        r = Math.sqrt(random()) * 0.06;
        dx = 0.055;
        color = mixRgb(PALETTE.cyan, PALETTE.white, 0.5);
        brightness = 0.95;
      } else {
        const spoke = Math.floor(random() * 8);
        const sa = (spoke / 8) * Math.PI * 2 + 0.2;
        r = 0.13 + random() * 0.14;
        dx = 0.02;
        const y = 0.02 + Math.sin(sa) * r;
        const z = -0.1 + Math.cos(sa) * r;
        w.push(baseX + side * dx, y, z, mixRgb(PALETTE.steel, PALETTE.ice, 0.3), 0.45, 0.65);
        continue;
      }
      const y = 0.02 + Math.sin(a) * r;
      const z = -0.1 + Math.cos(a) * r;
      w.push(baseX + side * (dx + 0.015), y, z, color, brightness, 0.7 + random() * 0.3);
    }
  }

  // 7. Mechanical neck: ribs and pistons over the SDF neck surface.
  for (let i = 0; i < budget.neck; i++) {
    const pick = random();
    let x: number;
    let y: number;
    let z: number;
    if (pick < 0.6) {
      const rib = Math.floor(random() * 6);
      y = -1.0 - rib * 0.13;
      const a = random() * Math.PI * 2;
      x = Math.sin(a) * 0.36;
      z = -0.19 + Math.cos(a) * 0.36;
    } else {
      const piston = Math.floor(random() * 4);
      const a = [-0.55, 0.55, -2.4, 2.4][piston];
      y = -0.9 - random() * 0.85;
      x = Math.sin(a) * 0.4;
      z = -0.19 + Math.cos(a) * 0.4;
    }
    const fade = smoothstep(NECK_BOTTOM, -1.05, y);
    const front = z > -0.19 ? 1 : 0.4;
    w.push(x, y, z, mixRgb(PALETTE.steel, PALETTE.teal, 0.35), 0.5 * fade * front + 0.04, 0.6 + random() * 0.3);
  }

  // 8. Sparse data motes in a shell around the head (atmosphere + morph mass).
  for (let i = 0; i < budget.motes; i++) {
    const u = random() * 2 - 1;
    const a = random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = 1.25 + Math.pow(random(), 1.5) * 0.7;
    w.push(Math.cos(a) * s * r, 0.1 + u * r * 1.1, Math.sin(a) * s * r * 0.8 - 0.1, mixRgb(PALETTE.teal, PALETTE.blue, random()), 0.1 + random() * 0.12, 0.4 + random() * 0.4);
  }

  // Fill any shortfall (failed projections) on the face surface.
  while (w.remaining > 0) {
    const x = (random() * 2 - 1) * 0.55;
    const y = -0.9 + random() * 1.6;
    const p = onFront(x, y, 0);
    if (!p) continue;
    const { color, brightness } = shadeSurface(headNormal(p[0], p[1], p[2]), y);
    w.push(p[0], p[1], p[2], color, brightness, 0.6);
  }

  w.transform(SCALE, 0, OFFSET_Y, 0);
  return w.data;
}
