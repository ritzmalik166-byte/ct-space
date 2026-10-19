/**
 * Builds the Contenaissance explorer spacecraft and writes it as binary glTF.
 *
 *   node scripts/space-assets/build-ship.mjs
 *
 * Axes match the hero particle ship: nose +X, up +Y, wingspan ±Z, length ≈ 4.9.
 * Faceted parts are flat-shaded on purpose (hard panel edges); round parts
 * (nozzles, trims, the infinity inlay) keep smooth normals. One mesh per material.
 * Empty nodes `nozzle_N` carry each exhaust position and radius in `extras`.
 *
 * The raw GLB goes to the OS temp dir; gltfpack then writes the meshopt-compressed
 * model into public/. `-noq` keeps float positions: the reveal shader reads
 * model-space X, which vertex quantization would rescale.
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const RAW = path.join(os.tmpdir(), "contenaissance-explorer.glb");
const OUT = path.resolve("public/assets/space/models/contenaissance-explorer.meshopt.glb");

const NOSE = 2.6;
const TAIL = -2.15;
const LENGTH = NOSE - TAIL;

// ---------------------------------------------------------------------------
// Fuselage profile
// ---------------------------------------------------------------------------

function profile(x) {
  if (x >= 1.2) {
    const t = Math.min(1, (NOSE - x) / (NOSE - 1.2));
    return { w: 0.34 * Math.pow(t, 0.62), h: 0.2 * Math.pow(t, 0.75), y: -0.025 * t };
  }
  if (x >= -1.2) {
    const t = (1.2 - x) / 2.4;
    return { w: 0.34 + 0.08 * t, h: 0.2 + 0.06 * t, y: -0.025 };
  }
  const t = (-1.2 - x) / (-1.2 - TAIL);
  return { w: 0.42 + 0.08 * Math.sin(t * Math.PI * 0.5), h: 0.26 + 0.02 * t, y: -0.025 };
}

const POD = { y: -0.07, z: 0.56, r: 0.15 };

/** Faceted cross-section, clockwise seen from the nose. */
const SECTION = [
  [0, 1],
  [0.45, 0.84],
  [0.9, 0.3],
  [1, 0],
  [0.84, -0.42],
  [0.42, -0.76],
  [0, -0.84],
  [-0.42, -0.76],
  [-0.84, -0.42],
  [-1, 0],
  [-0.9, 0.3],
  [-0.45, 0.84],
];

function sectionPoint(x, k, inflate = 0) {
  const p = profile(x);
  const [sz, sy] = SECTION[k % SECTION.length];
  return new THREE.Vector3(x, p.y + sy * (p.h + inflate), sz * (p.w + inflate));
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function fromArrays(positions, uvs) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return g;
}

/** Flip any triangle whose normal faces toward the reference returned by `inside(centroid)`. */
function orient(geometry, inside) {
  const pos = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const centroid = new THREE.Vector3();
  const ref = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.subVectors(b, a).cross(c.clone().sub(a));
    centroid.copy(a).add(b).add(c).divideScalar(3);
    inside(centroid, ref);
    if (n.dot(centroid.clone().sub(ref)) < 0) {
      for (const attr of [pos, uv]) {
        const size = attr.itemSize;
        for (let k = 0; k < size; k++) {
          const t = attr.array[(i + 1) * size + k];
          attr.array[(i + 1) * size + k] = attr.array[(i + 2) * size + k];
          attr.array[(i + 2) * size + k] = t;
        }
      }
    }
  }
  return geometry;
}

function flat(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.computeVertexNormals();
  return g;
}

function smooth(geometry) {
  if (!geometry.getAttribute("uv")) {
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute("position").count * 2), 2));
  }
  geometry.computeVertexNormals();
  return geometry.index ? geometry.toNonIndexed() : geometry;
}

function quad(positions, uvs, a, b, c, d, ua, ub, uc, ud) {
  positions.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...d.toArray());
  uvs.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud);
}

function tri(positions, uvs, a, b, c, ua, ub, uc) {
  positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
  uvs.push(...ua, ...ub, ...uc);
}

