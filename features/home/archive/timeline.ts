import gsap from "gsap";

/** The section overlaps the previous one by 100svh; the panel locks once that overlap has scrolled past. */
const SECTION_SVH = 400;
const STUCK_AT = 100 / SECTION_SVH;
/** Arrival: the featured card opens first, then each small card in turn. */
const OPEN_START = STUCK_AT;
const OPEN_SPAN = 0.12;
const SIDE_START = STUCK_AT + 0.08;
const SIDE_GAP = 0.05;
const PLAY_FROM = OPEN_START + OPEN_SPAN * 0.8;
/** Scroll window in which the glass rises and the details unfold. */
const REVEAL_START = 0.52;
const REVEAL_END = 0.72;
/** The button below the cards appears once card animation finishes. */
const CTA_START = REVEAL_END + 0.03;
const CTA_DURATION = 0.1;

export const HIDDEN = "inset(100% 0% 0% 0%)";
const FULL = "inset(0% 0% 0% 0%)";
const CLOSED_DOWN = "inset(0% 0% 100% 0%)";
const CLOSED_RIGHT = "inset(0% 100% 0% 0%)";

/**
 * Arrival opens the cards with scroll-scrubbed wipes and the reveal raises the glass and unfolds each card's details.
 * The button appears after the cards finish animating, leaving the section assembled for normal scrolling to the next section.
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
      scrub: 1.5,
      invalidateOnRefresh: true,
      // Previews start once the featured card is mostly open, so video decoding never competes with the wipes.
      onUpdate: ({ progress }) => onPlay(progress > PLAY_FROM),
      onLeave: () => onPlay(false),
      onLeaveBack: () => onPlay(false),
    },
  });

  tl.fromTo(q(".js-arch-panel"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT - 0.02)
    .fromTo(q(".js-arch-veil"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, STUCK_AT - 0.02);

  // The featured card opens from its top edge down; the small cards are wiped open left to right, one after another.
  cells.forEach((cell, i) => {
    const featured = i === 0;
    const at = featured ? OPEN_START : SIDE_START + (i - 1) * SIDE_GAP;
    tl.fromTo(cell, { clipPath: featured ? CLOSED_DOWN : CLOSED_RIGHT }, { clipPath: FULL, duration: OPEN_SPAN, ease: "sine.inOut" }, at).fromTo(
      cards[i],
      featured ? { yPercent: -8, scale: 1.18 } : { xPercent: -18, scale: 1.08 },
      { yPercent: 0, xPercent: 0, scale: 1, duration: OPEN_SPAN * 1.3, ease: "power2.out", force3D: true },
      at,
    );
  });

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
      { y: 0, autoAlpha: 1, clipPath: FULL, duration: span * 0.4, stagger: span * 0.08, ease: "power2.out" },
      at + span * 0.35,
    );
  });

  // The button below the section appears after the card animation finishes.
  tl.fromTo(
    q(".js-arch-cta"),
    {
      y: 35,
      autoAlpha: 0,
      scale: 0.96,
    },
    {
      y: 0,
      autoAlpha: 1,
      scale: 1,
      duration: CTA_DURATION,
      ease: "power3.out",
    },
    CTA_START,
  );

  tl.set({}, {}, 1);
}

/** Pointer tilt on fine pointers. */
export function bindCardTilt(root: HTMLElement) {
  const offs = (gsap.utils.selector(root)(".js-arch-card") as HTMLElement[]).map((card) => {
    gsap.set(card, { transformPerspective: 1000 });
    const rx = gsap.quickTo(card, "rotationX", { duration: 0.9, ease: "power2.out" });
    const ry = gsap.quickTo(card, "rotationY", { duration: 0.9, ease: "power2.out" });
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
