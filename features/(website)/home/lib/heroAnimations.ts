import { gsap } from "@/lib/gsap";
import { HERO_SCENE_KEYFRAMES, type HeroSceneState } from "./heroSceneState";

/** Timeline units (relative; the pinned scroll distance maps onto the total). */
export const HERO_TIMING = {
  holdStart: 1.0,
  morph: 2.8,
  holdMid: 1.4,
  holdEnd: 1.0,
} as const;

export const HERO_LABELS = ["galaxy", "robot", "spaceship"] as const;

const HERO_TOTAL = HERO_TIMING.holdStart + 2 * HERO_TIMING.morph + HERO_TIMING.holdMid + HERO_TIMING.holdEnd;

/** Where each state's label sits on the master timeline, as 0–1 progress. */
export const HERO_STATE_STOPS = [
  0,
  (HERO_TIMING.holdStart + HERO_TIMING.morph + HERO_TIMING.holdMid / 2) / HERO_TOTAL,
  1,
] as const;

export interface HeroProgressTargets {
  fill: HTMLElement;
  /** One per state; the first is lit from the start. */
  nodes: HTMLElement[];
}

interface HeroTimelineOptions {
  section: HTMLElement;
  layers: HTMLElement[];
  glows: HTMLElement[];
  progress?: HeroProgressTargets | null;
  sceneState: HeroSceneState;
  reduceMotion: boolean;
  isMobile: boolean;
}

const words = (layer: HTMLElement) => layer.querySelectorAll<HTMLElement>("[data-hero-word]");
const items = (layer: HTMLElement) => layer.querySelectorAll<HTMLElement>("[data-hero-item]");

/**
 * Builds the single master timeline for the hero. ScrollTrigger scrubs it,
 * so every tween (particles, camera, glow, copy) reverses automatically when
 * scrolling up or changing direction mid-transition.
 */
export function createHeroTimeline({
  section,
  layers,
  glows,
  progress,
  sceneState,
  reduceMotion,
  isMobile,
}: HeroTimelineOptions): gsap.core.Timeline {
  const { holdStart, morph, holdMid, holdEnd } = HERO_TIMING;
  const travel = reduceMotion ? 0 : 1;
  const scrollLength = isMobile ? 2.4 : 3.4;

  Object.assign(sceneState, HERO_SCENE_KEYFRAMES.galaxy);
  layers.forEach((layer, i) => gsap.set(layer, { autoAlpha: i === 0 ? 1 : 0 }));
  glows.forEach((glow, i) => gsap.set(glow, { opacity: i === 0 ? 1 : 0 }));

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => `+=${window.innerHeight * scrollLength}`,
      pin: true,
      scrub: reduceMotion ? true : 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  tl.addLabel(HERO_LABELS[0], 0);

  const keyframes = [HERO_SCENE_KEYFRAMES.robot, HERO_SCENE_KEYFRAMES.spaceship];

  keyframes.forEach((target, i) => {
    const start = holdStart + i * (morph + holdMid);
    const from = layers[i];
    const to = layers[i + 1];

    tl.to(sceneState, { ...target, duration: morph, ease: "sine.inOut" }, start);
    tl.to(glows[i], { opacity: 0, duration: morph }, start);
    tl.to(glows[i + 1], { opacity: 1, duration: morph }, start);

    // Outgoing copy leaves during the first third of the morph.
    tl.to(
      words(from),
      reduceMotion
        ? { autoAlpha: 0, duration: 0.6 }
        : { yPercent: -110, duration: 0.8, stagger: 0.02, ease: "power2.in" },
      start,
    );
    tl.to(
      items(from),
      { y: -18 * travel, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: "power2.in" },
      start,
    );
    tl.set(from, { autoAlpha: 0 }, start + 1.05);

    // Incoming copy arrives as the particles settle into the next shape.
    const enter = start + morph * 0.42;
    tl.set(to, { autoAlpha: 1 }, enter);
    tl.fromTo(
      words(to),
      reduceMotion ? { autoAlpha: 0 } : { yPercent: 110 },
      reduceMotion
        ? { autoAlpha: 1, duration: 0.6 }
        : { yPercent: 0, duration: 0.9, stagger: 0.025, ease: "power3.out" },
      enter,
    );
    tl.fromTo(
      items(to),
      { y: 22 * travel, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.07, ease: "power3.out" },
      enter + 0.15,
    );

    tl.addLabel(HERO_LABELS[i + 1], start + morph + (i === 0 ? holdMid / 2 : holdEnd));
  });

  // Hold the final state before the pin releases.
  const end = HERO_TOTAL;
  if (tl.duration() < end) tl.to({}, { duration: end - tl.duration() });

  // Scroll guidance mirrors the whole scrubbed timeline, so it reverses with it.
  if (progress) {
    tl.fromTo(progress.fill, { scaleX: 0 }, { scaleX: 1, duration: end, ease: "none" }, 0);
    progress.nodes.forEach((node, i) => {
      if (i === 0) return;
      const at = HERO_STATE_STOPS[i] * end - 0.35;
      tl.fromTo(node, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.25, ease: "power2.out" }, at);
    });
  }

  return tl;
}
