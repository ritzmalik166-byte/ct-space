import {
  PALETTE,
  ShapeWriter,
  allocate,
  clamp01,
  gaussian,
  mixRgb,
  type Random,
  type Rgb,
  type ShapePoints,
} from "./shapeUtils";

/*
 * Barred spiral galaxy in the local XZ plane (Y = disc thickness). Arms are
 * logarithmic spirals starting at the bar ends with controlled irregularity
 * in pitch, width and density. Dust lanes are carved out of the inner edge of
 * each arm (additive rendering cannot darken, so lanes are gaps with a few
 * faint warm particles). The scene tilts the disc; the shader rotates it.
 */

const RADIUS = 3.0;
const BAR = 0.5;
/** 1 / tan(pitch angle) — ~21° pitch. */
const WIND = 2.6;

interface Arm {
  offset: number;
  strength: number;
  seed: number;
}

const ARMS: Arm[] = [
  { offset: 0, strength: 1, seed: 0.3 },
  { offset: Math.PI, strength: 1, seed: 1.7 },
  { offset: Math.PI * 0.5, strength: 0.55, seed: 2.9 },
  { offset: Math.PI * 1.5, strength: 0.5, seed: 4.1 },
];

function armAngle(arm: Arm, r: number): number {
  const base = arm.offset + Math.log(Math.max(r, BAR) / BAR) * WIND;
  return base + 0.14 * Math.sin(r * 2.1 + arm.seed) + 0.05 * Math.sin(r * 5.3 + arm.seed * 2.0);
}

function armWidth(arm: Arm, t: number, r: number): number {
  return (0.075 + 0.16 * t) * (1 + 0.32 * Math.sin(r * 3.1 + arm.seed * 3.0)) * (arm.strength < 1 ? 1.25 : 1);
}

/** Polar point on the disc with a radial offset from the arm centre line. */
function onArm(arm: Arm, r: number, radialOffset: number, tangentialOffset: number): [number, number] {
  const a = armAngle(arm, r) + tangentialOffset / Math.max(r, 0.3);
  const rr = r + radialOffset;
  return [Math.cos(a) * rr, Math.sin(a) * rr];
}

function armColor(t: number): Rgb {
  const inner = mixRgb(PALETTE.ice, PALETTE.cyan, clamp01(t * 2.4));
  const mid = mixRgb(inner, PALETTE.blue, clamp01((t - 0.3) * 2.2));
  return mixRgb(mid, PALETTE.violet, clamp01((t - 0.62) * 2.4));
}

