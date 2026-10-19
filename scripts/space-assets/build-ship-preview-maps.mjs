/**
 * Turns the spaceship texture-sheet previews into tileable PBR maps for the explorer.
 *
 *   node scripts/space-assets/build-ship-preview-maps.mjs
 *
 * The previews in public/ct_spaceship_texture_previews/ are crops of a UV atlas
 * (emblems, lettering, separate islands) that does not match the procedural UVs of
 * contenaissance-explorer.meshopt.glb. All eight previews share one layout, so a
 * region cropped at the same rectangle lines up across every channel. Two regions
 * free of lettering are cropped here and made seamless so they can tile over the
 * existing UVs:
 *
 * - panel: dark plating with gold light strips, for the hull and titanium parts
 * - gold:  gold plate, for the trims
 *
 * Height and opacity previews are not exported: the low-poly flat-shaded hull cannot
 * take displacement (split vertices would tear) and the ship is fully opaque.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE = path.resolve("public/ct_spaceship_texture_previews");
const OUT = path.resolve("public/assets/space/textures");

const SETS = {
  panel: { region: { left: 104, top: 252, width: 44, height: 90 }, size: [256, 512] },
  gold: { region: { left: 120, top: 52, width: 38, height: 24 }, size: [512, 320] },
};
const MAPS = ["albedo", "normal", "roughness", "metallic", "ao", "emissive"];

async function crop(map, { region, size }) {
  const [w, h] = size;
  const { data } = await sharp(path.join(SOURCE, `spaceship_${map}_preview.jpg`))
    .extract(region)
    .resize(w, h, { fit: "fill", kernel: "lanczos3" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: Float32Array.from(data), w, h };
}

/**
 * Classic offset blend: the half-offset copy is continuous across the tile edges,
 * the original covers the copy's seam in the middle.
 */
function seamless(img) {
  const { w, h, data } = img;
  const out = new Float32Array(data.length);
  const fade = (t) => {
    const e = Math.min(t, 1 - t) * 2;
    return e * e * (3 - 2 * e);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = Math.min(fade(x / (w - 1)), fade(y / (h - 1)));
      const sx = (x + (w >> 1)) % w;
      const sy = (y + (h >> 1)) % h;
      for (let c = 0; c < 3; c++) {
        const a = data[(y * w + x) * 3 + c];
        const b = data[(sy * w + sx) * 3 + c];
        out[(y * w + x) * 3 + c] = a * k + b * (1 - k);
      }
    }
  }
  return { w, h, data: out };
}

function renormalize(img) {
  const { data } = img;
  for (let i = 0; i < data.length; i += 3) {
    const x = data[i] / 127.5 - 1;
    const y = data[i + 1] / 127.5 - 1;
    const z = data[i + 2] / 127.5 - 1;
    const len = Math.hypot(x, y, z) || 1;
    data[i] = (x / len + 1) * 127.5;
    data[i + 1] = (y / len + 1) * 127.5;
    data[i + 2] = (Math.max(z / len, 0) + 1) * 127.5;
  }
  return img;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  for (const [set, spec] of Object.entries(SETS)) {
    for (const map of MAPS) {
      let img = seamless(await crop(map, spec));
      if (map === "normal") img = renormalize(img);
      const bytes = Uint8Array.from(img.data, (v) => Math.max(0, Math.min(255, Math.round(v))));
      const name = `ship-sheet-${set}-${map}.jpg`;
      const file = path.join(OUT, name);
      await sharp(bytes, { raw: { width: img.w, height: img.h, channels: 3 } }).jpeg({ quality: 90, mozjpeg: true }).toFile(file);
      const { size } = await fs.stat(file);
      console.log(`textures/${name}  ${img.w}x${img.h}  ${Math.round(size / 1024)} KB`);
    }
  }
}

main();
