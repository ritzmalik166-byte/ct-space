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
}

export const HERO_SCENE_KEYFRAMES = {
  galaxy: { progress: 0, rotX: 1.08, rotY: 0, rotZ: -0.32, camZ: 11 },
  robot: { progress: 0.5, rotX: 0.06, rotY: -0.38, rotZ: 0, camZ: 10.6 },
  spaceship: { progress: 1, rotX: 0.8, rotY: -0.45, rotZ: 0.62, camZ: 11 },
} satisfies Record<string, HeroSceneState>;

export const createHeroSceneState = (): HeroSceneState => ({
  ...HERO_SCENE_KEYFRAMES.galaxy,
});
