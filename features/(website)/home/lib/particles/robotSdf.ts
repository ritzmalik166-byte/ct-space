/*
 * Signed distance field of a humanoid robotic head (local units, head centre
 * near the origin, +Y up, +Z facing the camera). Primitives are blended with
 * smooth unions so the sampled surface has believable anatomy: cranium,
 * face mask, square jaw, chin, cheekbones, brow ridge, eye sockets, nose,
 * lips and a neck column.
 */

const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);

function ellipsoid(
  px: number, py: number, pz: number,
  cx: number, cy: number, cz: number,
  rx: number, ry: number, rz: number,
): number {
  const x = px - cx;
  const y = py - cy;
  const z = pz - cz;
  const k0 = Math.hypot(x / rx, y / ry, z / rz);
  const k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return k1 < 1e-6 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}

function capsule(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  r: number,
): number {
  const pax = px - ax;
  const pay = py - ay;
  const paz = pz - az;
  const bax = bx - ax;
  const bay = by - ay;
  const baz = bz - az;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}

const sphere = (px: number, py: number, pz: number, cx: number, cy: number, cz: number, r: number) =>
  Math.hypot(px - cx, py - cy, pz - cz) - r;

export const NECK_BOTTOM = -1.8;

export function headSdf(x: number, y: number, z: number): number {
  const ax = Math.abs(x);

  let d = ellipsoid(x, y, z, 0, 0.32, -0.1, 0.8, 0.92, 0.9); // cranium
  d = smin(d, ellipsoid(x, y, z, 0, -0.28, 0.1, 0.64, 0.92, 0.72), 0.22); // face mask
  d = smin(d, ellipsoid(x, y, z, 0, -0.74, 0.02, 0.5, 0.4, 0.62), 0.2); // jaw
  d = smin(d, sphere(ax, y, z, 0.44, -0.84, 0.06, 0.17), 0.16); // jaw angle
  d = smin(d, ellipsoid(x, y, z, 0, -1.02, 0.42, 0.2, 0.15, 0.17), 0.12); // chin
  d = smin(d, ellipsoid(ax, y, z, 0.44, -0.16, 0.5, 0.2, 0.13, 0.2), 0.12); // cheekbones

  // Brow ridge following the forehead curvature.
  d = smin(d, capsule(ax, y, z, 0.02, 0.25, 0.8, 0.3, 0.27, 0.74, 0.055), 0.08);
  d = smin(d, capsule(ax, y, z, 0.3, 0.27, 0.74, 0.52, 0.22, 0.56, 0.045), 0.08);

  // Eye sockets.
  d = smax(d, -ellipsoid(ax, y, z, 0.3, 0.06, 0.74, 0.16, 0.095, 0.14), 0.05);

  // Nose: bridge, tip and alae.
  d = smin(d, capsule(x, y, z, 0, 0.14, 0.8, 0, -0.26, 0.97, 0.045), 0.06);
  d = smin(d, sphere(x, y, z, 0, -0.3, 0.96, 0.08), 0.05);
  d = smin(d, sphere(ax, y, z, 0.085, -0.34, 0.87, 0.06), 0.04);

  // Lips and mouth slit.
  d = smin(d, capsule(ax, y, z, 0, -0.54, 0.82, 0.16, -0.56, 0.74, 0.032), 0.04);
  d = smin(d, capsule(ax, y, z, 0, -0.66, 0.8, 0.14, -0.64, 0.73, 0.032), 0.04);
  d = smax(d, -capsule(ax, y, z, 0, -0.6, 0.86, 0.19, -0.6, 0.76, 0.013), 0.015);

  // Neck column, cut flat at the bottom.
  d = smin(d, capsule(x, y, z, 0, -0.7, -0.18, 0, -2.0, -0.22, 0.34), 0.18);
  d = Math.max(d, NECK_BOTTOM - y);

  return d;
}

const EPS = 0.0015;

/** Unit surface normal from the SDF gradient (tetrahedral sampling). */
export function headNormal(x: number, y: number, z: number): [number, number, number] {
  const a = headSdf(x + EPS, y - EPS, z - EPS);
  const b = headSdf(x - EPS, y - EPS, z + EPS);
  const c = headSdf(x - EPS, y + EPS, z - EPS);
  const d = headSdf(x + EPS, y + EPS, z + EPS);
  const nx = a - b - c + d;
  const ny = -a - b + c + d;
  const nz = -a + b - c + d;
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}

/** Sphere-traces from (x, y, start) along -Z; returns the front surface Z. */
export function frontSurfaceZ(x: number, y: number, start = 1.6): number | null {
  let z = start;
  for (let i = 0; i < 96; i++) {
    const d = headSdf(x, y, z);
    if (d < 0.0008) return z;
    z -= Math.max(d, 0.002);
    if (z < -1.4) return null;
  }
  return null;
}

/** Sphere-traces inward along `dir` toward `origin`; returns the surface point. */
export function radialSurface(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
): [number, number, number] | null {
  let t = 2.6;
  for (let i = 0; i < 96; i++) {
    const x = ox + dx * t;
    const y = oy + dy * t;
    const z = oz + dz * t;
    const d = headSdf(x, y, z);
    if (Math.abs(d) < 0.0008) return [x, y, z];
    t -= Math.max(d, 0.002);
    if (t < 0) return null;
  }
  return null;
}