/** Closed solid from a top polygon and a bottom polygon with the same vertex count. */
function slab(top, bottom, uvScale = 1) {
  const positions = [];
  const uvs = [];
  const uvOf = (p) => [p.x * uvScale, p.z * uvScale];
  for (let i = 1; i < top.length - 1; i++) {
    tri(positions, uvs, top[0], top[i], top[i + 1], uvOf(top[0]), uvOf(top[i]), uvOf(top[i + 1]));
    tri(positions, uvs, bottom[0], bottom[i + 1], bottom[i], uvOf(bottom[0]), uvOf(bottom[i + 1]), uvOf(bottom[i]));
  }
  for (let i = 0; i < top.length; i++) {
    const j = (i + 1) % top.length;
    quad(positions, uvs, top[i], bottom[i], bottom[j], top[j], uvOf(top[i]), uvOf(bottom[i]), uvOf(bottom[j]), uvOf(top[j]));
  }
  const g = fromArrays(positions, uvs);
  const center = new THREE.Vector3();
  for (const p of [...top, ...bottom]) center.add(p);
  center.divideScalar(top.length * 2);
  return flat(orient(g, (_, out) => out.copy(center)));
}

/** Tapered plate: planform in (x, z), y offset per vertex, thickness per vertex. */
function plate(points, { y = () => 0, thick = () => 0.03, under = 0.6, uvScale = 1 } = {}) {
  const top = points.map(([x, z]) => new THREE.Vector3(x, y(x, z) + thick(x, z), z));
  const bottom = points.map(([x, z]) => new THREE.Vector3(x, y(x, z) - thick(x, z) * under, z));
  return slab(top, bottom, uvScale);
}

function mirrorZ(geometry) {
  const g = geometry.clone();
  g.scale(1, 1, -1);
  const pos = g.getAttribute("position");
  const uv = g.getAttribute("uv");
  const nrm = g.getAttribute("normal");
  for (const attr of [pos, uv, nrm].filter(Boolean)) {
    const size = attr.itemSize;
    for (let i = 0; i < attr.count; i += 3) {
      for (let k = 0; k < size; k++) {
        const t = attr.array[(i + 1) * size + k];
        attr.array[(i + 1) * size + k] = attr.array[(i + 2) * size + k];
        attr.array[(i + 2) * size + k] = t;
      }
    }
  }
  g.computeVertexNormals();
  return g;
}

