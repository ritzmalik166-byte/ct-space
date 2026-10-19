/**
 * Fetches and optimises the Section 3 (space station) assets into public/assets/station/.
 *
 *   node scripts/station-assets/build-station-assets.mjs
 *
 * - NASA Gateway Core GLB (NASA 3D Resources) -> meshopt geometry + 512px WebP textures.
 * - ambientCG / Poly Haven CC0 PBR sets -> albedo, OpenGL normal and packed ARM
 *   (R = occlusion, G = roughness, B = metalness, the layout three.js samples).
 * - Poly Haven CC0 HDRI for interior reflections.
 *
 * Screen thumbnails (public/assets/station/thumbs/) are poster frames taken from the
 * Contenaissance videos listed in stationContent.ts and are not rebuilt here.
 *
 * Downloads are cached in the OS temp dir; see public/assets/station/CREDITS.md.
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("public/assets/station");
const CACHE = path.join(os.tmpdir(), "ct-station-assets");
const SIZE = 1024;

const GATEWAY_URL =
  "https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Gateway/Gateway%20Core.glb";

/** ambientCG sets ship as zips of separate maps; Poly Haven exposes an ARM map directly. */
const MATERIALS = [
  { name: "hull-panels", source: "ambientcg", id: "MetalPlates007" },
  { name: "wall-panels", source: "ambientcg", id: "MetalPlates004" },
  { name: "brushed-metal", source: "ambientcg", id: "Metal032" },
  { name: "tread-plate", source: "polyhaven", id: "metal_plate" },
];

const HDRI = { id: "empty_warehouse_01", res: "1k" };

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function download(url, file) {
  if (await exists(file)) return file;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

async function gateway() {
  const raw = await download(GATEWAY_URL, path.join(CACHE, "gateway-core.glb"));
  const out = path.join(OUT, "models/gateway-core.meshopt.glb");
  await fs.mkdir(path.dirname(out), { recursive: true });
  execSync(
    `npx --yes @gltf-transform/cli optimize "${raw}" "${out}" --compress meshopt --texture-compress webp --texture-size 512 --simplify false`,
    { stdio: "inherit" },
  );
}

async function grey(file) {
  return sharp(file).resize(SIZE, SIZE, { fit: "fill" }).greyscale().raw().toBuffer();
}

async function writeArm(dir, { ao, roughness, metalness }) {
  const arm = Buffer.alloc(SIZE * SIZE * 3);
  for (let i = 0; i < SIZE * SIZE; i++) {
    arm[i * 3] = ao ? ao[i] : 255;
    arm[i * 3 + 1] = roughness[i];
    arm[i * 3 + 2] = metalness ? metalness[i] : 0;
  }
  await sharp(arm, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(path.join(dir, "arm.jpg"));
}

async function material({ name, source, id }) {
  const dir = path.join(OUT, "textures", name);
  await fs.mkdir(dir, { recursive: true });
  const jpeg = (file, out, quality) =>
    sharp(file).resize(SIZE, SIZE, { fit: "fill" }).jpeg({ quality, mozjpeg: true }).toFile(path.join(dir, out));

  if (source === "ambientcg") {
    const zip = await download(`https://ambientcg.com/get?file=${id}_1K-JPG.zip`, path.join(CACHE, `${id}.zip`));
    const src = path.join(CACHE, id);
    await fs.mkdir(src, { recursive: true });
    execSync(`tar -xf "${zip}" -C "${src}"`);
    const map = (suffix) => path.join(src, `${id}_1K-JPG_${suffix}.jpg`);
    await jpeg(map("Color"), "albedo.jpg", 85);
    await jpeg(map("NormalGL"), "normal.jpg", 92);
    await writeArm(dir, {
      ao: (await exists(map("AmbientOcclusion"))) ? await grey(map("AmbientOcclusion")) : null,
      roughness: await grey(map("Roughness")),
      metalness: (await exists(map("Metalness"))) ? await grey(map("Metalness")) : null,
    });
    return;
  }

  const base = `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${id}/${id}`;
  await jpeg(await download(`${base}_diff_1k.jpg`, path.join(CACHE, `${id}_diff.jpg`)), "albedo.jpg", 85);
  await jpeg(await download(`${base}_nor_gl_1k.jpg`, path.join(CACHE, `${id}_nor.jpg`)), "normal.jpg", 92);
  await jpeg(await download(`${base}_arm_1k.jpg`, path.join(CACHE, `${id}_arm.jpg`)), "arm.jpg", 90);
}

async function hdri() {
  const file = `${HDRI.id}_${HDRI.res}.hdr`;
  const out = path.join(OUT, "hdr", file);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.copyFile(
    await download(`https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/${HDRI.res}/${file}`, path.join(CACHE, file)),
    out,
  );
}

await fs.mkdir(CACHE, { recursive: true });
for (const entry of MATERIALS) await material(entry);
await hdri();
await gateway();
console.log("Station assets written to", OUT);
