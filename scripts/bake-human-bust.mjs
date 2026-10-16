/**
 * Bakes the Lee Perry-Smith head scan (assets/models/lee-perry-smith) into the
 * compact particle-source mesh loaded by the hero worker:
 *
 *   public/models/human-bust.bin
 *     u32 magic "HBST", u32 vertexCount, u32 indexCount, u32 reserved
 *     f32[v*3] positions (source units, y up, face toward +z)
 *     i8[v*3]  normals (x127)
 *     u8[v]    ambient occlusion (0 occluded – 255 open)
 *     u16[i]   triangle indices
 *
 * Ambient occlusion is computed from 64 orthographic depth maps (one per
 * direction on the sphere), so the runtime never ray-casts the mesh.
 *
 * Usage: node scripts/bake-human-bust.mjs [--preview]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const SRC = "assets/models/lee-perry-smith/LeePerrySmith.glb";
const OUT = "public/models/human-bust.bin";
const AO_DIRECTIONS = 64;
const AO_RES = 320;

function parseGlb(path) {
  const b = readFileSync(path);
  const jsonLength = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jsonLength).toString());
  const binStart = 20 + jsonLength + 8;
  const accessor = (index, Type) => {
    const a = json.accessors[index];
    const view = json.bufferViews[a.bufferView];
    const offset = binStart + (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type] * a.count;
    return new Type(b.buffer.slice(b.byteOffset + offset, b.byteOffset + offset + n * Type.BYTES_PER_ELEMENT));
  };
  const prim = json.meshes[0].primitives[0];
  return {
    positions: accessor(prim.attributes.POSITION, Float32Array),
    normals: accessor(prim.attributes.NORMAL, Float32Array),
    indices: accessor(prim.indices, Uint16Array),
  };
}

/** Orthonormal basis (u, v) perpendicular to d. */
function basis(d) {
  const a = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm(cross(a, d));
  return [u, cross(d, u)];
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * Rasterises the mesh along direction d (looking from +d toward -d) into an
 * orthographic depth buffer storing the largest height along d.
 */
function depthMap(mesh, d, res, extent) {
  const [u, v] = basis(d);
  const { positions: P, indices: I } = mesh;
  const n = P.length / 3;
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const sz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
    sx[i] = ((dot(p, u) / extent) * 0.5 + 0.5) * res;
    sy[i] = ((dot(p, v) / extent) * 0.5 + 0.5) * res;
    sz[i] = dot(p, d);
  }
  const depth = new Float32Array(res * res).fill(-Infinity);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    const minX = Math.max(0, Math.floor(Math.min(sx[a], sx[b], sx[c])));
    const maxX = Math.min(res - 1, Math.ceil(Math.max(sx[a], sx[b], sx[c])));
    const minY = Math.max(0, Math.floor(Math.min(sy[a], sy[b], sy[c])));
    const maxY = Math.min(res - 1, Math.ceil(Math.max(sy[a], sy[b], sy[c])));
    const area = (sx[b] - sx[a]) * (sy[c] - sy[a]) - (sx[c] - sx[a]) * (sy[b] - sy[a]);
    if (Math.abs(area) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((sx[b] - px) * (sy[c] - py) - (sx[c] - px) * (sy[b] - py)) / area;
        const w1 = ((sx[c] - px) * (sy[a] - py) - (sx[a] - px) * (sy[c] - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
        const z = w0 * sz[a] + w1 * sz[b] + w2 * sz[c];
        const k = y * res + x;
        if (z > depth[k]) depth[k] = z;
      }
    }
  }
  return { depth, sx, sy, sz };
}

function bakeAo(mesh) {
  const { positions: P, normals: N } = mesh;
  const n = P.length / 3;
  const extent = 4.6;
  const open = new Float32Array(n);
  const total = new Float32Array(n);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let k = 0; k < AO_DIRECTIONS; k++) {
    const y = 1 - ((k + 0.5) / AO_DIRECTIONS) * 2;
    const r = Math.sqrt(1 - y * y);
    const d = [Math.cos(golden * k) * r, y, Math.sin(golden * k) * r];
    const { depth, sx, sy, sz } = depthMap(mesh, d, AO_RES, extent);
    for (let i = 0; i < n; i++) {
      const c = N[i * 3] * d[0] + N[i * 3 + 1] * d[1] + N[i * 3 + 2] * d[2];
      if (c <= 0) continue;
      total[i] += c;
      // Sample a 3×3 footprint to soften rasterisation noise.
      let vis = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const x = Math.min(AO_RES - 1, Math.max(0, Math.floor(sx[i]) + ox));
          const yy = Math.min(AO_RES - 1, Math.max(0, Math.floor(sy[i]) + oy));
          if (sz[i] >= depth[yy * AO_RES + x] - 0.06) vis++;
        }
      }
      open[i] += c * (vis / 9);
    }
  }
  const ao = new Uint8Array(n);
  for (let i = 0; i < n; i++) ao[i] = Math.round(255 * (total[i] > 0 ? open[i] / total[i] : 1));
  return ao;
}

function writeBin(mesh, ao) {
  const { positions: P, normals: N, indices: I } = mesh;
  const v = P.length / 3;
  const header = new Uint32Array([0x54534248, v, I.length, 0]);
  const normals = new Int8Array(v * 3);
  for (let i = 0; i < v * 3; i++) normals[i] = Math.round(Math.max(-1, Math.min(1, N[i])) * 127);
  const parts = [header, P, normals, ao, new Uint8Array((4 - ((v * 4) % 4)) % 4), I];
  const size = parts.reduce((a, p) => a + p.byteLength, 0);
  const out = new Uint8Array(size);
  let o = 0;
  for (const p of parts) {
    out.set(new Uint8Array(p.buffer, p.byteOffset, p.byteLength), o);
    o += p.byteLength;
  }
  mkdirSync("public/models", { recursive: true });
  writeFileSync(OUT, out);
  return size;
}

