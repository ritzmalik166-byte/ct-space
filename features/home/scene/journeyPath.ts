import * as THREE from "three";

/** Camera flight path through the neural network. Starts where the hero dive ends. */
export const JOURNEY_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 0, 1.6),
    new THREE.Vector3(0.8, 0.4, -5),
    new THREE.Vector3(-1.2, -0.3, -12),
    new THREE.Vector3(1.1, 0.5, -19),
    new THREE.Vector3(-0.7, -0.4, -26),
    new THREE.Vector3(0, 0.2, -33),
  ],
  false,
  "catmullrom",
  0.5,
);

export const PATH_START = JOURNEY_PATH.getPointAt(0);

/** How far ahead on the path the camera looks; the camera itself stops this far before the end. */
export const LOOK_AHEAD = 0.035;

const PATH_END = JOURNEY_PATH.getPointAt(1 - LOOK_AHEAD);
const PATH_END_DIR = JOURNEY_PATH.getPointAt(1).sub(PATH_END).normalize();

/** Camera resting position and focus point for the "Four Disciplines" section. */
export const DISC_CAMERA = PATH_END.clone().addScaledVector(PATH_END_DIR, 7).add(new THREE.Vector3(0, 1.2, 0));
export const DISC_FOCUS = PATH_END.clone().addScaledVector(PATH_END_DIR, 15).add(new THREE.Vector3(0, 0.6, 0));

/** Centre of the "Blueprint to Handover" timeline, beyond the beacons. It runs along world X, facing +Z. */
export const FLOW_CENTER = DISC_FOCUS.clone().add(new THREE.Vector3(0, 0.4, -16));
/** Fraction of the viewport half-width the timeline spans. */
export const FLOW_FILL = 0.66;
/** Height of the timeline's midpoint on screen, in NDC. */
export const FLOW_SCREEN_Y = 0.02;
/** NDC height the timeline climbs from the first node to the last. */
export const FLOW_RISE = 0.34;
export const FLOW_NODE_COUNT = 5;

export const flowHalfWidth = (aspect: number) => (aspect < 1 ? 2.6 : 6);

/** Screen position (in % of the viewport) of a timeline node; the camera is placed so 3D nodes land here. */
export function flowNodeScreen(index: number) {
  const u = -1 + (index * 2) / (FLOW_NODE_COUNT - 1);
  const x = u * FLOW_FILL;
  const y = FLOW_SCREEN_Y + (u * FLOW_RISE) / 2;
  return { left: 50 + x * 50, top: 50 - y * 50 };
}
