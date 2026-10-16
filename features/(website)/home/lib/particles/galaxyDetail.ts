import { ARMS, BAR, RADIUS, armAngle, armColor, armWidth, onArm, type Arm } from "./galaxyShape";
import { PALETTE, allocate, clamp01, createRandom, gaussian, mixRgb, type Rgb } from "./shapeUtils";

/*
 * Galaxy-only detail layer: fine stars, dust and volume that sit on the same
 * arms as the morphing galaxy but are not part of the morph. It adds density
 * without changing the robot/spaceship particle budgets and dissolves as the
 * morph begins.
 */

export interface GalaxyDetailData {
  count: number;
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  /** phase, seed */
  meta: Float32Array;
}

export function createGalaxyDetail(count: number, seed = 2024): GalaxyDetailData {
  const random = createRandom(seed);
  const data: GalaxyDetailData = {
    count,
    positions: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    meta: new Float32Array(count * 2),
  };
  let index = 0;
  const push = (x: number, y: number, z: number, color: Rgb, brightness: number, size: number) => {
    if (index >= count) return;
    const i = index++;
    data.positions.set([x, y, z], i * 3);
    data.colors.set([color[0] * brightness, color[1] * brightness, color[2] * brightness], i * 3);
    data.sizes[i] = size;
    data.meta[i * 2] = random();
    data.meta[i * 2 + 1] = random();
  };

  const budget = allocate(count, {
    core: 0.1,
    arms: 0.4,
    clusters: 0.07,
    bright: 0.03,
    outer: 0.08,
    volume: 0.1,
    disc: 0.22,
  });

  const pickArm = (): Arm => {
    const u = random();
    return u < 0.36 ? ARMS[0] : u < 0.72 ? ARMS[1] : u < 0.86 ? ARMS[2] : ARMS[3];
  };

  // Dense, compact core of fine icy-white stars.
  for (let i = 0; i < budget.core; i++) {
    const r = -Math.log(Math.max(random(), 1e-4)) * 0.11;
    const u = random() * 2 - 1;
    const a = random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const heat = clamp01(1 - r / 0.45);
    const color = mixRgb(PALETTE.ice, PALETTE.white, heat);
    push(Math.cos(a) * s * r, u * r * 0.5, Math.sin(a) * s * r, color, 0.09 + heat * 0.16, 0.3 + random() * 0.3);
  }

  // Fine stars filling the spiral arms (with the same dust-lane carve).
  for (let n = 0; n < budget.arms; ) {
    const arm = pickArm();
    const t = Math.pow(random(), 0.85);
    const r = BAR + t * (RADIUS * 1.06 - BAR);
    const width = armWidth(arm, t, r) * 1.25;
    const radial = gaussian(random) * width;
    if (arm.strength === 1 && radial < -0.45 * width && radial > -1.05 * width && random() < 0.8) continue;
    const [x, z] = onArm(arm, r, radial, gaussian(random) * width);
    const y = gaussian(random) * (0.03 + 0.06 * t);
    const core = Math.exp(-(radial * radial) / (2 * width * width * 0.35));
    const color = mixRgb(armColor(t), PALETTE.white, random() < 0.15 ? 0.5 : 0);
    push(x, y, z, color, (0.1 + 0.26 * core) * (0.6 + 0.4 * arm.strength), 0.28 + random() * 0.32);
    n++;
  }

  // Tight micro star clusters strung along the arms.
  const clusterCount = 96;
  for (let i = 0; i < budget.clusters; i++) {
    const k = i % clusterCount;
    const arm = ARMS[k % ARMS.length];
    const kr = 0.7 + ((k * 0.618034) % 1) * (RADIUS - 0.7);
    const [kx, kz] = onArm(arm, kr, ((k * 0.41) % 1 - 0.5) * 0.14, ((k * 0.73) % 1 - 0.5) * 0.2);
    const tight = 0.012 + ((k * 0.29) % 1) * 0.025;
    const tone = (k * 0.37) % 1;
    const color = tone < 0.65 ? mixRgb(PALETTE.ice, PALETTE.cyan, tone) : mixRgb(PALETTE.orchid, PALETTE.violet, tone);
    push(kx + gaussian(random) * tight, gaussian(random) * tight * 0.6, kz + gaussian(random) * tight, color, 0.26, 0.32 + random() * 0.3);
  }

  // Selective brighter stars for contrast and depth.
  for (let i = 0; i < budget.bright; i++) {
    const arm = pickArm();
    const t = random();
    const r = BAR + t * (RADIUS - BAR);
    const [x, z] = onArm(arm, r, gaussian(random) * armWidth(arm, t, r) * 1.6, 0);
    const color = mixRgb(PALETTE.white, t < 0.5 ? PALETTE.cyan : PALETTE.ice, random() * 0.6);
    push(x, gaussian(random) * 0.06, z, color, 0.45 + random() * 0.35, 0.65 + random() * 0.45);
  }

  // Faint outer arm extensions fading into blue/violet.
  for (let i = 0; i < budget.outer; i++) {
    const arm = ARMS[i % 2];
    const r = RADIUS * (0.85 + Math.pow(random(), 1.4) * 0.55);
    const fade = clamp01((r - RADIUS * 0.85) / (RADIUS * 0.55));
    const width = 0.18 + fade * 0.22;
    const [x, z] = onArm(arm, r, gaussian(random) * width, gaussian(random) * width);
    const color = mixRgb(PALETTE.blue, PALETTE.violet, clamp01(fade * 1.3));
    push(x, gaussian(random) * (0.05 + fade * 0.08), z, color, (0.13 - fade * 0.07) * (0.7 + random() * 0.6), 0.32 + random() * 0.35);
  }

  // Thick, faint envelope so the disc reads as a volume, not a plane.
  for (let i = 0; i < budget.volume; i++) {
    const r = Math.min(RADIUS * 1.1, -Math.log(Math.max(random(), 1e-4)) * 1.0 + 0.1);
    const a = random() * Math.PI * 2;
    const y = gaussian(random) * 0.2 * (1.15 - r / (RADIUS * 1.2));
    const color = mixRgb(PALETTE.blue, PALETTE.violet, random());
    push(Math.cos(a) * r, y, Math.sin(a) * r, color, 0.05 + random() * 0.05, 0.4 + random() * 0.4);
  }

  // Fine inter-arm dust, weakly following the spiral pattern.
  while (index < count) {
    const r = Math.min(RADIUS * 1.15, -Math.log(Math.max(random(), 1e-4)) * 0.9 + 0.12);
    const a = random() * Math.PI * 2;
    let near = 0;
    for (let k = 0; k < 2; k++) {
      near = Math.max(near, 1 - Math.abs(Math.sin((a - armAngle(ARMS[k], r)) * 0.5)));
    }
    if (random() > 0.3 + 0.7 * near * near) continue;
    const color = mixRgb(mixRgb(PALETTE.ice, PALETTE.teal, clamp01(r / 1.2)), PALETTE.deepBlue, clamp01((r - 1.4) / 1.6));
    push(Math.cos(a) * r, gaussian(random) * (0.035 + 0.03 * r / RADIUS), Math.sin(a) * r, color, 0.06 + random() * 0.08, 0.26 + random() * 0.3);
  }

  return data;
}
