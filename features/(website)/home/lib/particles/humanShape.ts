import { Euler, Quaternion, Vector3 } from "three";
import { HERO_SCENE_KEYFRAMES } from "../heroSceneState";
import { ShapeWriter, allocate, clamp01, hex, mixRgb, smoothstep, type Random, type Rgb, type ShapePoints } from "./shapeUtils";

/*
 * Realistic male particle-human sampled from a real head-and-shoulders scan
 * (Lee Perry-Smith, Infinite Realities, CC BY 3.0 — see
 * assets/models/lee-perry-smith/README.md). The mesh is baked by
 * scripts/bake-human-bust.mjs with per-vertex ambient occlusion; lighting,
 * cast shadows and the open eyes are resolved here, deterministically.
 */

export const HUMAN_MESH_URL = "/models/human-bust.bin";
const MAGIC = 0x54534248;

/** Source-scan units -> robot-local scene units (eyes at y ≈ 0.525, face toward +z). */
const MESH_SCALE = 0.8;
const MESH_OFFSET = [0.115, -1.009, -0.3] as const;

/** Open-eye sculpt in scene units (the scan was captured with closed lids). */
const EYE = {
  x: 0.48,
  y: 0.525,
  z: 1.293,
  rx: 0.226,
  ryUp: 0.085,
  ryLow: 0.066,
  /** Outer corners sit slightly higher than the inner corners. */
  tilt: 0.012,
  iris: 0.083,
  pupil: 0.03,
} as const;

export interface HumanEye {
  x: number;
  y: number;
  z: number;
  rx: number;
  ryUp: number;
  ryLow: number;
  iris: number;
  /** Y of the line the lids close onto. */
  lidY: number;
}

/** Eye placement in scene units (shared with the eye overlay, gaze and laser). */
export function getHumanEyes(): { left: HumanEye; right: HumanEye } {
  const make = (side: number): HumanEye => ({
    x: side * EYE.x,
    y: EYE.y,
    z: EYE.z,
    rx: EYE.rx,
    ryUp: EYE.ryUp,
    ryLow: EYE.ryLow,
    iris: EYE.iris,
    lidY: EYE.y - EYE.ryLow * 0.25,
  });
  return { left: make(-1), right: make(1) };
}

/* ------------------------------------------------------------------- mesh */

export interface HumanMesh {
  vertexCount: number;
  /** Scene-unit positions. */
  positions: Float32Array;
  normals: Float32Array;
  ao: Float32Array;
  indices: Uint16Array;
}

export function parseHumanMesh(buffer: ArrayBuffer): HumanMesh {
  const header = new Uint32Array(buffer, 0, 4);
  if (header[0] !== MAGIC) throw new Error("Invalid human mesh");
  const v = header[1];
  const indexCount = header[2];
  let o = 16;
  const source = new Float32Array(buffer, o, v * 3);
  o += v * 12;
  const n8 = new Int8Array(buffer, o, v * 3);
  o += v * 3;
  const ao8 = new Uint8Array(buffer, o, v);
  o += v;
  const indices = new Uint16Array(buffer.slice(o, o + indexCount * 2));

  const positions = new Float32Array(v * 3);
  const normals = new Float32Array(v * 3);
  const ao = new Float32Array(v);
  for (let i = 0; i < v; i++) {
    for (let k = 0; k < 3; k++) {
      positions[i * 3 + k] = (source[i * 3 + k] + MESH_OFFSET[k]) * MESH_SCALE;
    }
    const nx = n8[i * 3] / 127;
    const ny = n8[i * 3 + 1] / 127;
    const nz = n8[i * 3 + 2] / 127;
    const l = Math.hypot(nx, ny, nz) || 1;
    normals[i * 3] = nx / l;
    normals[i * 3 + 1] = ny / l;
    normals[i * 3 + 2] = nz / l;
    ao[i] = ao8[i] / 255;
  }
  return { vertexCount: v, positions, normals, ao, indices };
}

