export type Rgb = readonly [number, number, number];

export interface ShapePoints {
  count: number;
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  /**
   * Two shape-specific effect tags per point, read by the vertex shader.
   * Robot: [eye id (1 left, 2 right; +0.25 for iris/pupil), circuit flow param].
   * Spaceship: [plume length, nozzle id for plume / 1 for engine glow].
   */
  tags: Float32Array;
}

export type Random = () => number;

/** Deterministic PRNG so every load produces the same art-directed shapes. */
export function createRandom(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(random: Random): number {
  const u = Math.max(random(), 1e-7);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const hex = (value: string): Rgb => {
  const n = parseInt(value.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

export const PALETTE = {
  white: hex("#f4f8ff"),
  ice: hex("#cfe7ff"),
  cyan: hex("#5fe6ff"),
  teal: hex("#2bb7e6"),
  blue: hex("#3d5cff"),
  deepBlue: hex("#18206a"),
  violet: hex("#8a5cff"),
  orchid: hex("#c08bff"),
  warm: hex("#ffe6c7"),
  gold: hex("#ffd9a3"),
  steel: hex("#8ea6c8"),
  slate: hex("#43577e"),
  magenta: hex("#ff6fd8"),
  dust: hex("#7a5a4a"),
} as const;

/** Sequential writer that fills a fixed-size point budget. */
export class ShapeWriter {
  readonly data: ShapePoints;
  private index = 0;

  constructor(count: number) {
    this.data = {
      count,
      positions: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
      sizes: new Float32Array(count),
      tags: new Float32Array(count * 2),
    };
  }

  get written() {
    return this.index;
  }

  get remaining() {
    return this.data.count - this.index;
  }

  push(x: number, y: number, z: number, color: Rgb, brightness: number, size: number, tagA = 0, tagB = 0) {
    if (this.index >= this.data.count) return;
    const i = this.index++;
    const { positions, colors, sizes } = this.data;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    colors[i * 3] = color[0] * brightness;
    colors[i * 3 + 1] = color[1] * brightness;
    colors[i * 3 + 2] = color[2] * brightness;
    sizes[i] = size;
    this.data.tags[i * 2] = tagA;
    this.data.tags[i * 2 + 1] = tagB;
  }

  /** Scales and translates every written point. */
  transform(scale: number, ox: number, oy: number, oz: number) {
    const p = this.data.positions;
    for (let i = 0; i < this.index; i++) {
      p[i * 3] = p[i * 3] * scale + ox;
      p[i * 3 + 1] = p[i * 3 + 1] * scale + oy;
      p[i * 3 + 2] = p[i * 3 + 2] * scale + oz;
    }
  }
}

/** Splits a total budget into integer counts proportional to the weights. */
export function allocate<K extends string>(total: number, weights: Record<K, number>): Record<K, number> {
  const keys = Object.keys(weights) as K[];
  const sum = keys.reduce((acc, k) => acc + weights[k], 0);
  const result = {} as Record<K, number>;
  let used = 0;
  keys.forEach((k, i) => {
    const n = i === keys.length - 1 ? total - used : Math.floor((weights[k] / sum) * total);
    result[k] = n;
    used += n;
  });
  return result;
}

/** Samples `count` points evenly (with jitter) along a 2D/3D polyline. */
export function samplePolyline(
  points: ReadonlyArray<readonly [number, number, number]>,
  count: number,
  random: Random,
  emit: (x: number, y: number, z: number) => void,
  jitter = 0.006,
) {
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay, az] = points[i];
    const [bx, by, bz] = points[i + 1];
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    lengths.push(len);
    total += len;
  }
  if (total === 0) return;
  for (let n = 0; n < count; n++) {
    let d = ((n + random()) / count) * total;
    let s = 0;
    while (s < lengths.length - 1 && d > lengths[s]) {
      d -= lengths[s];
      s++;
    }
    const t = lengths[s] > 0 ? Math.min(1, d / lengths[s]) : 0;
    const [ax, ay, az] = points[s];
    const [bx, by, bz] = points[s + 1];
    emit(
      ax + (bx - ax) * t + gaussian(random) * jitter,
      ay + (by - ay) * t + gaussian(random) * jitter,
      az + (bz - az) * t + gaussian(random) * jitter,
    );
  }
}