function sweepSquare(points, size) {
  const positions = [];
  const uvs = [];
  const frames = new THREE.CatmullRomCurve3(points).computeFrenetFrames(points.length - 1, false);
  const ring = (i) => {
    const p = points[i];
    const n = frames.normals[i];
    const b = frames.binormals[i];
    return [
      p.clone().addScaledVector(n, size).addScaledVector(b, size),
      p.clone().addScaledVector(n, -size).addScaledVector(b, size),
      p.clone().addScaledVector(n, -size).addScaledVector(b, -size),
      p.clone().addScaledVector(n, size).addScaledVector(b, -size),
    ];
  };
  for (let i = 0; i < points.length - 1; i++) {
    const r0 = ring(i);
    const r1 = ring(i + 1);
    const u0 = i / (points.length - 1);
    const u1 = (i + 1) / (points.length - 1);
    for (let k = 0; k < 4; k++) {
      const j = (k + 1) % 4;
      quad(positions, uvs, r0[k], r1[k], r1[j], r0[j], [u0, k / 4], [u1, k / 4], [u1, (k + 1) / 4], [u0, (k + 1) / 4]);
    }
  }
  const g = fromArrays(positions, uvs);
  return flat(
    orient(g, (c, out) => {
      let best = points[0];
      let d = Infinity;
      for (const p of points) {
        const dist = p.distanceToSquared(c);
        if (dist < d) {
          d = dist;
          best = p;
        }
      }
      out.copy(best);
    }),
  );
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

function fuselage(inflate = 0, from = TAIL, to = NOSE - 0.002, slices = 64) {
  const positions = [];
  const uvs = [];
  const n = SECTION.length;
  const perimeter = (k) => k / n;
  const xs = [];
  for (let i = 0; i <= slices; i++) {
    const t = i / slices;
    xs.push(from + (to - from) * Math.pow(t, 0.95));
  }
  for (let i = 0; i < slices; i++) {
    const x0 = xs[i];
    const x1 = xs[i + 1];
    const u0 = ((x0 - TAIL) / LENGTH) * 3;
    const u1 = ((x1 - TAIL) / LENGTH) * 3;
    for (let k = 0; k < n; k++) {
      quad(
        positions,
        uvs,
        sectionPoint(x0, k, inflate),
        sectionPoint(x1, k, inflate),
        sectionPoint(x1, k + 1, inflate),
        sectionPoint(x0, k + 1, inflate),
        [u0, perimeter(k)],
        [u1, perimeter(k)],
        [u1, perimeter(k + 1)],
        [u0, perimeter(k + 1)],
      );
    }
  }
  if (to >= NOSE - 0.01) {
    const tip = new THREE.Vector3(NOSE, profile(NOSE).y, 0);
    for (let k = 0; k < n; k++) tri(positions, uvs, sectionPoint(to, k, inflate), tip, sectionPoint(to, k + 1, inflate), [3, perimeter(k)], [3, 0.5], [3, perimeter(k + 1)]);
  }
  if (from <= TAIL + 0.01) {
    const center = new THREE.Vector3(TAIL, profile(TAIL).y, 0);
    for (let k = 0; k < n; k++) tri(positions, uvs, sectionPoint(from, k + 1, inflate), center, sectionPoint(from, k, inflate), [0, perimeter(k)], [0, 0.5], [0, perimeter(k + 1)]);
  }
  const g = fromArrays(positions, uvs);
  return flat(orient(g, (c, out) => out.set(c.x, profile(c.x).y, 0)));
}

function canopy() {
  const positions = [];
  const uvs = [];
  const steps = 14;
  const shape = [
    [-1, 0],
    [-0.75, 0.6],
    [-0.25, 1],
    [0.25, 1],
    [0.75, 0.6],
    [1, 0],
  ];
  const at = (x, k) => {
    const t = (x - 0.62) / (1.78 - 0.62);
    const s = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.6);
    const p = profile(x);
    const top = p.y + p.h * 0.93;
    const [sz, sy] = shape[k];
    return new THREE.Vector3(x, top + sy * 0.11 * s, sz * 0.14 * s + 0.0001 * sz);
  };
  for (let i = 0; i < steps; i++) {
    const x0 = 0.62 + ((1.78 - 0.62) * i) / steps;
    const x1 = 0.62 + ((1.78 - 0.62) * (i + 1)) / steps;
    for (let k = 0; k < shape.length - 1; k++) {
      quad(positions, uvs, at(x0, k), at(x1, k), at(x1, k + 1), at(x0, k + 1), [i / steps, k / 5], [(i + 1) / steps, k / 5], [(i + 1) / steps, (k + 1) / 5], [i / steps, (k + 1) / 5]);
    }
  }
  const g = fromArrays(positions, uvs);
  return flat(orient(g, (c, out) => out.set(c.x, profile(c.x).y, 0)));
}

function canopyFrame() {
  const parts = [];
  for (const x of [0.95, 1.3]) {
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI * (k / 10);
      const t = (x - 0.62) / (1.78 - 0.62);
      const s = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.6);
      const p = profile(x);
      pts.push(new THREE.Vector3(x, p.y + p.h * 0.93 + Math.sin(a) * 0.112 * s, Math.cos(a) * 0.142 * s));
    }
    parts.push(sweepSquare(pts, 0.008));
  }
  return mergeGeometries(parts);
}