let meshPromise: Promise<HumanMesh> | null = null;

export function loadHumanMesh(): Promise<HumanMesh> {
  meshPromise ??= fetch(HUMAN_MESH_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Human mesh ${r.status}`);
      return r.arrayBuffer();
    })
    .then(parseHumanMesh)
    .catch((error) => {
      meshPromise = null;
      throw error;
    });
  return meshPromise;
}

/* ------------------------------------------------------------- depth maps */

type Vec3 = [number, number, number];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Orthographic height field along d: the surface nearest a viewer at +d. */
class DepthMap {
  private readonly u: Vec3;
  private readonly v: Vec3;
  private readonly cu: number;
  private readonly cv: number;
  readonly depth: Float32Array;

  constructor(
    mesh: HumanMesh,
    private readonly d: Vec3,
    private readonly res: number,
    private readonly extent: number,
    center: Vec3 = [0, 0, 0],
  ) {
    this.u = normalize(cross(Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], d));
    this.v = cross(d, this.u);
    this.cu = dot(center, this.u);
    this.cv = dot(center, this.v);
    this.depth = new Float32Array(res * res).fill(-Infinity);

    const { positions: P, indices: I, vertexCount } = mesh;
    const sx = new Float32Array(vertexCount);
    const sy = new Float32Array(vertexCount);
    const sz = new Float32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      const p: Vec3 = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
      sx[i] = this.toPixel(dot(p, this.u) - this.cu);
      sy[i] = this.toPixel(dot(p, this.v) - this.cv);
      sz[i] = dot(p, d);
    }
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t];
      const b = I[t + 1];
      const c = I[t + 2];
      const area = (sx[b] - sx[a]) * (sy[c] - sy[a]) - (sx[c] - sx[a]) * (sy[b] - sy[a]);
      if (Math.abs(area) < 1e-9) continue;
      const minX = Math.max(0, Math.floor(Math.min(sx[a], sx[b], sx[c])));
      const maxX = Math.min(res - 1, Math.ceil(Math.max(sx[a], sx[b], sx[c])));
      const minY = Math.max(0, Math.floor(Math.min(sy[a], sy[b], sy[c])));
      const maxY = Math.min(res - 1, Math.ceil(Math.max(sy[a], sy[b], sy[c])));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5;
          const py = y + 0.5;
          const w0 = ((sx[b] - px) * (sy[c] - py) - (sx[c] - px) * (sy[b] - py)) / area;
          const w1 = ((sx[c] - px) * (sy[a] - py) - (sx[a] - px) * (sy[c] - py)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
          const z = w0 * sz[a] + w1 * sz[b] + w2 * sz[c];
          const k = y * res + x;
          if (z > this.depth[k]) this.depth[k] = z;
        }
      }
    }
  }

  private toPixel(v: number) {
    return ((v / this.extent) * 0.5 + 0.5) * this.res;
  }

  /** Soft visibility (0–1) of a point toward +d, with 3×3 percentage-closer filtering. */
  visibility(x: number, y: number, z: number, bias: number) {
    const p: Vec3 = [x, y, z];
    const px = Math.floor(this.toPixel(dot(p, this.u) - this.cu));
    const py = Math.floor(this.toPixel(dot(p, this.v) - this.cv));
    const h = dot(p, this.d);
    let lit = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const xx = Math.min(this.res - 1, Math.max(0, px + ox * 2));
        const yy = Math.min(this.res - 1, Math.max(0, py + oy * 2));
        if (h >= this.depth[yy * this.res + xx] - bias) lit++;
      }
    }
    return lit / 9;
  }

  /** Height along d at the projection of (x, y) for d = +z. */
  heightAt(x: number, y: number) {
    const px = Math.min(this.res - 1, Math.max(0, Math.floor(this.toPixel(x - this.cu))));
    const py = Math.min(this.res - 1, Math.max(0, Math.floor(this.toPixel(y - this.cv))));
    return this.depth[py * this.res + px];
  }
}

/* ---------------------------------------------------------------- shading */

/** Lavender-white particle palette from the reference. */
const TONE = {
  shadow: hex("#241848"),
  violet: hex("#7c5fcf"),
  lavender: hex("#cdb6fa"),
  ice: hex("#f6efff"),
  blueViolet: hex("#6170e8"),
};

const robotFrame = HERO_SCENE_KEYFRAMES.robot;
/** Object -> view rotation at the character keyframe. */
const VIEW = new Quaternion().setFromEuler(new Euler(robotFrame.rotX, robotFrame.rotY, robotFrame.rotZ, "ZXY"));
const TO_OBJECT = VIEW.clone().invert();

/** Screen-space light directions (toward the light), resolved into object space. */
function objectDir(x: number, y: number, z: number): Vec3 {
  const v = new Vector3(x, y, z).normalize().applyQuaternion(TO_OBJECT);
  return [v.x, v.y, v.z];
}
/** Soft lavender key from the left (the text side), cool fill, rim from behind right. */
const KEY = objectDir(-0.88, 0.32, 0.36);
const FILL = objectDir(0.7, -0.25, 0.65);
const RIM = objectDir(0.7, 0.35, -0.7);
const VIEW_Z: Vec3 = (() => {
  const v = new Vector3(0, 0, 1).applyQuaternion(TO_OBJECT);
  return [v.x, v.y, v.z];
})();

interface SurfaceSample {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  ao: number;
}

interface Shade {
  color: Rgb;
  lum: number;
}

/** Open-eye test in the front projection. Returns 0 (centre) – 1 (lid margin), or -1 outside. */
function eyeOpening(x: number, y: number): { side: number; t: number; upper: boolean } | null {
  for (const side of [-1, 1]) {
    const dx = (x - side * EYE.x) / EYE.rx;
    if (Math.abs(dx) >= 1) continue;
    const dy = y - (EYE.y + EYE.tilt * dx * side);
    const upper = dy > 0;
    const half = (upper ? EYE.ryUp : EYE.ryLow) * Math.pow(1 - dx * dx, 0.72);
    const t = Math.max(Math.abs(dx) ** 2, Math.abs(dy) / half);
    if (Math.abs(dy) < half) return { side, t, upper };
  }
  return null;
}

/**
 * Area-weighted sampler over the scan surface with lighting from a key
 * shadow map, baked ambient occlusion, cool fill and a rim light.
 */
class HumanSurface {
  private readonly cdf: Float64Array;
  private readonly shadow: DepthMap;
  readonly front: DepthMap;

  constructor(private readonly mesh: HumanMesh) {
    const { positions: P, normals: N, indices: I } = mesh;
    const tris = I.length / 3;
    this.cdf = new Float64Array(tris);
    let acc = 0;
    for (let t = 0; t < tris; t++) {
      const a = I[t * 3] * 3;
      const b = I[t * 3 + 1] * 3;
      const c = I[t * 3 + 2] * 3;
      const e1: Vec3 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]];
      const e2: Vec3 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
      const cr = cross(e1, e2);
      const area = Math.hypot(cr[0], cr[1], cr[2]) * 0.5;
      const cx = (P[a] + P[b] + P[c]) / 3;
      const cy = (P[a + 1] + P[b + 1] + P[c + 1]) / 3;
      const n = normalize([N[a] + N[b] + N[c], N[a + 1] + N[b + 1] + N[c + 1], N[a + 2] + N[b + 2] + N[c + 2]]);
      acc += area * regionWeight(cx, cy, n);
      this.cdf[t] = acc;
    }
    this.shadow = new DepthMap(mesh, KEY, 640, 4.4);
    this.front = new DepthMap(mesh, [0, 0, 1], 768, 0.8, [0, 0.45, 0]);
  }

  sample(random: Random, out: SurfaceSample) {
    const { positions: P, normals: N, ao, indices: I } = this.mesh;
    const target = random() * this.cdf[this.cdf.length - 1];
    let lo = 0;
    let hi = this.cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.cdf[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const ia = I[lo * 3];
    const ib = I[lo * 3 + 1];
    const ic = I[lo * 3 + 2];
    let u = random();
    let v = random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;
    out.x = P[ia * 3] * w + P[ib * 3] * u + P[ic * 3] * v;
    out.y = P[ia * 3 + 1] * w + P[ib * 3 + 1] * u + P[ic * 3 + 1] * v;
    out.z = P[ia * 3 + 2] * w + P[ib * 3 + 2] * u + P[ic * 3 + 2] * v;
    const nx = N[ia * 3] * w + N[ib * 3] * u + N[ic * 3] * v;
    const ny = N[ia * 3 + 1] * w + N[ib * 3 + 1] * u + N[ic * 3 + 1] * v;
    const nz = N[ia * 3 + 2] * w + N[ib * 3 + 2] * u + N[ic * 3 + 2] * v;
    const l = Math.hypot(nx, ny, nz) || 1;
    out.nx = nx / l;
    out.ny = ny / l;
    out.nz = nz / l;
    out.ao = ao[ia] * w + ao[ib] * u + ao[ic] * v;
  }

  shade(s: SurfaceSample): Shade {
    const n: Vec3 = [s.nx, s.ny, s.nz];
    const vis = this.shadow.visibility(s.x, s.y, s.z, 0.035);
    // Slightly wrapped key for a soft, skin-like terminator.
    const key = clamp01((dot(n, KEY) + 0.18) / 1.18) * (0.1 + 0.9 * vis);
    const fill = Math.max(0, dot(n, FILL));
    const rim = Math.pow(Math.max(0, dot(n, RIM)), 2.4);
    const facing = dot(n, VIEW_Z);
    const fresnel = Math.pow(1 - Math.max(0, facing), 3);
    const occlusion = Math.pow(s.ao, 1.5);
    // Shoulders fall into darkness; the crown is kept below the face.
    const fade = (0.08 + 0.92 * smoothstep(-3.6, -1.55, s.y)) * (1 - 0.32 * smoothstep(1.3, 2.3, s.y));
    const lum =
      (occlusion * (0.03 + 1.05 * Math.pow(key, 1.6) + 0.24 * fill) + (0.5 * rim + 0.12 * fresnel) * Math.sqrt(s.ao)) * fade;

    let color = mixRgb(TONE.shadow, TONE.violet, smoothstep(0, 0.4, lum));
    color = mixRgb(color, TONE.lavender, smoothstep(0.28, 0.75, lum));
    color = mixRgb(color, TONE.ice, smoothstep(0.72, 1.1, lum));
    color = mixRgb(color, TONE.blueViolet, clamp01(fill * 0.4 * (1 - key)));
    color = mixRgb(color, TONE.ice, clamp01(rim * 0.5));
    return { color, lum };
  }
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Sampling emphasis: dense face, sparser back of head and fading shoulders. */
function regionWeight(x: number, y: number, n: Vec3) {
  const face =
    smoothstep(-0.1, 0.45, n[2]) *
    (1 - smoothstep(0.95, 1.3, Math.abs(x))) *
    smoothstep(-1.55, -1.05, y) *
    (1 - smoothstep(1.6, 2.0, y));
  const facing = dot(n, VIEW_Z);
  let w = 1 + 1.2 * face;
  w *= mix(0.3, 1, smoothstep(-0.6, 0.15, facing));
  w *= 0.15 + 0.85 * smoothstep(-3.8, -1.6, y);
  return w;
}

/** True when a surface sample falls inside an open eye (filled by the eye sampler). */
function inEyeOpening(s: SurfaceSample) {
  return s.z > EYE.z - 0.25 && s.nz > 0 && eyeOpening(s.x, s.y) !== null;
}

/**
 * Draws `count` surface particles; density follows light so shadowed planes
 * stay sparse and dark like the reference.
 */
function emitSurface(
  surface: HumanSurface,
  count: number,
  random: Random,
  gain: number,
  emit: (s: SurfaceSample, shade: Shade, size: number) => void,
) {
  const s: SurfaceSample = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, ao: 1 };
  for (let n = 0, guard = 0; n < count && guard < count * 40; guard++) {
    surface.sample(random, s);
    if (inEyeOpening(s)) continue;
    const shade = surface.shade(s);
    if (random() > 0.1 + 0.9 * Math.min(1, shade.lum * 1.2)) continue;
    // Upper lid margin catches the key light, defining the open eye.
    const margin = s.nz > 0 && s.z > EYE.z - 0.25 ? eyeMargin(s.x, s.y) : 0;
    const lum = shade.lum * (1 + margin * 0.7);
    const size = (0.3 + random() * 0.26 + 0.2 * Math.min(1, lum)) * gain;
    emit(s, { color: shade.color, lum }, size);
    n++;
  }
}

/** 1 on the upper lid margin, fading over a thin band just outside the opening. */
function eyeMargin(x: number, y: number) {
  for (const side of [-1, 1]) {
    const dx = (x - side * EYE.x) / EYE.rx;
    if (Math.abs(dx) >= 1.05) continue;
    const dy = y - (EYE.y + EYE.tilt * dx * side);
    if (dy <= 0) continue;
    const edge = EYE.ryUp * Math.pow(Math.max(0, 1 - dx * dx), 0.72);
    const k = (dy - edge) / 0.03;
    if (k >= 0 && k < 1) return (1 - k) * (1 - Math.abs(dx) * 0.6);
  }
  return 0;
}

/** Eyeballs inside the sculpted openings: sclera, striated iris, pupil and catchlight. */
function emitEyes(surface: HumanSurface, count: number, random: Random, w: ShapeWriter) {
  for (let n = 0, guard = 0; n < count && guard < count * 30; guard++) {
    const side = n % 2 === 0 ? -1 : 1;
    const x = side * EYE.x + (random() * 2 - 1) * EYE.rx;
    const y = EYE.y + (random() * 2 - 1) * EYE.ryUp * 1.2;
    const hit = eyeOpening(x, y);
    if (!hit || hit.side !== side) continue;
    const surfaceZ = surface.front.heightAt(x, y);
    if (!Number.isFinite(surfaceZ)) continue;

    const ix = side * EYE.x;
    const iy = EYE.y + 0.006;
    const r = Math.hypot(x - ix, y - iy);
    const tag = side < 0 ? 1 : 2;
    // Upper-lid shadow over the top of the eye.
    const lidShade = 1 - 0.55 * smoothstep(0.35, 1, hit.upper ? hit.t : 0);
    let z = surfaceZ - 0.022 - 0.02 * hit.t * hit.t;
    let color: Rgb;
    let brightness: number;
    let size = 0.36 + random() * 0.22;
    let iris = 0;

    const catchX = ix - EYE.iris * 0.32;
    const catchY = iy + EYE.iris * 0.36;
    if (Math.hypot(x - catchX, y - catchY) < 0.013) {
      color = TONE.ice;
      brightness = 0.95;
      size = 0.5 + random() * 0.2;
      iris = 0.25;
      z += 0.012;
    } else if (r < EYE.pupil) {
      if (random() > 0.3) continue;
      color = TONE.shadow;
      brightness = 0.06;
      iris = 0.25;
      z += 0.006;
    } else if (r < EYE.iris) {
      const k = (r - EYE.pupil) / (EYE.iris - EYE.pupil);
      const a = Math.atan2(y - iy, x - ix);
      const fibres = 0.55 + 0.45 * Math.abs(Math.sin(a * 23 + Math.sin(a * 7) * 1.4));
      const collarette = Math.exp(-(((k - 0.32) / 0.1) ** 2)) * 0.35;
      const limbal = 1 - 0.55 * smoothstep(0.78, 1, k);
      // Lit from the key side (upper left on screen).
      const keySide = 0.75 + 0.25 * clamp01(0.5 - (x - ix) / EYE.iris * 0.5 + (y - iy) / EYE.iris * 0.3);
      color = mixRgb(TONE.violet, TONE.lavender, 0.35 + 0.4 * fibres);
      color = mixRgb(color, TONE.blueViolet, 0.25 * (1 - k));
      brightness = (0.26 + 0.2 * fibres + collarette) * limbal * keySide * lidShade;
      iris = 0.25;
      z += 0.008 * (1 - k * k);
    } else {
      // Sclera: soft, never white; darker toward the corners.
      const corner = smoothstep(0.55, 1, Math.abs(x - ix) / EYE.rx);
      color = mixRgb(TONE.violet, TONE.lavender, 0.55);
      brightness = (0.2 - 0.09 * corner) * lidShade;
    }
    w.push(x, y, z, color, brightness, size, tag + iris, 0);
    n++;
  }
}

/* ---------------------------------------------------------------- outputs */

export function createHumanShape(count: number, random: Random, mesh: HumanMesh): ShapePoints {
  const surface = new HumanSurface(mesh);
  const w = new ShapeWriter(count);
  const budget = allocate(count, { surface: 0.88, eyes: 0.045, dust: 0.075 });

  emitSurface(surface, budget.surface, random, 1, (s, shade, size) =>
    w.push(s.x, s.y, s.z, shade.color, Math.min(1.25, shade.lum) * 0.9, size),
  );
  emitEyes(surface, budget.eyes, random, w);

  // Faint volumetric dust around the bust (also gives the morph soft outer mass).
  for (let i = 0; i < budget.dust; i++) {
    const a = random() * Math.PI * 2;
    const u = random() * 2 - 1;
    const s = Math.sqrt(1 - u * u);
    const r = 2.5 + Math.pow(random(), 1.4) * 1.3;
    const color = mixRgb(TONE.violet, TONE.blueViolet, random());
    w.push(Math.cos(a) * s * r, 0.3 + u * r * 0.95, Math.sin(a) * s * r * 0.7 - 0.6, color, 0.05 + random() * 0.08, 0.3 + random() * 0.25);
  }

  while (w.remaining > 0) {
    const s: SurfaceSample = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, ao: 1 };
    surface.sample(random, s);
    const shade = surface.shade(s);
    w.push(s.x, s.y, s.z, shade.color, shade.lum * 0.9, 0.35);
  }
  return w.data;
}

export interface HumanDetailData {
  count: number;
  positions: Float32Array;
  colors: Float32Array;
  /** size, seed */
  meta: Float32Array;
}

/**
 * The dense, non-morphing "skin" of the particle-human: many fine points on
 * the same surface and lighting as the morph shape, revealed only in the
 * character state.
 */
export function createHumanDetail(count: number, random: Random, mesh: HumanMesh): HumanDetailData {
  const surface = new HumanSurface(mesh);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const meta = new Float32Array(count * 2);
  let i = 0;
  const write = (s: SurfaceSample, shade: Shade, size: number) => {
    positions[i * 3] = s.x;
    positions[i * 3 + 1] = s.y;
    positions[i * 3 + 2] = s.z;
    const b = Math.min(1.2, shade.lum) * 0.62;
    colors[i * 3] = shade.color[0] * b;
    colors[i * 3 + 1] = shade.color[1] * b;
    colors[i * 3 + 2] = shade.color[2] * b;
    meta[i * 2] = size;
    meta[i * 2 + 1] = random();
    i++;
  };
  emitSurface(surface, count, random, 0.85, write);
  while (i < count) {
    const s: SurfaceSample = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, ao: 1 };
    surface.sample(random, s);
    write(s, surface.shade(s), 0.28);
  }
  return { count, positions, colors, meta };
}
