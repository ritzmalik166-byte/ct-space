/** Seeded 3D gradient noise, fBm and Worley used by the asset generators. */

export function createNoise(seed = 1) {
  const perm = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  let s = seed >>> 0 || 1;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y, z) => {
    const g = h & 15;
    const u = g < 8 ? x : y;
    const v = g < 4 ? y : g === 12 || g === 14 ? x : z;
    return ((g & 1) === 0 ? u : -u) + ((g & 2) === 0 ? v : -v);
  };

  /** Perlin noise in roughly [-1, 1]. */
  function noise(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = perm[X] + Y;
    const AA = perm[A] + Z;
    const AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y;
    const BA = perm[B] + Z;
    const BB = perm[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u), lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      lerp(
        lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
        lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u),
        v,
      ),
      w,
    );
  }

  /** Fractal sum remapped to roughly [0, 1]. */
  function fbm(x, y, z, octaves = 5, lacunarity = 2.03, gain = 0.5) {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(x, y, z);
      norm += amp;
      x = x * lacunarity + 17.1;
      y = y * lacunarity + 3.7;
      z = z * lacunarity + 9.3;
      amp *= gain;
    }
    return sum / norm * 0.5 + 0.5;
  }

  const cellHash = (x, y, z, k) => {
    let h = (x * 374761393 + y * 668265263 + z * 2147483647 + k * 1274126177 + seed * 9176) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  /** Distances to the nearest and second-nearest feature points. */
  function worley(x, y, z, out) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    let f1 = 9;
    let f2 = 9;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = xi + dx;
          const cy = yi + dy;
          const cz = zi + dz;
          const px = cx + cellHash(cx, cy, cz, 1) - x;
          const py = cy + cellHash(cx, cy, cz, 2) - y;
          const pz = cz + cellHash(cx, cy, cz, 3) - z;
          const d = px * px + py * py + pz * pz;
          if (d < f1) {
            f2 = f1;
            f1 = d;
          } else if (d < f2) {
            f2 = d;
          }
        }
      }
    }
    out[0] = Math.sqrt(f1);
    out[1] = Math.sqrt(f2);
    return out;
  }

  return { noise, fbm, worley, rand };
}

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const mix = (a, b, t) => a + (b - a) * t;
