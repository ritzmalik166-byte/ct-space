import { gsap } from "@/lib/gsap";
import { HERO_SCENE_KEYFRAMES, type HeroSceneState } from "./heroSceneState";
import { PORTFOLIO_PARTNERS } from "./portfolioPartners";
import { smoothstep } from "./particles/shapeUtils";
import { activeFloat, orbitForPartner, slotOffset, wrapIndex } from "./voyage/carousel";

/** Timeline units (relative; the pinned scroll distance maps onto the total). */
export const HERO_TIMING = {
  holdStart: 1.0,
  morph: 2.8,
  holdMid: 1.4,
  holdEnd: 1.0,
} as const;

/** Scroll units appended after the spaceship hold: form, ignite, launch, then one step per partner. */
export const VOYAGE_TIMING = {
  form: 1.35,
  ignite: 0.55,
  launch: 2.25,
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
  content?: HTMLElement | null;
  scrim?: HTMLElement | null;
  portfolio?: HTMLElement | null;
}

const words = (layer: HTMLElement) => layer.querySelectorAll<HTMLElement>("[data-hero-word]");
const items = (layer: HTMLElement) => layer.querySelectorAll<HTMLElement>("[data-hero-item]");

/**
 * Builds the single master timeline for the hero. ScrollTrigger scrubs it,
 * so every tween (particles, camera, glow, copy) reverses automatically when
 * scrolling up or changing direction mid-transition.
 */
function orbitDuration(isMobile: boolean) {
  return Math.max(PORTFOLIO_PARTNERS.length - 1, 1) * (isMobile ? 1.05 : 1.4);
}

/** Timeline label where the orbit (partner carousel) segment begins; the orbit tween runs to the end. */
export const ORBIT_LABEL = "orbit";

/** Scroll position (px) that centres a partner, for the selector and arrow buttons. */
export function scrollForPartner(tl: gsap.core.Timeline, index: number) {
  const st = tl.scrollTrigger;
  const orbitAt = tl.labels[ORBIT_LABEL];
  if (!st || orbitAt === undefined) return null;
  const time = orbitAt + orbitForPartner(index) * (tl.duration() - orbitAt);
  return st.start + (time / tl.duration()) * (st.end - st.start);
}

/**
 * Writes the active partner into the HTML layer: panel cross-fade by wrapped
 * slot distance, plus `data-active` on dots, names, thumbnails and labels.
 */
function createPartnerSync(portfolio: HTMLElement | null | undefined) {
  if (!portfolio) return () => {};
  const query = (selector: string) => Array.from(portfolio.querySelectorAll<HTMLElement>(selector));
  const layers = query("[data-partner-layer]");
  const flags = [
    ...query("[data-partner-dot]"),
    ...query("[data-partner-name]"),
    ...query("[data-planet-label]"),
  ];
  const thumbs = query("[data-partner-thumb]");
  const live = portfolio.querySelector<HTMLElement>("[data-partner-live]");
  const count = PORTFOLIO_PARTNERS.length;
  let current = -1;

  return (orbit: number) => {
    const active = activeFloat(orbit);
    layers.forEach((layer, i) => {
      const opacity = 1 - smoothstep(0.12, 0.7, Math.abs(slotOffset(i, active)));
      layer.style.opacity = opacity.toFixed(3);
      layer.style.visibility = opacity > 0.04 ? "visible" : "hidden";
      layer.style.pointerEvents = opacity > 0.55 ? "auto" : "none";
    });

    const index = wrapIndex(active);
    if (index === current) return;
    current = index;
    flags.forEach((el, k) => el.setAttribute("data-active", String(k % count === index)));
    thumbs.forEach((el, i) => {
      el.setAttribute("data-active", String(i === index));
      if (i === index) el.setAttribute("aria-current", "true");
      else el.removeAttribute("aria-current");
    });
    layers.forEach((layer, i) => {
      layer.setAttribute("aria-hidden", String(i !== index));
      layer.querySelector("a")?.setAttribute("tabindex", i === index ? "0" : "-1");
    });
    if (live) {
      live.textContent = `Active partner: ${PORTFOLIO_PARTNERS[index].name}, ${index + 1} of ${count}`;
    }
  };
}

export function createHeroTimeline({
  section,
  layers,
  glows,
  progress,
  sceneState,
  reduceMotion,
  isMobile,
  content,
  scrim,
  portfolio,
}: HeroTimelineOptions): gsap.core.Timeline {
  const { holdStart, morph, holdMid, holdEnd } = HERO_TIMING;
  const { form, ignite, launch } = VOYAGE_TIMING;
  const travel = reduceMotion ? 0 : 1;
  const orbitDur = orbitDuration(isMobile);
  const voyageUnits = form + ignite + launch + orbitDur;
  const scrollLength = (isMobile ? 2.4 : 3.4) * ((HERO_TOTAL + voyageUnits) / HERO_TOTAL);
  const syncPartners = createPartnerSync(portfolio);

  Object.assign(sceneState, HERO_SCENE_KEYFRAMES.galaxy);
  sceneState.shipForm = 0;
  sceneState.thrust = 0;
  sceneState.launch = 0;
  sceneState.orbit = 0;
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
      onUpdate: (self) => {
        sceneState.scrollVelocity = self.getVelocity();
        sceneState.scrollStamp = performance.now();
      },
    },
    // Timeline-level so the panel follows the scrubbed value, not the raw scroll.
    onUpdate: () => syncPartners(sceneState.orbit),
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

  // Hold the final particle ship, then resolve it into the craft and leave for the system.
  const end = HERO_TOTAL;
  if (tl.duration() < end) tl.to({}, { duration: end - tl.duration() });

  const formAt = end;
  const igniteAt = formAt + form;
  const launchAt = igniteAt + ignite;
  const orbitAt = launchAt + launch;

  tl.to(sceneState, { shipForm: 1, duration: form, ease: "power2.inOut" }, formAt);
  tl.to(sceneState, { thrust: 0.7, duration: ignite, ease: "power1.in" }, igniteAt);
  tl.to(sceneState, { launch: 1, thrust: 1, duration: launch, ease: "power2.inOut" }, launchAt);
  tl.to(sceneState, { thrust: 0, duration: 0.4, ease: "power1.out" }, orbitAt);
  tl.addLabel(ORBIT_LABEL, orbitAt);
  tl.to(sceneState, { orbit: 1, duration: orbitDur, ease: "none" }, orbitAt);
  syncPartners(0);

  if (content) tl.to(content, { autoAlpha: 0, duration: 0.7, ease: "power1.in" }, launchAt + launch * 0.12);
  if (scrim) tl.to(scrim, { opacity: 0, duration: 0.9, ease: "power1.inOut" }, launchAt + launch * 0.2);
  glows.forEach((glow) => {
    tl.to(glow, { opacity: 0, duration: 0.8, ease: "power1.in" }, launchAt);
  });
  if (portfolio) {
    tl.set(portfolio, { autoAlpha: 0 }, 0);
    tl.to(portfolio, { autoAlpha: 1, duration: 0.7, ease: "power1.out" }, launchAt + launch * 0.68);
  }

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
