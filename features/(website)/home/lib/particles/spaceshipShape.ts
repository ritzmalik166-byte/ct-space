import {
  PALETTE,
  ShapeWriter,
  allocate,
  clamp01,
  gaussian,
  mixRgb,
  samplePolyline,
  type Random,
  type Rgb,
  type ShapePoints,
} from "./shapeUtils";

/*
 * Local space: nose +X, up +Y, span along Z. Fuselage is a loft of
 * superellipse cross-sections; wings and stabilisers are thin airfoil plates.
 * Tags: [plume length, nozzle id (1..3) for plume points / 1 for nozzle glow].
 */

const SCALE = 0.98;
const OFFSET_X = -0.06;

const NOSE = 2.55;
const TAIL = -2.25;

interface Section {
  w: number;
  h: number;
  yc: number;
  n: number;
}

function section(x: number): Section {
  if (x > 1.2) {
    const s = clamp01((NOSE - x) / (NOSE - 1.2));
    return { w: 0.36 * Math.pow(s, 0.62), h: 0.25 * Math.pow(s, 0.72), yc: -0.03 * (1 - s), n: 2.3 };
  }
  if (x > -0.9) {
    const t = (1.2 - x) / 2.1;
    return { w: 0.36 + 0.08 * t, h: 0.25 + 0.03 * t, yc: 0, n: 2.8 };
  }
  if (x > -2.0) {
    const t = (-0.9 - x) / 1.1;
    return { w: 0.44 + 0.05 * Math.sin(t * Math.PI * 0.5), h: 0.28 + 0.02 * t, yc: 0, n: 3.2 };
  }
  const t = clamp01((-2.0 - x) / (-2.0 - TAIL));
  return { w: 0.49 - 0.04 * t, h: 0.3 - 0.03 * t, yc: 0, n: 3.2 };
}

/** Superellipse point + approximate outward normal for angle a. */
function hullPoint(x: number, a: number) {
  const s = section(x);
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const cz = Math.sign(c) * Math.pow(Math.abs(c), 2 / s.n);
  const cy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / s.n);
  const y = s.yc + cy * s.h;
  const z = cz * s.w;
  const ny = Math.sign(cy) * Math.pow(Math.abs(cy), s.n - 1) / s.h;
  const nz = Math.sign(cz) * Math.pow(Math.abs(cz), s.n - 1) / s.w;
  const l = Math.hypot(ny, nz) || 1;
  return { y, z, ny: ny / l, nz: nz / l, s };
}

/** Top key light + cool rim for metallic panels. */
function metal(ny: number, nz: number, base: Rgb = PALETTE.steel) {
  const key = Math.max(0, ny * 0.8 + nz * 0.35);
  const rim = Math.pow(1 - Math.abs(ny), 3) * 0.3;
  const lit = Math.pow(key, 1.2);
  return {
    color: mixRgb(mixRgb(PALETTE.slate, base, 0.25 + lit * 0.75), PALETTE.ice, lit * 0.35),
    brightness: 0.12 + lit * 0.7 + rim,
  };
}

export interface ShipNozzle {
  x: number;
  y: number;
  z: number;
  r: number;
}

const NOZZLES_LOCAL: ShipNozzle[] = [
  { x: TAIL - 0.17, y: 0.0, z: 0, r: 0.2 },
  { x: TAIL - 0.12, y: -0.03, z: -0.3, r: 0.14 },
  { x: TAIL - 0.12, y: -0.03, z: 0.3, r: 0.14 },
];

/** Nozzle exits in final scene units (plume taper axis in the shader). */
export const SHIP_NOZZLES: ShipNozzle[] = NOZZLES_LOCAL.map((n) => ({
  x: n.x * SCALE + OFFSET_X,
  y: n.y * SCALE,
  z: n.z * SCALE,
  r: n.r * SCALE,
}));

// Wing planform.
const ROOT_Z = 0.42;
const TIP_Z = 2.05;
const ROOT_LE = 0.3;
const ROOT_TE = -1.45;
const TIP_LE = -1.2;
const TIP_TE = -1.6;
const wingChord = (s: number) => ({ le: ROOT_LE + (TIP_LE - ROOT_LE) * s, te: ROOT_TE + (TIP_TE - ROOT_TE) * s });
const wingY = (s: number) => -0.07 + 0.06 * s;
const wingThickness = (s: number, c: number) => 0.065 * (1 - 0.65 * s) * 4 * c * (1 - c);

