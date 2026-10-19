import { BufferAttribute, BufferGeometry } from "three";

/**
 * Exhaust sheath from the nozzle (x = 0) back along -X to x = -1, unit radius at
 * the nozzle tapering to a thin tail. Scaled per nozzle (radius) and per frame (length).
 */
export function createPlumeGeometry() {
  const radial = 18;
  const rings = 14;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const radius = 0.9 * (1 - t) + 0.22 * t + 0.25 * Math.sin(Math.min(t * 6, Math.PI)) * (1 - t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      positions.push(-t, Math.cos(a) * radius, Math.sin(a) * radius);
      normals.push(0, Math.cos(a), Math.sin(a));
      uvs.push(j / radial, t);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  return geometry;
}

/** Per-particle seeds for the exhaust sparks: phase, angle, radial spread, size. */
export function createExhaustGeometry(count: number) {
  const seeds = new Float32Array(count * 4);
  let s = 12345;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < count; i++) {
    seeds[i * 4] = rand();
    seeds[i * 4 + 1] = rand() * Math.PI * 2;
    seeds[i * 4 + 2] = Math.sqrt(rand());
    seeds[i * 4 + 3] = 0.5 + rand();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 4));
  return geometry;
}
