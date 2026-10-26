import gsap from "gsap";

/** The trigger starts 100svh before the section top reaches the viewport top, which is where the panel locks. */
const SECTION_SVH = 340;
const STUCK_AT = 100 / SECTION_SVH;
/** The exit (about 50svh long) ends exactly when the next section's panel appears, so no blank scroll is left between them. */
const EXIT_START = (SECTION_SVH - 50) / SECTION_SVH;
const RISE = 80;

/**
 * One motion both ways: on arrival the cards rise from below and fade in to rest, and on the way out they keep
 * rising and fade away, followed by the button.
 */
export function journalTimeline(root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const cards = q(".js-jr-card") as HTMLElement[];
  const cta = q(".js-jr-cta");
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: root, start: "top bottom", end: "bottom bottom", scrub: 1 },
  });

  // The section overlaps the Archive's still-pinned panel by an extra 30svh, so this veil cross-fades over its closing cards.
  tl.fromTo(q(".js-jr-panel"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT - 0.02)
    .fromTo(q(".js-jr-veil"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.09, ease: "power1.inOut" }, STUCK_AT - 0.02)
    .fromTo(cards, { y: RISE, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.1, stagger: 0.03, ease: "power2.out" }, STUCK_AT + 0.02)
    .fromTo(cta, { y: RISE / 2, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.08, ease: "power2.out" }, STUCK_AT + 0.08);

  tl.to(q(".js-jr-head"), { y: -RISE, autoAlpha: 0, duration: 0.06, ease: "power2.in" }, EXIT_START)
    .to(cards, { y: -RISE, autoAlpha: 0, duration: 0.07, stagger: 0.02, ease: "power2.in" }, EXIT_START + 0.01)
    .to(cta, { y: -RISE / 2, autoAlpha: 0, duration: 0.06, ease: "power2.in" }, EXIT_START + 0.03)
    .to(q(".js-jr-veil"), { autoAlpha: 0, duration: 0.1 }, EXIT_START + 0.05)
    .set({}, {}, 1);
}
