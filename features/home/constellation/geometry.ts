import { ORBITS } from "./data";

export const ORBIT_TILT = -24;
const CX = 500;
const CY = 310;

export function orbitPath(w: number, h: number) {
  const r = h / 2;
  const x0 = CX - w / 2 + r;
  const x1 = CX + w / 2 - r;
  return `M ${x0} ${CY - r} H ${x1} A ${r} ${r} 0 0 1 ${x1} ${CY + r} H ${x0} A ${r} ${r} 0 0 1 ${x0} ${CY - r} Z`;
}

/** Point at fraction `t` (0..1) along a stadium, following the same clockwise route as `orbitPath`, then tilted. */
export function orbitPoint(w: number, h: number, t: number) {
  const r = h / 2;
  const straight = w - h;
  const total = 2 * straight + Math.PI * h;
  let s = (((t % 1) + 1) % 1) * total;
  let x: number;
  let y: number;
  if (s < straight) {
    x = CX - straight / 2 + s;
    y = CY - r;
  } else if ((s -= straight) < Math.PI * r) {
    const a = -Math.PI / 2 + s / r;
    x = CX + straight / 2 + Math.cos(a) * r;
    y = CY + Math.sin(a) * r;
  } else if ((s -= Math.PI * r) < straight) {
    x = CX + straight / 2 - s;
    y = CY + r;
  } else {
    s -= straight;
    const a = Math.PI / 2 + s / r;
    x = CX - straight / 2 + Math.cos(a) * r;
    y = CY + Math.sin(a) * r;
  }
  const tilt = (ORBIT_TILT * Math.PI) / 180;
  const dx = x - CX;
  const dy = y - CY;
  return { x: CX + dx * Math.cos(tilt) - dy * Math.sin(tilt), y: CY + dx * Math.sin(tilt) + dy * Math.cos(tilt) };
}

/** Real extent of the tilted orbits, padded for the logo badges and centred on the core. */
export const VIEW = (() => {
  const outer = ORBITS[ORBITS.length - 1];
  let halfW = 0;
  let halfH = 0;
  for (let i = 0; i < 360; i++) {
    const p = orbitPoint(outer.w, outer.h, i / 360);
    halfW = Math.max(halfW, Math.abs(p.x - CX));
    halfH = Math.max(halfH, Math.abs(p.y - CY));
  }
  halfW = Math.ceil(halfW + 40);
  halfH = Math.ceil(halfH + 18);
  return { x: CX - halfW, y: CY - halfH, w: halfW * 2, h: halfH * 2 };
})();

/** Keeps the orbit ratio and fills whichever of width or height runs out first. */
export const STAGE_SIZE = {
  width: `min(calc(100vw - 2rem), calc((100svh - 9rem) * ${(VIEW.w / VIEW.h).toFixed(4)}), 1280px)`,
  aspectRatio: `${VIEW.w} / ${VIEW.h}`,
};
