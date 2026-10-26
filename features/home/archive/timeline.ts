import gsap from "gsap";

/** The section overlaps the previous one by 100svh; the panel locks once that overlap has scrolled past. */
const SECTION_SVH = 400;
const STUCK_AT = 100 / SECTION_SVH;
/** Scroll window in which the glass rises and the details unfold. */
const REVEAL_START = 0.42;
const REVEAL_END = 0.6;
/** The next section starts entering here. */
const EXIT_START = (SECTION_SVH - 100) / SECTION_SVH;

export const HIDDEN = "inset(100% 0% 0% 0%)";
const FULL = "inset(0% 0% 0% 0%)";

/**
 * Arrival swings the cards in like doors, the reveal raises the glass and unfolds each card's details,
 * and the exit tips the cards back into the floor. `onPlay` reports when the previews should run.
 */
export function archiveTimeline(root: HTMLElement, onPlay: (on: boolean) => void) {
  const q = gsap.utils.selector(root);
  const cells = q(".js-arch-cell") as HTMLElement[];
  const cards = q(".js-arch-card") as HTMLElement[];

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: root,
      start: "top bottom",
      end: "bottom bottom",
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: ({ progress }) => onPlay(progress > STUCK_AT - 0.02 && progress < EXIT_START + 0.06),
      onLeave: () => onPlay(false),
      onLeaveBack: () => onPlay(false),
    },
  });

  tl.fromTo(q(".js-arch-panel"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT - 0.02)
    .fromTo(q(".js-arch-veil"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, STUCK_AT - 0.02)
    .fromTo(
      q(".js-arch-head"),
      { y: 40, rotateX: -70, autoAlpha: 0, transformPerspective: 800, transformOrigin: "50% 100%" },
      { y: 0, rotateX: 0, autoAlpha: 1, duration: 0.06, ease: "power3.out" },
      STUCK_AT - 0.01,
    );

  // Featured card swings in from the left, the stacked pair from the right, each hinged on its inner edge.
  cells.forEach((cell, i) => {
    const side = i === 0 ? -1 : 1;
    tl.fromTo(
      cell,
      {
        x: side * 160,
        z: -420,
        rotateY: side * -38,
        rotateX: i === 1 ? 10 : i === 2 ? -10 : 0,
        autoAlpha: 0,
        transformPerspective: 1400,
        transformOrigin: i === 0 ? "100% 50%" : "0% 50%",
      },
      { x: 0, z: 0, rotateY: 0, rotateX: 0, autoAlpha: 1, duration: 0.1, ease: "power3.out" },
      STUCK_AT + i * 0.025,
    );
  });
  tl.fromTo(q(".js-arch-cta"), { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.04 }, STUCK_AT + 0.08);

  const span = REVEAL_END - REVEAL_START;
  cards.forEach((card, i) => {
    const at = REVEAL_START + i * span * 0.12;
    const title = card.querySelector(".js-arch-title") as HTMLElement;
    const details = card.querySelector(".js-arch-details") as HTMLElement;
    const lines = [...card.querySelectorAll<HTMLElement>(".js-arch-line")];

    tl.fromTo(card.querySelector(".js-arch-glass"), { clipPath: HIDDEN }, { clipPath: FULL, duration: span * 0.6, ease: "power2.inOut" }, at)
      .fromTo(card.querySelector(".js-arch-video"), { scale: 1 }, { scale: 1.12, duration: span, ease: "power1.inOut" }, at);

    if (i === 0) {
      // Until the reveal, the featured title sits where the bottom of the (hidden) details block will be.
      const restingY = () => details.offsetTop + details.offsetHeight - (title.offsetTop + title.offsetHeight);
      tl.fromTo(card.querySelector(".js-arch-strip"), { autoAlpha: 1 }, { autoAlpha: 0, duration: span * 0.4 }, at).fromTo(title, { y: restingY }, { y: 0, duration: span * 0.5, ease: "power3.inOut" }, at + span * 0.15);
    } else {
      lines.unshift(title);
    }

    tl.fromTo(
      lines,
      { y: 16, autoAlpha: 0, clipPath: "inset(0% 0% 100% 0%)" },
      { y: 0, autoAlpha: 1, clipPath: FULL, duration: span * 0.35, stagger: span * 0.08, ease: "power3.out" },
      at + span * 0.35,
    );
  });

  tl.to(q(".js-arch-head"), { y: -40, autoAlpha: 0, duration: 0.05, ease: "power2.in" }, EXIT_START)
    .to(q(".js-arch-cta"), { y: 20, autoAlpha: 0, duration: 0.04 }, EXIT_START)
    .to(
      cells,
      {
        rotateX: 55,
        y: 120,
        z: -300,
        autoAlpha: 0,
        transformOrigin: "50% 100%",
        duration: 0.1,
        ease: "power2.in",
        stagger: { each: 0.015, from: "end" },
      },
      EXIT_START + 0.01,
    )
    .to(q(".js-arch-veil"), { autoAlpha: 0, duration: 0.1 }, EXIT_START + 0.05)
    .set({}, {}, 1);
}

/** Pointer tilt on fine pointers. */
export function bindCardTilt(root: HTMLElement) {
  const offs = (gsap.utils.selector(root)(".js-arch-card") as HTMLElement[]).map((card) => {
    gsap.set(card, { transformPerspective: 1000 });
    const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3.out" });
    const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3.out" });
    const move = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 10);
      rx(((e.clientY - r.top) / r.height - 0.5) * -10);
    };
    const leave = () => {
      rx(0);
      ry(0);
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    return () => {
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
    };
  });
  return () => offs.forEach((off) => off());
}
