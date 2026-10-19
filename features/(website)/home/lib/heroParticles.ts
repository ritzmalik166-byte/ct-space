import { Euler, Vector3 } from "three";
import { createGalaxyShape } from "./particles/galaxyShape";
import { createHumanShape, type HumanMesh } from "./particles/humanShape";
import { createSpaceshipShape } from "./particles/spaceshipShape";
import { createRandom, type ShapePoints } from "./particles/shapeUtils";
import { HERO_SCENE_KEYFRAMES, type HeroSceneState } from "./heroSceneState";

export interface HeroMorphData {
  count: number;
  galaxyPositions: Float32Array;
  robotPositions: Float32Array;
  spaceshipPositions: Float32Array;
  galaxyColors: Float32Array;
  robotColors: Float32Array;
  spaceshipColors: Float32Array;
  /** Per-point size for galaxy / robot / spaceship. */
  sizes: Float32Array;
  /** seed, phase, sweep (0..1 spatial order), spaceship plume length. */
  meta: Float32Array;
  /** galaxy bright-star flag, character eye id, (unused), spaceship nozzle id / glow. */
  fx: Float32Array;
}

type Projector = (x: number, y: number, z: number) => [number, number];

/** Projects with the same ZXY rotation the scene applies at that keyframe. */
function keyframeProjector(frame: Pick<HeroSceneState, "rotX" | "rotY" | "rotZ">): Projector {
  const euler = new Euler(frame.rotX, frame.rotY, frame.rotZ, "ZXY");
  const v = new Vector3();
  return (x, y, z) => {
    v.set(x, y, z).applyEuler(euler);
    return [v.x, v.y];
  };
}

/**
 * Orders points so that index i lands in a comparable screen region for every
 * shape: points are split into horizontal bands (top to bottom), then sorted
 * left to right inside each band. Pairing equal ranks across shapes gives a
 * spatially coherent morph instead of particles crossing the whole scene.
 */
function coherentOrder(shape: ShapePoints, project: Projector): Uint32Array {
  const { count, positions } = shape;
  const sx = new Float32Array(count);
  const sy = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const [px, py] = project(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    sx[i] = px;
    sy[i] = py;
  }
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => sy[b] - sy[a]);
  const bands = Math.max(1, Math.round(Math.sqrt(count) * 0.6));
  const bandSize = Math.ceil(count / bands);
  const result = new Uint32Array(count);
  for (let b = 0; b < bands; b++) {
    const slice = order.slice(b * bandSize, Math.min(count, (b + 1) * bandSize));
    slice.sort((a, c) => sx[a] - sx[c]);
    result.set(slice, b * bandSize);
  }
  return result;
}

function reorder3(source: Float32Array, order: Uint32Array): Float32Array {
  const out = new Float32Array(order.length * 3);
  for (let i = 0; i < order.length; i++) {
    const j = order[i];
    out[i * 3] = source[j * 3];
    out[i * 3 + 1] = source[j * 3 + 1];
    out[i * 3 + 2] = source[j * 3 + 2];
  }
  return out;
}

export function createHeroMorphData(count: number, human: HumanMesh, seed = 1977): HeroMorphData {
  const galaxy = createGalaxyShape(count, createRandom(seed));
  const robot = createHumanShape(count, createRandom(seed + 1), human);
  const spaceship = createSpaceshipShape(count, createRandom(seed + 2));

  const og = coherentOrder(galaxy, keyframeProjector(HERO_SCENE_KEYFRAMES.galaxy));
  const or = coherentOrder(robot, keyframeProjector(HERO_SCENE_KEYFRAMES.robot));
  const os = coherentOrder(spaceship, keyframeProjector(HERO_SCENE_KEYFRAMES.spaceship));

  const sizes = new Float32Array(count * 3);
  const meta = new Float32Array(count * 4);
  const fx = new Float32Array(count * 4);
  const random = createRandom(seed + 3);
  for (let i = 0; i < count; i++) {
    const g = og[i];
    const r = or[i];
    const s = os[i];
    sizes[i * 3] = galaxy.sizes[g];
    sizes[i * 3 + 1] = robot.sizes[r];
    sizes[i * 3 + 2] = spaceship.sizes[s];
    meta[i * 4] = random();
    meta[i * 4 + 1] = random();
    meta[i * 4 + 2] = i / count;
    meta[i * 4 + 3] = spaceship.tags[s * 2];
    fx[i * 4] = galaxy.tags[g * 2];
    fx[i * 4 + 1] = robot.tags[r * 2];
    fx[i * 4 + 2] = robot.tags[r * 2 + 1];
    fx[i * 4 + 3] = spaceship.tags[s * 2 + 1];
  }

  return {
    count,
    galaxyPositions: reorder3(galaxy.positions, og),
    robotPositions: reorder3(robot.positions, or),
    spaceshipPositions: reorder3(spaceship.positions, os),
    galaxyColors: reorder3(galaxy.colors, og),
    robotColors: reorder3(robot.colors, or),
    spaceshipColors: reorder3(spaceship.colors, os),
    sizes,
    meta,
    fx,
  };
}
