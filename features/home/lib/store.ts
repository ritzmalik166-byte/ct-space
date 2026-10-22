export const pointer = { x: 0, y: 0 };

export const motion = { speed: 1, reduced: false };

/** Raw scroll progress written by ScrollTrigger (0..1 per phase). */
export const journey = { dive: 0, net: 0, tv: 0, disc: 0, flow: 0, arch: 0, space: 0, impact: 0, review: 0, launch: 0 };

/** Smoothed copy of `journey`, updated once per frame by the camera director. */
export const view = { dive: 0, net: 0, tv: 0, disc: 0, flow: 0, arch: 0, space: 0, impact: 0, review: 0, launch: 0 };

/** Shared uniform objects so every material in a scene fades from one value. */
export const fades = {
  hero: { value: 1 },
  network: { value: 0 },
  disc: { value: 0 },
  flow: { value: 0 },
  space: { value: 0 },
};

/** Section progress at which each discipline card (and its 3D beacon) lights up. */
export const DISC_STOPS = [0.42, 0.47, 0.52, 0.57];

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

/** Network-phase progress at which each "How we think" step is centred. */
export const STEP_STOPS = [0.16, 0.34, 0.52, 0.68];

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
  { core: number; stars: number; ring: number; nodes: number; network: number; dust: number; glows: number }
> = {
  high: { core: 4800, stars: 2600, ring: 1400, nodes: 110, network: 900, dust: 1600, glows: 5 },
  low: { core: 2200, stars: 1200, ring: 650, nodes: 60, network: 450, dust: 700, glows: 3 },
};