function spine() {
  const top = [];
  const bottom = [];
  const xs = [0.55, 0.1, -0.6, -1.3, -1.95];
  const heights = [0.0, 0.05, 0.065, 0.06, 0.03];
  const widths = [0.02, 0.05, 0.06, 0.065, 0.06];
  xs.forEach((x, i) => {
    const p = profile(x);
    const base = p.y + p.h * 0.97;
    top.push(new THREE.Vector3(x, base + heights[i], widths[i] * 0.45));
    bottom.push(new THREE.Vector3(x, base - 0.02, widths[i]));
  });
  const positions = [];
  const uvs = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (const side of [1, -1]) {
      const a = top[i].clone().setZ(top[i].z * side);
      const b = top[i + 1].clone().setZ(top[i + 1].z * side);
      const c = bottom[i + 1].clone().setZ(bottom[i + 1].z * side);
      const d = bottom[i].clone().setZ(bottom[i].z * side);
      quad(positions, uvs, a, b, c, d, [a.x, 0], [b.x, 0], [c.x, 1], [d.x, 1]);
    }
    const a = top[i];
    const b = top[i + 1];
    const c = b.clone().setZ(-b.z);
    const d = a.clone().setZ(-a.z);
    quad(positions, uvs, a, b, c, d, [a.x, 0], [b.x, 0], [b.x, 1], [a.x, 1]);
  }
  const g = fromArrays(positions, uvs);
  return flat(orient(g, (c, out) => out.set(c.x, profile(c.x).y, 0)));
}

const wingY = (x, z) => -0.04 - (Math.abs(z) - 0.3) * 0.07;
const wingThick = (x, z) => Math.max(0.012, 0.05 - (Math.abs(z) - 0.3) * 0.03);

function mainWing() {
  return plate(
    [
      [0.15, 0.3],
      [-1.42, 1.58],
      [-1.86, 1.62],
      [-1.98, 1.25],
      [-1.95, 0.34],
    ],
    { y: wingY, thick: wingThick, uvScale: 0.6 },
  );
}

/** Raised secondary panel on the wing top, offset inward from the edges. */
function wingPanel() {
  return plate(
    [
      [-0.35, 0.5],
      [-1.32, 1.3],
      [-1.62, 1.32],
      [-1.66, 0.48],
    ],
    { y: (x, z) => wingY(x, z) + wingThick(x, z) + 0.006, thick: () => 0.008, under: 0.9, uvScale: 0.6 },
  );
}

function wingLeadingEdge() {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = 0.15 + (-1.42 - 0.15) * t;
    const z = 0.3 + (1.58 - 0.3) * t;
    pts.push(new THREE.Vector3(x + 0.004, wingY(x, z) + wingThick(x, z) * 0.3, z));
  }
  return sweepSquare(pts, 0.014);
}

function canard() {
  return plate(
    [
      [1.45, 0.27],
      [0.82, 0.72],
      [0.62, 0.74],
      [0.62, 0.29],
    ],
    { y: () => -0.035, thick: (x, z) => Math.max(0.008, 0.024 - (Math.abs(z) - 0.27) * 0.03), uvScale: 0.6 },
  );
}

function fin() {
  const g = plate(
    [
      [-1.0, 0],
      [-1.72, 0.78],
      [-2.02, 0.8],
      [-2.08, 0],
    ],
    { y: () => 0, thick: (x, z) => Math.max(0.008, 0.028 - z * 0.02), uvScale: 0.6 },
  );
  // Plate was built in (x, z); stand it up into (x, y) and cant it outward.
  g.rotateX(-Math.PI / 2);
  g.rotateX(-0.36);
  const p = profile(-1.6);
  g.translate(0, p.y + p.h * 0.75, 0.24);
  return g;
}

function ventral() {
  const g = plate(
    [
      [-1.3, 0],
      [-1.78, -0.32],
      [-2.0, -0.32],
      [-2.05, 0],
    ],
    { y: () => 0, thick: () => 0.016, uvScale: 0.6 },
  );
  g.rotateX(-Math.PI / 2);
  g.rotateX(0.5);
  const p = profile(-1.7);
  g.translate(0, p.y - p.h * 0.6, 0.2);
  return g;
}

