export const pointer = { x: 0, y: 0 };

export const motion = { speed: 1, reduced: false };

/** Set once the canvas has rendered its first frames (shaders compiled); the intro loader waits on it. */
export const scene = { ready: false, introDone: false };
export const SCENE_READY_EVENT = "ct:scene-ready";
/** Fired when the intro loader starts lifting; the hero entrance plays from here. */
export const INTRO_DONE_EVENT = "ct:intro-done";

/** Raw scroll progress written by ScrollTrigger (0..1 per phase). */
export const journey = { dive: 0, net: 0, tv: 0, flow: 0, arch: 0, impact: 0, review: 0 };

/** Smoothed copy of `journey`, updated once per frame by the camera director. */
export const view = { dive: 0, net: 0, tv: 0, flow: 0, arch: 0, impact: 0, review: 0 };

/** Shared uniform objects so every material in a scene fades from one value. */
export const fades = {
  network: { value: 0 },
  flow: { value: 0 },
};

/** Section progress at which each "Blueprint to Handover" milestone becomes active. */
export const FLOW_STOPS = [0.28, 0.38, 0.48, 0.58, 0.68];

/** How much of the timeline is drawn (0..1) at a given section progress; eases into each milestone. */
export function flowDraw(progress: number) {
  if (progress <= FLOW_STOPS[0]) return 0;
  for (let i = 1; i < FLOW_STOPS.length; i++) {
    if (progress < FLOW_STOPS[i]) {
      const f = (progress - FLOW_STOPS[i - 1]) / (FLOW_STOPS[i] - FLOW_STOPS[i - 1]);
      return (i - 1 + f * f * (3 - 2 * f)) / (FLOW_STOPS.length - 1);
    }
  }
  return 1;
}

/** Fraction of the network path the camera covers during the post-dive phase. */
export const NET_TRAVEL = 1;

/**
 * Scroll distance of the "How we think" phase: the section's height minus one viewport (`h-[400svh]`).
 * Step timings are written in svh and converted, so resizing the section never speeds the steps up.
 */
export const NET_SCROLL_SVH = 300;
export const netAt = (svh: number) => svh / NET_SCROLL_SVH;

/** Network-phase progress at which each "How we think" step is centred; one entry per step in `HowWeThink`. */
export const STEP_STOPS = [74, 156, 239].map(netAt);

/** DOM video cards for each step; the 3D key nodes move them every frame to follow the camera. */
export const stepCards: (HTMLElement | null)[] = [];
/** Base CSS width of a step card; key nodes scale it to the node's on-screen size. */
export const STEP_CARD_WIDTH = 350;

export function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Quality = "high" | "low";

export const COUNTS: Record<
  Quality,
  { stars: number; network: number; dust: number; glows: number }
> = {
  high: { stars: 2600, network: 900, dust: 1600, glows: 5 },
  low: { stars: 1200, network: 450, dust: 700, glows: 3 },
};

/** Hero background video. */
export const HERO_VIDEO_SRC = "/videos/229254_medium.mp4";
