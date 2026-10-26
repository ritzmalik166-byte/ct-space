import gsap from "gsap";
import { FLOW_STOPS } from "@/features/home/lib/store";
import { CYAN, EXIT_POINT, EXIT_START, isHandover, LAST, ORANGE, POINTS, STUCK_AT } from "./milestones";

/** Gap between the pulse head and each tail dot, so the tail trails behind like a comet. */
const TRAIL = 0.006;

/**
 * One scrubbed timeline across the whole 640svh section: the panel locks, the energy line draws node to
 * node, and after Handover the rocket launches along the beam as the camera follows into the next section.
 */
export function blueprintTimeline(root: HTMLElement, desktop: boolean) {
  const q = gsap.utils.selector(root);
  const stage = q(".js-bp-stage")[0] as HTMLElement;
  const nodes = q(".js-bp-node") as HTMLElement[];
  const texts = q(".js-bp-text") as HTMLElement[];
  const cards = q(".js-bp-card") as HTMLElement[];
  const pulse = q(".js-bp-pulse");

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: root, start: "top bottom", end: "bottom bottom", scrub: 1.1, invalidateOnRefresh: true },
  });

  tl.fromTo(q(".js-bp-panel"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT)
    .fromTo(q(".js-bp-veil"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, STUCK_AT)
    .fromTo(
      q(".js-bp-title"),
      { yPercent: 110, rotate: 3, transformOrigin: "0% 100%" },
      { yPercent: 0, rotate: 0, duration: 0.08, ease: "expo.out" },
      STUCK_AT + 0.01,
    )
    .fromTo(q(".js-bp-fade"), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.05 }, STUCK_AT + 0.04)
    .fromTo(q(".js-bp-ghost"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, STUCK_AT + 0.06);

  // The energy pulse rides each segment as it draws, then merges into the Handover node.
  tl.fromTo(pulse, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, FLOW_STOPS[0])
    .to(pulse, { autoAlpha: 0, duration: 0.015 }, FLOW_STOPS[LAST] - 0.01)
    .fromTo(q(".js-bp-pulse-dot"), { backgroundColor: CYAN }, { backgroundColor: ORANGE, duration: 0.08 }, FLOW_STOPS[LAST - 1]);

  FLOW_STOPS.forEach((stop, i) => {
    const next = FLOW_STOPS[i + 1];
    const node = nodes[i];
    const glow = node.querySelector(".js-bp-glow");

    tl.fromTo(
      node.querySelector(".js-bp-badge"),
      { autoAlpha: 0, scale: 0.3, rotate: -60 },
      { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.035, ease: "back.out(2.2)" },
      stop - 0.015,
    )
      .fromTo(glow, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.025, ease: "power2.out" }, stop)
      // Shockwave as the pulse arrives.
      .to(
        node.querySelector(".js-bp-ring"),
        { keyframes: { opacity: [1, 0], scale: [1.5, isHandover(i) ? 3.4 : 2.6] }, duration: 0.045, ease: "power2.out" },
        stop,
      );

    if (next !== undefined) {
      const a = POINTS[i];
      const b = POINTS[i + 1];
      tl.to(glow, { autoAlpha: 0, duration: 0.02 }, next - 0.01)
        .fromTo(
          q(`.js-bp-seg-${i}`),
          { attr: { x2: a.left, y2: a.top } },
          { attr: { x2: b.left, y2: b.top }, duration: next - stop, ease: "power1.inOut" },
          stop,
        )
        .fromTo(
          pulse,
          { xPercent: a.left, yPercent: a.top },
          { xPercent: b.left, yPercent: b.top, duration: next - stop, ease: "power1.inOut", stagger: TRAIL, immediateRender: i === 0 },
          stop,
        );
    }

    if (desktop) {
      tl.fromTo(
        texts[i].children,
        { autoAlpha: 0, y: 18, clipPath: "inset(0% 0% 100% 0%)" },
        { autoAlpha: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)", duration: 0.04, stagger: 0.012, ease: "power3.out" },
        stop - 0.005,
      );
    } else {
      tl.fromTo(cards[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.03, ease: "power3.out" }, stop - 0.01);
      if (next !== undefined) tl.to(cards[i], { autoAlpha: 0, y: -20, duration: 0.025 }, next - 0.03);
    }
  });

  const handover = POINTS[LAST];
  tl.to(q(".js-bp-head"), { y: -50, autoAlpha: 0, duration: 0.04, ease: "power2.in" }, EXIT_START)
    .to(cards[LAST], { autoAlpha: 0, y: -20, duration: 0.03 }, EXIT_START)
    .to(texts[LAST], { autoAlpha: 0, y: 16, duration: 0.03 }, EXIT_START)
    .fromTo(
      q(".js-bp-ext"),
      { attr: { x2: handover.left, y2: handover.top } },
      { attr: { x2: EXIT_POINT.left, y2: EXIT_POINT.top }, duration: 0.09, ease: "power2.in" },
      EXIT_START + 0.01,
    )
    .to(pulse, { autoAlpha: 1, duration: 0.005 }, EXIT_START + 0.01)
    .fromTo(
      pulse,
      { xPercent: handover.left, yPercent: handover.top },
      { xPercent: EXIT_POINT.left, yPercent: EXIT_POINT.top, duration: 0.09, ease: "power2.in", stagger: TRAIL, immediateRender: false },
      EXIT_START + 0.01,
    )
    // Lift-off: the rocket rides the beam out of frame.
    .to(
      nodes[LAST],
      {
        x: () => (stage.offsetWidth * (EXIT_POINT.left - handover.left)) / 100,
        y: () => (stage.offsetHeight * (EXIT_POINT.top - handover.top)) / 100,
        scale: 1.4,
        duration: 0.09,
        ease: "power2.in",
      },
      EXIT_START + 0.015,
    )
    .to(stage, { xPercent: -28, yPercent: 8, scale: 1.35, autoAlpha: 0, duration: 0.12, ease: "power2.in" }, EXIT_START + 0.03)
    .to(q(".js-bp-veil"), { autoAlpha: 0, duration: 0.1 }, EXIT_START + 0.05)
    .set({}, {}, 1);
}