function pod() {
  const sides = 8;
  const positions = [];
  const uvs = [];
  const { z, y } = POD;
  const xs = [-0.25, -0.6, -1.9, -2.12];
  const rs = [0.0, POD.r * 0.86, POD.r, POD.r * 0.97];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let k = 0; k < sides; k++) {
      const a0 = (k / sides) * Math.PI * 2 + Math.PI / sides;
      const a1 = ((k + 1) / sides) * Math.PI * 2 + Math.PI / sides;
      const P = (x, r, a) => new THREE.Vector3(x, y + Math.sin(a) * r, z + Math.cos(a) * r * 0.9);
      quad(positions, uvs, P(xs[i], rs[i], a0), P(xs[i + 1], rs[i + 1], a0), P(xs[i + 1], rs[i + 1], a1), P(xs[i], rs[i], a1), [i / 3, k / sides], [(i + 1) / 3, k / sides], [(i + 1) / 3, (k + 1) / sides], [i / 3, (k + 1) / sides]);
    }
  }
  const g = fromArrays(positions, uvs);
  return flat(orient(g, (c, out) => out.set(c.x, y, z)));
}

function podPylon() {
  return plate(
    [
      [-0.65, 0.36],
      [-0.85, POD.z - POD.r * 0.6],
      [-1.85, POD.z - POD.r * 0.6],
      [-1.95, 0.36],
    ],
    { y: () => -0.05, thick: () => 0.03, uvScale: 0.6 },
  );
}

function intake() {
  return slab(
    [new THREE.Vector3(0.55, -0.01, 0.31), new THREE.Vector3(0.05, -0.01, 0.37), new THREE.Vector3(0.05, -0.12, 0.35), new THREE.Vector3(0.55, -0.1, 0.3)],
    [new THREE.Vector3(0.55, -0.015, 0.27), new THREE.Vector3(0.05, -0.015, 0.31), new THREE.Vector3(0.05, -0.115, 0.3), new THREE.Vector3(0.55, -0.095, 0.27)],
    0.6,
  );
}

function chineTrim() {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const x = 2.3 + (-2.1 - 2.3) * (i / 40);
    const p = profile(x);
    pts.push(new THREE.Vector3(x, p.y + 0.004, p.w + 0.006));
  }
  return sweepSquare(pts, 0.009);
}

function collar(x) {
  const positions = [];
  const uvs = [];
  const n = SECTION.length;
  const width = 0.035;
  for (let k = 0; k < n; k++) {
    const a = sectionPoint(x - width, k, 0.008);
    const b = sectionPoint(x + width, k, 0.008);
    const c = sectionPoint(x + width, k + 1, 0.008);
    const d = sectionPoint(x - width, k + 1, 0.008);
    quad(positions, uvs, a, b, c, d, [0, k / n], [1, k / n], [1, (k + 1) / n], [0, (k + 1) / n]);
  }
  const g = fromArrays(positions, uvs);
  return flat(orient(g, (c, out) => out.set(c.x, profile(c.x).y, 0)));
}

