import { gsap } from "@/lib/gsap";
import { createStationSceneState, type StationSceneState } from "./stationState";

/** Relative timeline units; the pinned scroll distance maps onto the total. */
export const STATION_TIMING = {
  approach: 3.4,
  align: 0.9,
  gate: 1.5,
  /** Gap between "doors fully open" and the ship starting to move in. */
  clearance: 0.2,
  entry: 2.8,
  interior: 1.6,
  hold: 1.6,
} as const;

/** Phase label positions, used for captions and the progress rail. */
export const STATION_PHASES = ["approach", "docking", "entry", "interior"] as const;

interface StationTimelineOptions {
  section: HTMLElement;
  state: StationSceneState;
  captions: HTMLElement[];
  header: HTMLElement | null;
  hint: HTMLElement | null;
  rail: { fill: HTMLElement; nodes: HTMLElement[] } | null;
  reduceMotion: boolean;
  isMobile: boolean;
}

/**
 * Single scrubbed, pinned timeline for the station sequence. The scene reads the
 * state values every frame, so scrolling up replays every phase in reverse.
 */
export function createStationTimeline({
  section,
  state,
  captions,
  header,
  hint,
  rail,
  reduceMotion,
  isMobile,
}: StationTimelineOptions): gsap.core.Timeline {
  const T = STATION_TIMING;
  Object.assign(state, createStationSceneState());

  const alignAt = T.approach;
  const gateAt = alignAt + T.align * 0.55;
  const gateEnd = gateAt + T.gate;
  const entryAt = gateEnd + T.clearance;
  const interiorAt = entryAt + T.entry;
  const end = interiorAt + T.interior + T.hold;
  const travel = reduceMotion ? 0 : 1;

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => `+=${window.innerHeight * (isMobile ? 3.8 : 5.6)}`,
      pin: true,
      scrub: reduceMotion ? true : 0.8,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  // Phase A: long, decelerating approach.
  tl.to(state, { approach: 1, duration: T.approach, ease: "power2.out" }, 0);
  tl.to(state, { thrust: 0.32, duration: T.approach * 0.6, ease: "power1.inOut" }, T.approach * 0.4);
  // Phase B: alignment, then the doors. Entry never starts before `gateEnd`.
  tl.to(state, { align: 1, duration: T.align, ease: "power1.inOut" }, alignAt);
  tl.to(state, { thrust: 0.18, duration: T.align }, alignAt);
  tl.to(state, { gate: 1, duration: T.gate, ease: "power2.inOut" }, gateAt);
  // Phase C: through the opening and down onto the pad.
  tl.to(state, { entry: 1, duration: T.entry }, entryAt);
  tl.to(state, { thrust: 0.45, duration: T.entry * 0.3, ease: "power1.in" }, entryAt);
  tl.to(state, { thrust: 0, duration: T.entry * 0.35, ease: "power1.out" }, entryAt + T.entry * 0.65);
  // Phase D: over the ship to the research deck, then a hold for interaction.
  tl.to(state, { interior: 1, duration: T.interior, ease: "power1.inOut" }, interiorAt);
  if (tl.duration() < end) tl.to({}, { duration: end - tl.duration() });

  const phaseSpans: Array<[number, number]> = [
    [0, alignAt - 0.4],
    [alignAt - 0.2, entryAt],
    [entryAt + 0.2, interiorAt],
    [interiorAt + T.interior * 0.6, end],
  ];
  captions.forEach((caption, i) => {
    const [from, to] = phaseSpans[i];
    gsap.set(caption, { autoAlpha: i === 0 ? 1 : 0, y: 0 });
    if (i > 0) tl.fromTo(caption, { autoAlpha: 0, y: 16 * travel }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" }, from);
    if (i < captions.length - 1) tl.to(caption, { autoAlpha: 0, y: -12 * travel, duration: 0.35, ease: "power1.in" }, to - 0.35);
  });

  if (header) tl.to(header, { autoAlpha: 0, y: -10 * travel, duration: 0.5 }, interiorAt);
  if (hint) {
    gsap.set(hint, { autoAlpha: 0 });
    tl.to(hint, { autoAlpha: 1, duration: 0.4 }, interiorAt + T.interior * 0.9);
  }
  if (rail) {
    tl.fromTo(rail.fill, { scaleY: 0 }, { scaleY: 1, duration: end, ease: "none" }, 0);
    const stops = [0, alignAt, entryAt, interiorAt];
    rail.nodes.forEach((node, i) => {
      tl.fromTo(
        node,
        { attr: { "data-active": i === 0 ? "true" : "false" } },
        { attr: { "data-active": "true" }, duration: 0.01 },
        Math.max(stops[i], 0.001),
      );
    });
  }

  return tl;
}
