import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";
import type { StationGateBrand, StationScreenContent } from "./stationContent";

/** Marks a loaded image as sRGB colour data; must run before the texture is first uploaded. */
export function asColorTexture<T extends Texture>(texture: T, anisotropy = 1): T {
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

const GOLD = "#f4d675";
const GOLD_DIM = "rgba(226,191,116,0.55)";
const CYAN = "#7fe7ff";

function canvas(width: number, height: number) {
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  const ctx = el.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { el, ctx };
}

function texture(el: HTMLCanvasElement, color = true) {
  const tex = new CanvasTexture(el);
  if (color) tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Geist from next/font, resolved from the CSS variable so canvas text matches the page. */
function fontFamily(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

/** Soft radial falloff for additive light sprites (fake bloom). */
export function createGlowTexture() {
  const { el, ctx } = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.55)");
  g.addColorStop(0.45, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return texture(el, false);
}

function corners(ctx: CanvasRenderingContext2D, w: number, h: number, inset: number, len: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const [x, y, dx, dy] of [
    [inset, inset, 1, 1],
    [w - inset, inset, -1, 1],
    [inset, h - inset, 1, -1],
    [w - inset, h - inset, -1, -1],
  ]) {
    ctx.moveTo(x, y + dy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * len, y);
  }
  ctx.stroke();
}

/** Transparent HUD layer drawn over a screen's thumbnail: label, index, title and call to action. */
export function createScreenHud(content: StationScreenContent, index: number, total: number) {
  const W = 1024;
  const H = 576;
  const { el, ctx } = canvas(W, H);
  const tex = texture(el);

  const draw = () => {
    const sans = fontFamily("--font-geist-sans", "Arial, sans-serif");
    const mono = fontFamily("--font-geist-mono", "monospace");
    const accent = content.accent === "gold" ? GOLD : CYAN;
    ctx.clearRect(0, 0, W, H);

    const shade = ctx.createLinearGradient(0, H * 0.35, 0, H);
    shade.addColorStop(0, "rgba(2,4,12,0)");
    shade.addColorStop(1, "rgba(2,4,12,0.88)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
    const top = ctx.createLinearGradient(0, 0, 0, 110);
    top.addColorStop(0, "rgba(2,4,12,0.7)");
    top.addColorStop(1, "rgba(2,4,12,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, 110);

    corners(ctx, W, H, 26, 46, GOLD_DIM);

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = accent;
    ctx.font = `500 26px ${mono}`;
    ctx.letterSpacing = "6px";
    if (content.label) ctx.fillText(content.label.toUpperCase(), 56, 78);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(`${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, W - 56, 78);
    ctx.textAlign = "left";

    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 64px ${sans}`;
    ctx.fillText(content.category, 56, H - 116);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = `400 32px ${sans}`;
    ctx.fillText(content.description, 56, H - 66);

    ctx.font = `500 22px ${mono}`;
    ctx.letterSpacing = "5px";
    ctx.textAlign = "right";
    ctx.fillStyle = GOLD;
    ctx.fillText("PROJECT  \u25B8", W - 56, H - 74);
    ctx.textAlign = "left";
    ctx.letterSpacing = "0px";
    tex.needsUpdate = true;
  };

  draw();
  document.fonts?.ready.then(draw).catch(() => {});
  return tex;
}

export const GATE_BRAND_ASPECT = 2048 / 980;

/**
 * Docking-gate display: brand message (gold gradient on highlighted words), headline and logo.
 * Redrawn once fonts and the logo have loaded.
 */
export function createGateBrandTexture(brand: StationGateBrand) {
  const W = 2048;
  const H = 980;
  const { el, ctx } = canvas(W, H);
  const tex = texture(el);
  tex.anisotropy = 8;
  const logo = new Image();
  logo.decoding = "async";

  const draw = () => {
    const sans = fontFamily("--font-geist-sans", "Arial, sans-serif");
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "rgba(4,10,20,0.9)");
    bg.addColorStop(1, "rgba(2,5,12,0.94)");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(8, 8, W - 16, H - 16, 28);
    ctx.fill();
    ctx.strokeStyle = "rgba(127,231,255,0.22)";
    ctx.lineWidth = 3;
    ctx.stroke();
    corners(ctx, W, H, 34, 90, GOLD_DIM);
    ctx.fillStyle = CYAN;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(W / 2 - 110, 30, 220, 4);
    ctx.globalAlpha = 1;

    // Primary message, centred on one line or split into two balanced lines; highlighted words use the brand gold gradient.
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.font = `600 124px ${sans}`;
    ctx.letterSpacing = "-1px";
    const space = ctx.measureText(" ").width;
    const words = brand.message.split(" ");
    const measure = (list: string[]) => ctx.measureText(list.join(" ")).width;
    let lines = [words];
    if (measure(words) > W - 260) {
      let best = Infinity;
      for (let k = 1; k < words.length; k++) {
        const split = [words.slice(0, k), words.slice(k)];
        const widest = Math.max(measure(split[0]), measure(split[1]));
        if (widest < best) {
          best = widest;
          lines = split;
        }
      }
    }
    const gold = (x0: number, x1: number) => {
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, "#c9982c");
      g.addColorStop(0.35, "#f4d675");
      g.addColorStop(0.5, "#fff0b3");
      g.addColorStop(0.65, "#e8c45e");
      g.addColorStop(1, "#b8860b");
      return g;
    };
    lines.forEach((line, row) => {
      let x = (W - measure(line)) / 2;
      const y = 250 + row * 146;
      for (const word of line) {
        const w = ctx.measureText(word).width;
        ctx.fillStyle = brand.highlight.includes(word) ? gold(x, x + w) : "#f5f7fb";
        ctx.fillText(word, x, y);
        x += w + space;
      }
    });

    ctx.textAlign = "center";
    ctx.letterSpacing = "2px";
    ctx.font = `400 60px ${sans}`;
    ctx.fillStyle = "rgba(196,238,255,0.86)";
    const headlineY = 250 + lines.length * 146 - 6;
    ctx.fillText(brand.headline, W / 2, headlineY);

    const divider = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
    divider.addColorStop(0, "rgba(244,214,117,0)");
    divider.addColorStop(0.5, "rgba(244,214,117,0.9)");
    divider.addColorStop(1, "rgba(244,214,117,0)");
    ctx.fillStyle = divider;
    ctx.fillRect(W / 2 - 160, headlineY + 48, 320, 3);

    if (logo.complete && logo.naturalWidth) {
      const h = Math.min(190, H - (headlineY + 90) - 70);
      const w = (h * logo.naturalWidth) / logo.naturalHeight;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(logo, (W - w) / 2, headlineY + 90, w, h);
    }
    ctx.letterSpacing = "0px";
    tex.needsUpdate = true;
  };

  logo.onload = draw;
  logo.src = brand.logo;
  draw();
  document.fonts?.ready.then(draw).catch(() => {});
  return tex;
}

/** Inner face of the central hologram: glass disc with the CT logo, "AI Reels" and the brand name. */
export function createHologramLabelTexture(logoSrc: string) {
  const S = 1024;
  const C = S / 2;
  const { el, ctx } = canvas(S, S);
  const tex = texture(el);
  tex.anisotropy = 8;
  const logo = new Image();
  logo.decoding = "async";

  const draw = () => {
    const sans = fontFamily("--font-geist-sans", "Arial, sans-serif");
    ctx.clearRect(0, 0, S, S);

    const glass = ctx.createRadialGradient(C, C * 0.9, 0, C, C, 470);
    glass.addColorStop(0, "rgba(10,38,62,0.82)");
    glass.addColorStop(0.75, "rgba(5,22,40,0.72)");
    glass.addColorStop(1, "rgba(8,48,78,0.5)");
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.arc(C, C, 470, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(127,231,255,0.55)";
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(244,214,117,0.35)";
    ctx.beginPath();
    ctx.arc(C, C, 430, 0, Math.PI * 2);
    ctx.stroke();

    if (logo.complete && logo.naturalWidth) {
      const h = 116;
      const w = (h * logo.naturalWidth) / logo.naturalHeight;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(logo, C - w / 2, 290, w, h);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(111,226,255,0.55)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#f5fbff";
    ctx.font = `700 176px ${sans}`;
    ctx.letterSpacing = "-2px";
    ctx.fillText("AI Reels", C, 594);
    ctx.shadowBlur = 0;

    const divider = ctx.createLinearGradient(C - 150, 0, C + 150, 0);
    divider.addColorStop(0, "rgba(244,214,117,0)");
    divider.addColorStop(0.5, "rgba(244,214,117,0.85)");
    divider.addColorStop(1, "rgba(244,214,117,0)");
    ctx.fillStyle = divider;
    ctx.fillRect(C - 150, 632, 300, 3);

    ctx.fillStyle = GOLD;
    ctx.font = `600 56px ${sans}`;
    ctx.letterSpacing = "9px";
    ctx.fillText("CONTENAISSANCE", C + 4, 712);
    ctx.letterSpacing = "0px";
    ctx.textAlign = "left";
    tex.needsUpdate = true;
  };

  logo.onload = draw;
  logo.src = logoSrc;
  draw();
  document.fonts?.ready.then(draw).catch(() => {});
  return tex;
}

/** Console top: telemetry traces and bar meters. */
export function createConsoleTexture(seed: number) {
  const W = 512;
  const H = 256;
  const { el, ctx } = canvas(W, H);
  ctx.fillStyle = "#03070f";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(127,231,255,0.12)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = k === 1 ? GOLD : CYAN;
    ctx.globalAlpha = k === 2 ? 0.45 : 0.9;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= 300; x += 4) {
      const y = 70 + k * 46 + Math.sin(x * 0.04 + seed * 3 + k) * 14 + Math.sin(x * 0.13 + k * 2) * 5;
      if (x === 0) ctx.moveTo(24 + x, y);
      else ctx.lineTo(24 + x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 8; i++) {
    const h = 30 + ((Math.sin(seed * 7 + i * 1.7) + 1) / 2) * 120;
    ctx.fillStyle = i % 3 === 0 ? GOLD : "rgba(127,231,255,0.75)";
    ctx.fillRect(350 + i * 18, 210 - h, 10, h);
  }
  return texture(el);
}

/** Restrained orbital diagram for the floating data panels. */
export function createDataVizTexture(seed: number) {
  const S = 512;
  const { el, ctx } = canvas(S, S);
  ctx.clearRect(0, 0, S, S);
  ctx.translate(S / 2, S / 2);
  for (let i = 1; i <= 4; i++) {
    ctx.strokeStyle = i === 3 ? "rgba(244,214,117,0.85)" : "rgba(127,231,255,0.5)";
    ctx.lineWidth = i === 3 ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 48 * i, 48 * i * 0.42, seed * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    const a = seed * 2 + i * 1.9;
    ctx.fillStyle = i === 3 ? GOLD : CYAN;
    ctx.beginPath();
    const px = Math.cos(a) * 48 * i;
    const py = Math.sin(a) * 48 * i * 0.42;
    ctx.arc(px * Math.cos(seed * 0.3) - py * Math.sin(seed * 0.3), px * Math.sin(seed * 0.3) + py * Math.cos(seed * 0.3), 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(127,231,255,0.35)";
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, 236, 0, Math.PI * 2);
  ctx.stroke();
  return texture(el);
}

/** Amber/black chevrons for the door seam and landing pad edge. */
export function createHazardTexture() {
  const { el, ctx } = canvas(256, 64);
  ctx.fillStyle = "#14100a";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = "#e0a63a";
  for (let x = -64; x < 320; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x + 24, 64);
    ctx.lineTo(x + 56, 0);
    ctx.lineTo(x + 32, 0);
    ctx.closePath();
    ctx.fill();
  }
  const tex = texture(el);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
}