function infinityInlay() {
  const pts = [];
  const count = 120;
  const cx = -0.55;
  for (let i = 0; i <= count; i++) {
    const t = (i / count) * Math.PI * 2;
    const s = Math.sin(t);
    const c = Math.cos(t);
    const d = 1 + s * s;
    const x = cx + (c / d) * 0.5;
    const z = ((s * c) / d) * 0.36;
    const p = profile(x);
    // Follow the faceted top: drop slightly toward the shoulders.
    const across = Math.abs(z) / (p.w * 0.45);
    const y = p.y + p.h * (1 - 0.16 * Math.min(1, across)) + 0.012;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const tube = new THREE.TubeGeometry(curve, 240, 0.014, 8, true);
  tube.scale(1, 0.45, 1);
  tube.translate(0, (1 - 0.45) * 0.2, 0);
  return smooth(tube);
}

const NOZZLES = [
  { x: TAIL - 0.06, y: profile(TAIL).y + 0.02, z: 0, r: 0.21 },
  { x: -2.18, y: POD.y, z: POD.z, r: POD.r * 0.86 },
  { x: -2.18, y: POD.y, z: -POD.z, r: POD.r * 0.86 },
];

function nozzleBell(n) {
  const pts = [
    new THREE.Vector2(n.r * 0.72, 0.1),
    new THREE.Vector2(n.r * 0.82, 0.04),
    new THREE.Vector2(n.r * 0.92, -0.04),
    new THREE.Vector2(n.r * 1.0, -0.1),
    new THREE.Vector2(n.r * 0.94, -0.1),
    new THREE.Vector2(n.r * 0.86, -0.04),
    new THREE.Vector2(n.r * 0.68, 0.06),
  ];
  const g = new THREE.LatheGeometry(pts, 24);
  g.rotateZ(Math.PI / 2);
  g.translate(n.x, n.y, n.z);
  return smooth(g);
}

function nozzleRim(n) {
  const g = new THREE.TorusGeometry(n.r * 1.0, n.r * 0.07, 8, 32);
  g.rotateY(Math.PI / 2);
  g.translate(n.x - 0.1, n.y, n.z);
  return smooth(g);
}

function nozzleCore(n) {
  const g = new THREE.CircleGeometry(n.r * 0.7, 24);
  g.rotateY(-Math.PI / 2);
  g.translate(n.x + 0.04, n.y, n.z);
  return smooth(g);
}

function nozzleCavity(n) {
  const g = new THREE.CylinderGeometry(n.r * 0.72, n.r * 0.72, 0.1, 24, 1, true);
  g.rotateZ(Math.PI / 2);
  g.translate(n.x + 0.05, n.y, n.z);
  return smooth(g);
}

function lights() {
  const parts = [];
  for (const side of [1, -1]) {
    const g = new THREE.BoxGeometry(0.06, 0.012, 0.02);
    g.translate(-1.88, wingY(-1.88, 1.6) + 0.01, 1.6 * side);
    parts.push(smooth(g));
    const strip = new THREE.BoxGeometry(0.9, 0.008, 0.01);
    strip.translate(-1.35, POD.y + POD.r - 0.002, POD.z * side);
    parts.push(smooth(strip));
  }
  return mergeGeometries(parts);
}

// ---------------------------------------------------------------------------
// GLB writer
// ---------------------------------------------------------------------------

const MATERIALS = {
  hull: { pbrMetallicRoughness: { baseColorFactor: [0.11, 0.115, 0.13, 1], metallicFactor: 0.85, roughnessFactor: 0.36 } },
  titanium: { pbrMetallicRoughness: { baseColorFactor: [0.2, 0.21, 0.24, 1], metallicFactor: 0.9, roughnessFactor: 0.42 } },
  gold: { pbrMetallicRoughness: { baseColorFactor: [0.86, 0.66, 0.34, 1], metallicFactor: 1, roughnessFactor: 0.24 } },
  glass: { pbrMetallicRoughness: { baseColorFactor: [0.04, 0.07, 0.1, 0.72], metallicFactor: 0.3, roughnessFactor: 0.05 }, alphaMode: "BLEND" },
  dark: { pbrMetallicRoughness: { baseColorFactor: [0.02, 0.02, 0.025, 1], metallicFactor: 0.5, roughnessFactor: 0.7 } },
  engine: { pbrMetallicRoughness: { baseColorFactor: [0, 0, 0, 1], metallicFactor: 0, roughnessFactor: 1 }, emissiveFactor: [1, 0.62, 0.28] },
  lights: { pbrMetallicRoughness: { baseColorFactor: [0, 0, 0, 1], metallicFactor: 0, roughnessFactor: 1 }, emissiveFactor: [1, 0.86, 0.6] },
};

function writeGlb(meshes, empties) {
  const chunks = [];
  let byteLength = 0;
  const bufferViews = [];
  const accessors = [];
  const push = (array, target) => {
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const pad = (4 - (bytes.length % 4)) % 4;
    bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length, target });
    chunks.push(bytes, Buffer.alloc(pad));
    byteLength += bytes.length + pad;
    return bufferViews.length - 1;
  };

  const gltfMeshes = [];
  const nodes = [];
  const materialNames = Object.keys(MATERIALS);
  for (const [name, geometry] of meshes) {
    const pos = geometry.getAttribute("position").array;
    const nrm = geometry.getAttribute("normal").array;
    const uv = geometry.getAttribute("uv").array;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], pos[i + k]);
        max[k] = Math.max(max[k], pos[i + k]);
      }
    }
    const count = pos.length / 3;
    accessors.push({ bufferView: push(new Float32Array(pos), 34962), componentType: 5126, count, type: "VEC3", min, max });
    const p = accessors.length - 1;
    accessors.push({ bufferView: push(new Float32Array(nrm), 34962), componentType: 5126, count, type: "VEC3" });
    const n = accessors.length - 1;
    accessors.push({ bufferView: push(new Float32Array(uv), 34962), componentType: 5126, count, type: "VEC2" });
    const t = accessors.length - 1;
    gltfMeshes.push({ name, primitives: [{ attributes: { POSITION: p, NORMAL: n, TEXCOORD_0: t }, material: materialNames.indexOf(name) }] });
    nodes.push({ name, mesh: gltfMeshes.length - 1 });
  }
  for (const empty of empties) nodes.push(empty);

  const json = {
    asset: { version: "2.0", generator: "contenaissance build-ship.mjs" },
    scene: 0,
    scenes: [{ name: "ContenaissanceExplorer", nodes: [nodes.length] }],
    nodes: [...nodes, { name: "ContenaissanceExplorer", children: nodes.map((_, i) => i) }],
    meshes: gltfMeshes,
    materials: materialNames.map((name) => ({ name, ...MATERIALS[name] })),
    buffers: [{ byteLength }],
    bufferViews,
    accessors,
  };

  const jsonBytes = Buffer.from(JSON.stringify(json));
  const jsonPad = Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20);
  const bin = Buffer.concat(chunks);
  const total = 12 + 8 + jsonBytes.length + jsonPad.length + 8 + bin.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBytes.length + jsonPad.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, jsonBytes, jsonPad, binHeader, bin]);
}

