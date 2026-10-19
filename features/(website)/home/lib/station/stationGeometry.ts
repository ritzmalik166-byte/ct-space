import { ExtrudeGeometry, Float32BufferAttribute, Path, Shape, type BufferGeometry } from "three";
import { STATION } from "./stationRig";

/**
 * World-space box projection: every face samples the texture at a fixed texel density
 * (`scale` repeats per unit), so the PBR sets tile consistently across hull, doors and
 * interior regardless of each mesh's size.
 */
export function worldUvs<T extends BufferGeometry>(geometry: T, scale = 0.25, offset = [0, 0, 0]): T {
  const position = geometry.getAttribute("position");
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  const normal = geometry.getAttribute("normal");
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) + offset[0];
    const y = position.getY(i) + offset[1];
    const z = position.getZ(i) + offset[2];
    const nx = Math.abs(normal.getX(i));
    const ny = Math.abs(normal.getY(i));
    const nz = Math.abs(normal.getZ(i));
    const [u, w] = ny >= nx && ny >= nz ? [x, z] : nz >= nx ? [x, y] : [z, y];
    uv[i * 2] = u * scale;
    uv[i * 2 + 1] = w * scale;
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  return geometry;
}

function octagon<T extends Shape | Path>(target: T, halfW: number, bottom: number, top: number, chamfer: number) {
  target.moveTo(-halfW + chamfer, bottom);
  target.lineTo(halfW - chamfer, bottom);
  target.lineTo(halfW, bottom + chamfer);
  target.lineTo(halfW, top - chamfer);
  target.lineTo(halfW - chamfer, top);
  target.lineTo(-halfW + chamfer, top);
  target.lineTo(-halfW, top - chamfer);
  target.lineTo(-halfW, bottom + chamfer);
  target.closePath();
  return target;
}

function rect<T extends Shape | Path>(target: T, x0: number, y0: number, x1: number, y1: number) {
  target.moveTo(x0, y0);
  target.lineTo(x1, y0);
  target.lineTo(x1, y1);
  target.lineTo(x0, y1);
  target.closePath();
  return target;
}

const { hull, hall, opening } = STATION;

function extrude(shape: Shape, depth: number, z: number, bevel = 0) {
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geometry.translate(0, 0, z);
  return worldUvs(geometry);
}

/** Hollow octagonal hull: outer skin plus the hall cut-out, from the back plate to z = 0. */
export function createHullBody() {
  const shape = octagon(new Shape(), hull.halfW, hull.bottom, hull.top, hull.chamfer);
  shape.holes.push(rect(new Path(), -hall.halfW, hall.floor, hall.halfW, hall.ceiling));
  return extrude(shape, -hull.back, hull.back);
}

/** Front plate with the bay opening; the doors slide inside its thickness. */
export function createBulkhead() {
  const shape = octagon(new Shape(), hull.halfW, hull.bottom, hull.top, hull.chamfer);
  shape.holes.push(rect(new Path(), -opening.halfW, opening.bottom, opening.halfW, opening.top));
  return extrude(shape, STATION.frontZ, 0, 0.1);
}

/** Back plate around the observation window. */
export function createBackWall(window: { halfW: number; bottom: number; top: number }) {
  const shape = rect(new Shape(), -hall.halfW, hall.floor, hall.halfW, hall.ceiling);
  shape.holes.push(rect(new Path(), -window.halfW, window.bottom, window.halfW, window.top));
  return extrude(shape, 0.6, hall.back - 0.6);
}

/** Docking collar framing the opening, protruding toward the approach. */
export function createCollar() {
  const m = 1.1;
  const shape = octagon(new Shape(), opening.halfW + m, opening.bottom - m, opening.top + m, 0.9);
  shape.holes.push(rect(new Path(), -opening.halfW, opening.bottom, opening.halfW, opening.top));
  return extrude(shape, STATION.collarZ - STATION.frontZ - 0.15, STATION.frontZ, 0.08);
}

/** Structural ring hugging the hull, instanced along its length. */
export function createHullRib() {
  const t = 0.32;
  const shape = octagon(new Shape(), hull.halfW + t, hull.bottom - t, hull.top + t, hull.chamfer + t * 0.4);
  shape.holes.push(octagon(new Path(), hull.halfW - 0.05, hull.bottom + 0.05, hull.top - 0.05, hull.chamfer));
  return extrude(shape, 0.55, -0.275, 0.05);
}

/** Interior arch frame (two pillars and a header) with the same section everywhere. */
export function createHallArch() {
  const t = 0.45;
  const c = 0.9;
  const x = hall.halfW - 0.03;
  const top = hall.ceiling - 0.03;
  const shape = new Shape();
  shape.moveTo(-x, hall.floor);
  shape.lineTo(-x + t, hall.floor);
  shape.lineTo(-x + t, top - t - c);
  shape.lineTo(-x + t + c, top - t);
  shape.lineTo(x - t - c, top - t);
  shape.lineTo(x - t, top - t - c);
  shape.lineTo(x - t, hall.floor);
  shape.lineTo(x, hall.floor);
  shape.lineTo(x, top);
  shape.lineTo(-x, top);
  shape.closePath();
  return extrude(shape, 0.4, -0.2, 0.03);
}
