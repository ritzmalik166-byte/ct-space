/**
 * Mutable values written by the GSAP scroll timeline and read every frame by
 * the WebGL scene. Kept outside React state so scrolling never re-renders.
 */
export interface HeroSceneState {
  /** 0 = galaxy, 0.5 = robot face, 1 = spaceship. */
  progress: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  camZ: number;
  /** 0 = particle silhouette, 1 = solid spacecraft. Held at 0 until the ship state settles. */
  shipForm: number;
  /** Timeline engine intensity during ignition and launch. */
  thrust: number;
  /** 0 = hero pose, 1 = arrived in the solar system. */
  launch: number;
  /** 0–1 carousel progress across portfolio partners. */
  orbit: number;
  /** Latest ScrollTrigger velocity in px/s. Decayed by the voyage layout when scrolling stops. */
  scrollVelocity: number;
  scrollStamp: number;
}

export type HeroPose = Pick<HeroSceneState, "progress" | "rotX" | "rotY" | "rotZ" | "camZ">;

export const HERO_SCENE_KEYFRAMES = {
  galaxy: { progress: 0, rotX: 1.08, rotY: 0, rotZ: -0.32, camZ: 11 },
  robot: { progress: 0.5, rotX: 0.06, rotY: -0.38, rotZ: 0, camZ: 10.6 },
  spaceship: { progress: 1, rotX: 0.8, rotY: -0.45, rotZ: 0.62, camZ: 11 },
} satisfies Record<string, HeroPose>;

export const createHeroSceneState = (): HeroSceneState => ({
  ...HERO_SCENE_KEYFRAMES.galaxy,
  shipForm: 0,
  thrust: 0,
  launch: 0,
  orbit: 0,
  scrollVelocity: 0,
  scrollStamp: 0,
});