export function createGalaxyShape(count: number, random: Random): ShapePoints {
  const w = new ShapeWriter(count);
  const budget = allocate(count, {
    bulge: 0.13,
    bar: 0.04,
    arms: 0.43,
    spurs: 0.06,
    knots: 0.05,
    dust: 0.04,
    disc: 0.16,
    halo: 0.09,
  });

  // Oblate bulge: dense, warm, exponential falloff, many small points.
  for (let i = 0; i < budget.bulge; i++) {
    const r = -Math.log(Math.max(random(), 1e-4)) * 0.17;
    const u = random() * 2 - 1;
    const a = random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const x = Math.cos(a) * s * r;
    const z = Math.sin(a) * s * r;
    const y = u * r * 0.55;
    const heat = clamp01(1 - r / 0.6);
    const color = mixRgb(PALETTE.ice, mixRgb(PALETTE.gold, PALETTE.white, heat * 0.5), heat * 0.85);
    w.push(x, y, z, color, 0.15 + heat * 0.3, 0.45 + random() * 0.6 + heat * 0.2);
  }

  // Central bar linking the two major arms.
  for (let i = 0; i < budget.bar; i++) {
    const t = (random() * 2 - 1) * BAR * 1.05;
    const a = ARMS[0].offset;
    const spread = 0.07 * (1 - Math.abs(t) / (BAR * 1.4));
    const x = Math.cos(a) * t + gaussian(random) * spread;
    const z = Math.sin(a) * t + gaussian(random) * spread;
    const y = gaussian(random) * 0.04;
    w.push(x, y, z, mixRgb(PALETTE.gold, PALETTE.ice, Math.abs(t) / BAR), 0.3 + random() * 0.2, 0.5 + random() * 0.5);
  }

  // Spiral arms with carved dust lanes.
  for (let n = 0; n < budget.arms; ) {
    const arm = ARMS[n % ARMS.length];
    const t = Math.pow(random(), arm.strength < 1 ? 1.0 : 0.9);
    const r = BAR + t * (RADIUS - BAR);
    // Clumpy density along the arm (breaks and brighter segments).
    const clump = 0.62 + 0.38 * Math.sin(r * 4.3 + arm.seed * 5.0) * Math.sin(r * 1.7 + arm.seed);
    if (random() > clump) continue;
    const width = armWidth(arm, t, r);
    // ~28% form a broad, faint haze envelope that gives the arms volume.
    const haze = random() < 0.28;
    const radial = gaussian(random) * width * (haze ? 2.1 : 1);
    // Dust lane on the inner edge of the major arms.
    if (arm.strength === 1 && radial < -0.45 * width && radial > -1.05 * width && random() < 0.85) continue;
    const tangential = gaussian(random) * width * 0.8;
    const [x, z] = onArm(arm, r, radial, tangential);
    const y = gaussian(random) * (0.035 + 0.045 * t) * (haze ? 1.8 : 1);

    if (haze) {
      w.push(x, y, z, mixRgb(armColor(t), PALETTE.violet, 0.25), 0.1 + random() * 0.1, 0.8 + random() * 0.6);
      n++;
      continue;
    }

    const core = Math.exp(-(radial * radial) / (2 * width * width * 0.3));
    const bright = random() < 0.025;
    const color = bright ? mixRgb(PALETTE.white, PALETTE.ice, random()) : armColor(t);
    const brightness = (0.18 + 0.58 * core) * (0.55 + 0.45 * arm.strength) * (bright ? 1.7 : 1);
    const size = bright ? 1.4 + random() * 0.9 : 0.45 + random() * 0.7 + core * 0.25;
    w.push(x, y, z, color, brightness, size, bright ? 1 : 0);
    n++;
  }

  // Feathered spurs branching outward from the major arms.
  const spurCount = 22;
  for (let i = 0; i < budget.spurs; i++) {
    const k = i % spurCount;
    const arm = ARMS[k % 2];
    const r0 = 0.9 + ((k * 0.618034) % 1) * (RADIUS - 1.3);
    const len = 0.35 + ((k * 0.414) % 1) * 0.4;
    const s = random();
    const r = r0 + s * len;
    const a = armAngle(arm, r0) + s * len * 0.9 / r0;
    const spread = 0.04 + s * 0.05;
    const x = Math.cos(a) * r + gaussian(random) * spread;
    const z = Math.sin(a) * r + gaussian(random) * spread;
    const y = gaussian(random) * 0.03;
    w.push(x, y, z, armColor(clamp01((r - BAR) / (RADIUS - BAR))), 0.18 + (1 - s) * 0.2, 0.4 + random() * 0.5);
  }

  // Star-forming knots (magenta HII) and young blue clusters on the arms.
  const knotCount = 46;
  for (let i = 0; i < budget.knots; i++) {
    const k = i % knotCount;
    const arm = ARMS[k % ARMS.length];
    const kr = 0.8 + ((k * 0.754877) % 1) * (RADIUS - 1.0);
    const [kx, kz] = onArm(arm, kr, ((k * 0.37) % 1 - 0.5) * 0.08, 0);
    const tight = 0.025 + ((k * 0.29) % 1) * 0.03;
    const x = kx + gaussian(random) * tight;
    const z = kz + gaussian(random) * tight;
    const y = gaussian(random) * 0.02;
    const hii = k % 3 === 0;
    const color = hii ? mixRgb(PALETTE.magenta, PALETTE.orchid, random() * 0.5) : mixRgb(PALETTE.ice, PALETTE.cyan, random());
    w.push(x, y, z, color, hii ? 0.45 : 0.6, 0.55 + random() * 0.7);
  }

  // Faint warm dust filling the carved lanes.
  for (let i = 0; i < budget.dust; i++) {
    const arm = ARMS[i % 2];
    const t = Math.pow(random(), 0.8);
    const r = BAR + 0.15 + t * (RADIUS * 0.85 - BAR);
    const width = armWidth(arm, t, r);
    const radial = -0.75 * width + gaussian(random) * width * 0.15;
    const [x, z] = onArm(arm, r, radial, gaussian(random) * width);
    const y = gaussian(random) * 0.02;
    w.push(x, y, z, PALETTE.dust, 0.12 + random() * 0.08, 0.5 + random() * 0.4);
  }

  // Exponential disc with weak spiral modulation (inter-arm stars).
  for (let n = 0; n < budget.disc; ) {
    const r = Math.min(RADIUS * 1.15, -Math.log(Math.max(random(), 1e-4)) * 0.95 + 0.15);
    const a = random() * Math.PI * 2;
    let near = 0;
    for (let k = 0; k < 2; k++) {
      const d = Math.abs(Math.sin((a - armAngle(ARMS[k], r)) * 0.5));
      near = Math.max(near, 1 - d);
    }
    if (random() > 0.35 + 0.65 * near * near) continue;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = gaussian(random) * (0.05 + 0.03 * r / RADIUS);
    const color = mixRgb(mixRgb(PALETTE.ice, PALETTE.blue, clamp01(r / 1.8)), PALETTE.deepBlue, clamp01((r - 1.8) / 1.4));
    w.push(x, y, z, color, 0.13 + random() * 0.16, 0.45 + random() * 0.55);
    n++;
  }

  // Halo: sparse envelope plus a handful of compact globular clusters.
  const globulars = 7;
  for (let i = 0; i < budget.halo; i++) {
    if (i % 3 === 0) {
      const g = i % globulars;
      const ga = g * 2.399;
      const gr = 1.1 + ((g * 0.618) % 1) * 1.8;
      const gy = (g % 2 === 0 ? 1 : -1) * (0.35 + ((g * 0.37) % 1) * 0.6);
      const c = Math.abs(gaussian(random)) * 0.05;
      const ca = random() * Math.PI * 2;
      const cu = random() * 2 - 1;
      const cs = Math.sqrt(1 - cu * cu);
      w.push(
        Math.cos(ga) * gr + Math.cos(ca) * cs * c,
        gy + cu * c,
        Math.sin(ga) * gr + Math.sin(ca) * cs * c,
        mixRgb(PALETTE.gold, PALETTE.ice, 0.6),
        0.32 + random() * 0.2,
        0.45 + random() * 0.4,
      );
    } else {
      const r = 0.5 + Math.pow(random(), 0.55) * RADIUS * 1.2;
      const a = random() * Math.PI * 2;
      const y = gaussian(random) * 0.3 * (1.1 - r / (RADIUS * 1.5));
      const color = mixRgb(PALETTE.violet, PALETTE.deepBlue, random());
      w.push(Math.cos(a) * r, y, Math.sin(a) * r, color, 0.08 + random() * 0.1, 0.4 + random() * 0.5);
    }
  }

  while (w.remaining > 0) {
    const r = Math.abs(gaussian(random)) * 0.3;
    const a = random() * Math.PI * 2;
    w.push(Math.cos(a) * r, gaussian(random) * 0.05, Math.sin(a) * r, PALETTE.ice, 0.25, 0.5);
  }

  return w.data;
}
