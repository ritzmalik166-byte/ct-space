import gsap from "gsap";

/** The section overlaps the previous one by 100svh; the panel locks once that overlap has scrolled past. */
const SECTION_SVH = 340;
const STUCK_AT = 100 / SECTION_SVH;
/** The next section starts entering here. */
const EXIT_START = (SECTION_SVH - 100) / SECTION_SVH;

/**
 * Pages lift off a desk on arrival, the cover images drift while the panel is pinned, and on the way out the
 * two cards close together like a book (side by side) or fold down (stacked on phones) and sink into depth.
 */
export function journalTimeline(root: HTMLElement, sideBySide: boolean) {
  const q = gsap.utils.selector(root);
  const cards = q(".js-jr-card") as HTMLElement[];
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: root, start: "top bottom", end: "bottom bottom", scrub: 1 },
  });

  tl.fromTo(q(".js-jr-panel"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT - 0.02)
    .fromTo(q(".js-jr-veil"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.07 }, STUCK_AT - 0.02)
    .fromTo(
      q(".js-jr-head"),
      { y: 40, rotateX: -70, autoAlpha: 0, transformPerspective: 800, transformOrigin: "50% 100%" },
      { y: 0, rotateX: 0, autoAlpha: 1, duration: 0.07, ease: "power3.out" },
      STUCK_AT - 0.01,
    );

  cards.forEach((card, i) => {
    const side = i === 0 ? -1 : 1;
    const at = STUCK_AT + 0.02 + i * 0.03;
    tl.fromTo(
      card,
      {
        y: 220,
        z: -500,
        rotateX: 55,
        rotateY: sideBySide ? side * -18 : 0,
        autoAlpha: 0,
        transformPerspective: 1400,
        transformOrigin: "50% 100%",
      },
      { y: 0, z: 0, rotateX: 0, rotateY: 0, autoAlpha: 1, duration: 0.12, ease: "power3.out" },
      at,
    )
      .fromTo(
        card.querySelector(".js-jr-frame"),
        { clipPath: "inset(100% 0% 0% 0% round 10px)" },
        { clipPath: "inset(0% 0% 0% 0% round 10px)", duration: 0.09, ease: "power2.inOut" },
        at + 0.03,
      )
      .fromTo(
        card.querySelectorAll(".js-jr-line"),
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.05, stagger: 0.015, ease: "power2.out" },
        at + 0.08,
      );
  });

  // While pinned, the two cards float apart slightly for depth; covers stay uncropped.
  cards.forEach((card, i) => {
    tl.to(card, { y: i === 0 ? -12 : 12, duration: EXIT_START - STUCK_AT - 0.2, ease: "sine.inOut" }, STUCK_AT + 0.18);
  });
  tl.fromTo(q(".js-jr-cta"), { y: 30, scale: 0.85, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.05, ease: "back.out(2)" }, STUCK_AT + 0.12);

  tl.to(q(".js-jr-head"), { y: -50, autoAlpha: 0, duration: 0.06, ease: "power2.in" }, EXIT_START)
    .to(q(".js-jr-cta"), { y: 40, autoAlpha: 0, duration: 0.05, ease: "power2.in" }, EXIT_START);

  if (sideBySide) {
    // Book closing: each card swings toward the viewer around its inner edge, then the closed book sinks away.
    cards.forEach((card, i) => {
      tl.to(card, { rotateY: i === 0 ? 80 : -80, transformOrigin: i === 0 ? "100% 50%" : "0% 50%", duration: 0.09, ease: "power2.in" }, EXIT_START + 0.01);
    });
  } else {
    tl.to(cards, { rotateX: -75, transformOrigin: "50% 0%", duration: 0.09, ease: "power2.in", stagger: 0.02 }, EXIT_START + 0.01);
  }

  tl.to(q(".js-jr-grid"), { z: -700, y: 60, autoAlpha: 0, transformPerspective: 1400, duration: 0.08, ease: "power2.in" }, EXIT_START + 0.06)
    .to(q(".js-jr-veil"), { autoAlpha: 0, duration: 0.1 }, EXIT_START + 0.05)
    .set({}, {}, 1);
}