/* ---------------------------------------------------------------- preview */

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function png(path, w, h, gray) {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0;
    for (let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = gray[y * w + x];
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  writeFileSync(
    path,
    Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]),
  );
}

/** Front orthographic render of AO × lambert with a 0.5-unit grid, for landmark reading. */
function preview(mesh, ao, path, cx = 0, cy = 0, extent = 4.4) {
  const res = 800;
  const shifted = { ...mesh, positions: mesh.positions.map((v, i) => (i % 3 === 0 ? v - cx : i % 3 === 1 ? v - cy : v)) };
  mesh = shifted;
  const { depth } = depthMap(mesh, [0, 0, 1], res, extent);
  // Shade by splatting vertices (dense enough at this resolution after blur).
  const shade = new Float32Array(res * res);
  const weight = new Float32Array(res * res);
  const { positions: P, normals: N } = mesh;
  const light = norm([-0.4, 0.5, 0.75]);
  for (let i = 0; i < P.length / 3; i++) {
    const x = Math.floor(((P[i * 3] / extent) * 0.5 + 0.5) * res);
    const y = Math.floor(((P[i * 3 + 1] / extent) * 0.5 + 0.5) * res);
    if (x < 0 || y < 0 || x >= res || y >= res) continue;
    if (P[i * 3 + 2] < depth[y * res + x] - 0.08) continue;
    const l = Math.max(0, N[i * 3] * light[0] + N[i * 3 + 1] * light[1] + N[i * 3 + 2] * light[2]);
    const s = (0.15 + 0.85 * l) * (ao[i] / 255);
    for (let oy = -3; oy <= 3; oy++) {
      for (let ox = -3; ox <= 3; ox++) {
        const xx = x + ox, yy = y + oy;
        if (xx < 0 || yy < 0 || xx >= res || yy >= res) continue;
        const w = Math.exp(-(ox * ox + oy * oy) / 4);
        shade[yy * res + xx] += s * w;
        weight[yy * res + xx] += w;
      }
    }
  }
  const gray = new Uint8Array(res * res);
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const k = (res - 1 - y) * res + x;
      const src = y * res + x;
      let g = weight[src] > 0 ? (shade[src] / weight[src]) * 255 : 0;
      if (extent < 2 && Number.isFinite(depth[src])) {
        const px = (extent * 2) / res;
        const dzx = (depth[y * res + Math.min(res - 1, x + 1)] - depth[y * res + Math.max(0, x - 1)]) / (2 * px);
        const dzy = (depth[Math.min(res - 1, y + 1) * res + x] - depth[Math.max(0, y - 1) * res + x]) / (2 * px);
        const nn = norm([-dzx, -dzy, 1]);
        g = Number.isFinite(nn[0]) ? 30 + 225 * Math.max(0, dot(nn, light)) : 0;
      }
      const ux = ((x + 0.5) / res - 0.5) * 2 * extent;
      const uy = ((y + 0.5) / res - 0.5) * 2 * extent;
      const step = extent > 2 ? 0.5 : 0.1;
      const wx = ux + cx, wy = uy + cy;
      const gridX = Math.abs(wx / step - Math.round(wx / step)) < 0.012 * (step / 0.5) * (4.4 / extent) * 2;
      const gridY = Math.abs(wy / step - Math.round(wy / step)) < 0.012 * (step / 0.5) * (4.4 / extent) * 2;
      if (gridX || gridY) g = Math.max(g, Math.abs(wx - Math.round(wx)) < step * 0.1 || Math.abs(wy - Math.round(wy)) < step * 0.1 ? 140 : 50);
      gray[k] = g;
    }
  }
  png(path, res, res, gray);
}

const mesh = parseGlb(SRC);
const t0 = Date.now();
const ao = bakeAo(mesh);
const size = writeBin(mesh, ao);
console.log(`baked ${mesh.positions.length / 3} vertices, ${mesh.indices.length / 3} triangles, ${size} bytes in ${Date.now() - t0}ms`);
if (process.argv.includes("--landmarks")) {
  const res = 1024, extent = 4.6;
  const { depth } = depthMap(mesh, [0, 0, 1], res, extent);
  const z = (x, y) => {
    const u = [-1, 0, 0];
    // depthMap basis for d=(0,0,1): u = cross(up, d) = (1,0,0), v = (0,1,0)
    void u;
    const px = Math.floor(((x / extent) * 0.5 + 0.5) * res);
    const py = Math.floor(((y / extent) * 0.5 + 0.5) * res);
    return depth[py * res + px];
  };
  const probes = {
    eyeL: [-0.715, 1.665], eyeR: [0.485, 1.665], lidL: [-0.715, 1.625], noseTip: [-0.115, 1.12], bridge: [-0.115, 1.75],
    mouth: [-0.115, 0.46], chin: [-0.115, -0.05], browL: [-0.75, 2.0], browR: [0.52, 2.0], cheekL: [-0.9, 1.1], cheekR: [0.68, 1.1],
  };
  for (const [k, [x, y]] of Object.entries(probes)) console.log(k, x, y, z(x, y).toFixed(3));
  // Chin profile: lowest y where the midline is still the face (z peak scan)
  for (let y = 1.2; y > -1.6; y -= 0.1) console.log("mid", y.toFixed(2), z(-0.115, y).toFixed(3));
}
if (process.argv.includes("--preview")) {
  preview(mesh, ao, "human-bust-preview.png");
  preview(mesh, ao, "human-bust-face.png", 0, 1.3, 1.3);
  console.log("wrote human-bust-preview.png, human-bust-face.png");
}