export function createSpaceshipShape(count: number, random: Random): ShapePoints {
  const w = new ShapeWriter(count);
  const budget = allocate(count, {
    hull: 0.25,
    hullLines: 0.07,
    canopy: 0.05,
    strakes: 0.03,
    wings: 0.19,
    wingLines: 0.09,
    tipFins: 0.02,
    stabilizers: 0.07,
    nozzles: 0.06,
    glow: 0.03,
    plume: 0.08,
    details: 0.06,
  });

  const edge = mixRgb(PALETTE.cyan, PALETTE.ice, 0.4);
  const line = mixRgb(PALETTE.teal, PALETTE.ice, 0.3);

  // Fuselage hull, density proportional to section perimeter.
  for (let n = 0; n < budget.hull; ) {
    const x = TAIL + random() * (NOSE - TAIL);
    const s = section(x);
    if (random() > Math.sqrt((s.w * s.w + s.h * s.h) / 0.33)) continue;
    const a = random() * Math.PI * 2;
    const p = hullPoint(x, a);
    // Leave the intake openings empty.
    if (x < 0.75 && x > 0.05 && Math.abs(p.z) > s.w * 0.9 && p.y < 0 && p.y > -s.h * 0.75) continue;
    const { color, brightness } = metal(p.ny, p.nz);
    w.push(x, p.y, p.z, color, brightness * (p.ny < -0.3 ? 0.55 : 1), 0.55 + random() * 0.4);
    n++;
  }

  // Chines, spine and panel rings.
  for (let i = 0; i < budget.hullLines; i++) {
    const pick = random();
    if (pick < 0.45) {
      const x = TAIL + random() * (NOSE - 0.05 - TAIL);
      const side = random() < 0.5 ? 0 : Math.PI;
      const p = hullPoint(x, side);
      w.push(x, p.y, p.z * 1.01, edge, 0.75, 0.75 + random() * 0.3);
    } else if (pick < 0.65) {
      const x = -1.95 + random() * 2.6;
      const p = hullPoint(x, Math.PI / 2);
      w.push(x, p.y + 0.008, p.z, line, 0.6, 0.7);
    } else {
      const rings = [1.75, 1.2, 0.6, 0.05, -0.55, -1.15, -1.7];
      const x = rings[Math.floor(random() * rings.length)];
      const a = random() * Math.PI * 2;
      const p = hullPoint(x, a);
      w.push(x, p.y + p.ny * 0.006, p.z + p.nz * 0.006, line, p.ny < -0.3 ? 0.3 : 0.55, 0.65);
    }
  }

  // Cockpit canopy: teardrop glass with frame lines.
  for (let i = 0; i < budget.canopy; i++) {
    const t = Math.pow(random(), 0.9);
    const x = 0.7 + t * 1.1;
    const prof = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.7);
    const top = hullPoint(x, Math.PI / 2).y;
    const a = random() * Math.PI;
    const isFrame = random() < 0.2;
    const frameX = [0.95, 1.35];
    const fx = isFrame ? frameX[Math.floor(random() * 2)] : x;
    const ft = (fx - 0.7) / 1.1;
    const fprof = isFrame ? Math.pow(Math.sin(Math.PI * Math.pow(ft, 0.75)), 0.7) : prof;
    const cy = isFrame && random() < 0.4 ? 1 : Math.sin(a);
    const cz = isFrame && cy === 1 ? 0 : Math.cos(a);
    const y = (isFrame ? hullPoint(fx, Math.PI / 2).y : top) - 0.02 + cy * 0.17 * fprof;
    const z = cz * 0.19 * fprof;
    const glint = clamp01(cy * 0.6 + (1 - t) * 0.5);
    const color = isFrame ? PALETTE.steel : mixRgb(PALETTE.teal, PALETTE.white, glint);
    w.push(fx, y, z, color, isFrame ? 0.6 : 0.4 + glint * 0.55, isFrame ? 0.7 : 0.65 + random() * 0.4);
  }

  // Leading-edge extensions blending the nose into the wing roots.
  for (let i = 0; i < budget.strakes; i++) {
    const t = random();
    const side = random() < 0.5 ? -1 : 1;
    const x = 1.35 - t * 1.05;
    const outer = section(x).w + t * 0.38;
    const z = side * (section(x).w + random() * (outer - section(x).w));
    const isEdge = random() < 0.35;
    const zz = isEdge ? side * outer : z;
    w.push(x, -0.02, zz, isEdge ? edge : mixRgb(PALETTE.slate, PALETTE.steel, 0.6), isEdge ? 0.7 : 0.4, 0.6 + random() * 0.3);
  }

  // Main wings: airfoil top and bottom surfaces.
  for (let n = 0; n < budget.wings; ) {
    const s = random();
    const { le, te } = wingChord(s);
    if (random() > (le - te) / (ROOT_LE - ROOT_TE)) continue;
    const c = random();
    const x = te + (le - te) * c;
    const side = n % 2 === 0 ? -1 : 1;
    const z = side * (ROOT_Z + (TIP_Z - ROOT_Z) * s);
    const top = random() < 0.72;
    const th = wingThickness(s, c);
    const y = wingY(s) + (top ? th : -th * 0.55);
    const shade = top ? 0.55 + c * 0.35 : 0.2;
    const { color, brightness } = metal(top ? 1 : -1, 0);
    w.push(x, y, z, mixRgb(color, PALETTE.ice, top ? c * 0.15 : 0), brightness * shade + 0.05, 0.55 + random() * 0.4);
    n++;
  }

  // Wing edges, control-surface hinge lines and panel divisions.
  for (const side of [-1, 1]) {
    const le: Array<readonly [number, number, number]> = [
      [ROOT_LE, wingY(0), side * ROOT_Z],
      [TIP_LE, wingY(1), side * TIP_Z],
    ];
    const te: Array<readonly [number, number, number]> = [
      [TIP_TE, wingY(1), side * TIP_Z],
      [ROOT_TE, wingY(0), side * ROOT_Z],
    ];
    const tip: Array<readonly [number, number, number]> = [
      [TIP_LE, wingY(1), side * TIP_Z],
      [TIP_TE, wingY(1), side * TIP_Z],
    ];
    const per = budget.wingLines / 2;
    samplePolyline(le, Math.floor(per * 0.34), random, (x, y, z) => w.push(x, y, z, edge, 0.85, 0.8 + random() * 0.3));
    samplePolyline(te, Math.floor(per * 0.2), random, (x, y, z) => w.push(x, y, z, line, 0.65, 0.7));
    samplePolyline(tip, Math.floor(per * 0.06), random, (x, y, z) => w.push(x, y, z, edge, 0.8, 0.75));
    const hinge: Array<readonly [number, number, number]> = [0.25, 0.9].map((s) => {
      const { le: l, te: t } = wingChord(s);
      return [t + (l - t) * 0.22, wingY(s) + wingThickness(s, 0.22), side * (ROOT_Z + (TIP_Z - ROOT_Z) * s)] as const;
    });
    samplePolyline(hinge, Math.floor(per * 0.14), random, (x, y, z) => w.push(x, y + 0.004, z, line, 0.5, 0.65));
    for (const s of [0.36, 0.68]) {
      const { le: l, te: t } = wingChord(s);
      const z = side * (ROOT_Z + (TIP_Z - ROOT_Z) * s);
      samplePolyline(
        [[l, wingY(s), z], [t, wingY(s), z]],
        Math.floor(per * 0.08),
        random,
        (x, y, zz) => w.push(x, y + wingThickness(s, clamp01((x - t) / (l - t))) + 0.004, zz, line, 0.45, 0.6),
      );
    }
    samplePolyline(
      [[ROOT_LE - 0.25, wingY(0.05) + 0.03, side * (ROOT_Z + 0.08)], [TIP_LE + 0.05, wingY(0.95) + 0.01, side * (TIP_Z - 0.1)]],
      Math.floor(per * 0.1),
      random,
      (x, y, z) => w.push(x, y, z, line, 0.4, 0.6),
    );
  }

  // Wingtip fins, canted down and outward.
  for (let i = 0; i < budget.tipFins; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const h = random();
    const le = TIP_LE - 0.05 - h * 0.2;
    const te = TIP_TE + 0.02;
    const x = te + (le - te) * random();
    const y = wingY(1) - h * 0.32;
    const z = side * (TIP_Z + h * 0.1);
    const isEdge = random() < 0.35;
    w.push(isEdge ? le : x, y, z, isEdge ? edge : PALETTE.steel, isEdge ? 0.75 : 0.4, 0.65);
  }

  // Twin canted vertical stabilisers.
  for (let i = 0; i < budget.stabilizers; ) {
    const side = i % 2 === 0 ? -1 : 1;
    const h = random();
    const le = -0.95 - h * 0.7;
    const te = -2.0 - h * 0.15;
    if (random() > (le - te) / 1.05) continue;
    const c = random();
    const x = te + (le - te) * c;
    const base = hullPoint(-1.4, Math.PI / 2).y;
    const y = base + h * 0.88;
    const z = side * (0.28 + h * 0.36) + side * (random() < 0.5 ? 0.012 : -0.012) * (1 - h);
    const pick = random();
    if (pick < 0.22) {
      w.push(le, y, z, edge, 0.8, 0.75);
    } else if (pick < 0.3) {
      w.push(te, y, z, line, 0.55, 0.65);
    } else {
      const lit = 0.35 + c * 0.25 + (1 - h) * 0.1;
      w.push(x, y, z, mixRgb(PALETTE.slate, PALETTE.steel, lit), lit, 0.55 + random() * 0.35);
    }
    i++;
  }

  // Nozzle bells: flared metal frustums with bright exit rims.
  for (let i = 0; i < budget.nozzles; i++) {
    const nz = NOZZLES_LOCAL[i % 3];
    const t = random();
    const x = TAIL + 0.05 - t * (TAIL + 0.05 - nz.x);
    const r = nz.r * (0.82 + 0.18 * t);
    const a = random() * Math.PI * 2;
    const rim = t > 0.88;
    const ring = !rim && random() < 0.15;
    const color = rim ? PALETTE.cyan : ring ? line : PALETTE.steel;
    w.push(x, nz.y + Math.sin(a) * r, nz.z + Math.cos(a) * r, color, rim ? 1.0 : ring ? 0.5 : 0.3 + Math.max(0, Math.sin(a)) * 0.35, rim ? 0.9 : 0.6);
  }

  // Engine throat glow (flickers in the shader).
  for (let i = 0; i < budget.glow; i++) {
    const nz = NOZZLES_LOCAL[i % 3];
    const r = Math.sqrt(random()) * nz.r * 0.78;
    const a = random() * Math.PI * 2;
    const core = 1 - r / (nz.r * 0.78);
    w.push(nz.x + 0.02, nz.y + Math.sin(a) * r, nz.z + Math.cos(a) * r, mixRgb(PALETTE.cyan, PALETTE.white, core * 0.8), 0.7 + core * 0.6, 0.8 + core * 1.0, 0, 1);
  }

  // Exhaust plume particles, streamed along -X in the shader.
  for (let i = 0; i < budget.plume; i++) {
    const id = i % 5 < 3 ? 0 : i % 2 === 0 ? 1 : 2;
    const nz = NOZZLES_LOCAL[id];
    const r = Math.abs(gaussian(random)) * nz.r * 0.38;
    const a = random() * Math.PI * 2;
    const length = (id === 0 ? 1.15 : 0.8) * (0.65 + random() * 0.35);
    const color = mixRgb(PALETTE.cyan, PALETTE.white, clamp01(1 - r / (nz.r * 0.5)) * 0.6);
    w.push(nz.x - 0.01, nz.y + Math.sin(a) * r, nz.z + Math.cos(a) * r, color, 0.8, 0.7 + random() * 0.9, length, id + 1);
  }

  // Details: intakes, antennae, RCS ports, nav lights.
  for (let i = 0; i < budget.details; i++) {
    const pick = random();
    if (pick < 0.4) {
      const side = random() < 0.5 ? -1 : 1;
      const rect: Array<readonly [number, number, number]> = [
        [0.75, -0.02, 0], [0.05, -0.02, 0], [0.05, -0.2, 0], [0.75, -0.2, 0], [0.75, -0.02, 0],
      ];
      samplePolyline(rect, 1, random, (x, y) => {
        const s = section(x);
        w.push(x, y, side * (s.w * 1.0 + 0.01), edge, 0.7, 0.65);
      }, 0.002);
    } else if (pick < 0.6) {
      const k = random() < 0.5 ? 0 : 1;
      const ax = [-0.25, 0.3][k];
      const base = hullPoint(ax, Math.PI / 2).y;
      const t = random();
      w.push(ax - t * 0.12, base + t * 0.2, 0, t > 0.92 ? PALETTE.white : PALETTE.steel, t > 0.92 ? 1.1 : 0.5, t > 0.92 ? 1.1 : 0.55);
    } else if (pick < 0.75) {
      const side = random() < 0.5 ? -1 : 1;
      const px = [1.85, 1.6][Math.floor(random() * 2)];
      const s = section(px);
      w.push(px + gaussian(random) * 0.02, gaussian(random) * 0.02, side * s.w * 1.02, line, 0.65, 0.6);
    } else {
      const side = random() < 0.5 ? -1 : 1;
      const r = Math.abs(gaussian(random)) * 0.03;
      const a = random() * Math.PI * 2;
      w.push(TIP_LE - 0.12 + Math.cos(a) * r, wingY(1) + 0.02 + Math.sin(a) * r, side * (TIP_Z + 0.03), side < 0 ? PALETTE.white : PALETTE.cyan, 1.2, 1.1 + random() * 0.8);
    }
  }

  while (w.remaining > 0) {
    const x = -1.5 + random() * 2.5;
    const p = hullPoint(x, random() * Math.PI * 2);
    const { color, brightness } = metal(p.ny, p.nz);
    w.push(x, p.y, p.z, color, brightness, 0.6);
  }

  w.transform(SCALE, OFFSET_X, 0, 0);
  return w.data;
}