// ---------------------------------------------------------------------------

async function main() {
  const withMirror = (g) => [g, mirrorZ(g)];
  const groups = {
    hull: [fuselage(), ...withMirror(mainWing()), ...withMirror(canard()), ...withMirror(fin()), ...withMirror(pod()), ...withMirror(podPylon())],
    titanium: [spine(), ...withMirror(wingPanel()), ...withMirror(ventral()), ...withMirror(intake()), ...NOZZLES.map(nozzleBell)],
    gold: [infinityInlay(), canopyFrame(), ...withMirror(chineTrim()), ...withMirror(wingLeadingEdge()), collar(1.22), collar(-1.25), ...NOZZLES.map(nozzleRim)],
    glass: [canopy()],
    dark: NOZZLES.map(nozzleCavity),
    engine: NOZZLES.map(nozzleCore),
    lights: [lights()],
  };

  const meshes = Object.entries(groups).map(([name, parts]) => {
    const clean = parts.map((g) => {
      const out = new THREE.BufferGeometry();
      out.setAttribute("position", g.getAttribute("position"));
      out.setAttribute("normal", g.getAttribute("normal"));
      out.setAttribute("uv", g.getAttribute("uv"));
      return out;
    });
    return [name, mergeGeometries(clean)];
  });

  const empties = NOZZLES.map((n, i) => ({ name: `nozzle_${i}`, translation: [n.x - 0.1, n.y, n.z], extras: { radius: n.r } }));
  const glb = writeGlb(meshes, empties);
  await fs.writeFile(RAW, glb);
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  execSync(`npx --yes gltfpack -i "${RAW}" -o "${OUT}" -cc -kn -ke -km -noq`, { stdio: "inherit" });
  const packed = await fs.stat(OUT);
  const triangles = meshes.reduce((sum, [, g]) => sum + g.getAttribute("position").count / 3, 0);
  console.log(
    `Wrote ${path.relative(process.cwd(), OUT)} — ${(packed.size / 1024).toFixed(0)} KB (raw ${(glb.length / 1024).toFixed(0)} KB), ${triangles} triangles`,
  );
  for (const [name, g] of meshes) console.log(`  ${name.padEnd(9)} ${g.getAttribute("position").count / 3} tris`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
