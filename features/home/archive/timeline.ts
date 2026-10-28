import gsap from "gsap";

/** The section overlaps the previous one by 100svh; the panel locks once that overlap has scrolled past. */
const SECTION_SVH = 550;
const STUCK_AT = 100 / SECTION_SVH;

// Arrival: Panel and veil fade in as Archive overlaps previous section
const PANEL_IN_START = STUCK_AT - 0.03;

// 1. Card Openings (Sequential: featured card first, then side cards)
const OPEN_SPAN = 0.055;
const CARD_TRANSFORM_SPAN = OPEN_SPAN * 1.25;
const OPEN_FEATURED = STUCK_AT;
const OPEN_SIDE_1 = OPEN_FEATURED + 0.055;
const OPEN_SIDE_2 = OPEN_SIDE_1 + 0.050;
const PLAY_FROM = OPEN_FEATURED + OPEN_SPAN * 0.8;

// 2. Content Reveal: Once all cards are visible, keep them pinned while additional scrolling reveals titles, descriptions, stats, CTA
const REVEAL_START = 0.380;
const GLASS_SPAN = 0.055;
const VIDEO_SPAN = 0.090;
const TEXT_SPAN = 0.045;
const CTA_START = 0.450;
const CTA_SPAN = 0.055;

// 3. Pinned Reading Hold
const HOLD_END = 0.630;

// 4. Content Hide: On further scrolling, hide content first
const HIDE_START = HOLD_END;
const CTA_HIDE_SPAN = 0.040;
const TEXT_HIDE_SPAN = 0.045;
const GLASS_HIDE_SPAN = 0.050;
const VIDEO_HIDE_SPAN = 0.060;

// 5. Card Closing in Reverse Reveal Order: using exact reverse of their opening wipe animations
const CLOSE_SPAN = 0.055;
const CLOSE_TRANSFORM_SPAN = CLOSE_SPAN * 1.25;
const CLOSE_SIDE_2 = 0.720;
const CLOSE_SIDE_1 = 0.770;
const CLOSE_FEATURED = 0.825;
const ALL_CLOSED_AT = CLOSE_FEATURED + CLOSE_TRANSFORM_SPAN;

// 6. Transition to Journal: Only after every card is fully closed should the next Journal section appear
const EXIT_START = 0.910;

export const HIDDEN = "inset(100% 0% 0% 0%)";
const FULL = "inset(0% 0% 0% 0%)";
const CLOSED_DOWN = "inset(0% 0% 100% 0%)";
const CLOSED_RIGHT = "inset(0% 100% 0% 0%)";

/**
 * Arrival opens the cards with scroll-scrubbed wipes: first featured, then side cards sequentially.
 * Pinned while additional scrolling reveals their titles, descriptions, stats, and CTA.
 * On further scrolling, content hides first, then all cards close in reverse reveal order.
 * Only after every card is fully closed does the next Journal section appear.
 */
export function archiveTimeline(root: HTMLElement, onPlay: (on: boolean) => void) {
  const q = gsap.utils.selector(root);
  const cells = q(".js-arch-cell") as HTMLElement[];
  const cards = q(".js-arch-card") as HTMLElement[];
  const cta = q(".js-arch-cta") as HTMLElement[];
  const panel = q(".js-arch-panel") as HTMLElement[];
  const veil = q(".js-arch-veil") as HTMLElement[];
  const heading = q(".js-arch-head") as HTMLElement[];

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: root,
      start: "top bottom",
      end: "bottom bottom",
      scrub: 1.2,
      invalidateOnRefresh: true,
      onUpdate: ({ progress }) => onPlay(progress > PLAY_FROM && progress < ALL_CLOSED_AT),
      onLeave: () => onPlay(false),
      onLeaveBack: () => onPlay(false),
    },
  });

  // Panel entrance
  tl.fromTo(panel, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, PANEL_IN_START)
    .fromTo(veil, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05 }, PANEL_IN_START);

  // 1. Sequential Card Openings: featured card first, then side cards
  if (cells[0] && cards[0]) {
    tl.fromTo(
      cells[0],
      { clipPath: CLOSED_DOWN },
      { clipPath: FULL, duration: OPEN_SPAN, ease: "sine.inOut" },
      OPEN_FEATURED,
    ).fromTo(
      cards[0],
      { yPercent: -8, scale: 1.18 },
      { yPercent: 0, xPercent: 0, scale: 1, duration: CARD_TRANSFORM_SPAN, ease: "power2.out", force3D: true },
      OPEN_FEATURED,
    );
  }

  const sideOpenStarts = [OPEN_SIDE_1, OPEN_SIDE_2];
  for (let i = 1; i < cells.length; i++) {
    const at = sideOpenStarts[i - 1] ?? (OPEN_SIDE_2 + (i - 2) * 0.05);
    tl.fromTo(
      cells[i],
      { clipPath: CLOSED_RIGHT },
      { clipPath: FULL, duration: OPEN_SPAN, ease: "sine.inOut" },
      at,
    ).fromTo(
      cards[i],
      { xPercent: -18, scale: 1.08 },
      { yPercent: 0, xPercent: 0, scale: 1, duration: CARD_TRANSFORM_SPAN, ease: "power2.out", force3D: true },
      at,
    );
  }

  // 2. Content Reveal: glass, video zoom, titles, descriptions, stats, CTA
  const glasses = q(".js-arch-glass");
  const videos = q(".js-arch-video");

  tl.fromTo(
    glasses,
    { clipPath: HIDDEN },
    { clipPath: FULL, duration: GLASS_SPAN, stagger: 0.015, ease: "power2.inOut" },
    REVEAL_START,
  ).fromTo(
    videos,
    { scale: 1 },
    { scale: 1.12, duration: VIDEO_SPAN, ease: "power1.inOut" },
    REVEAL_START,
  );

  const allCardTexts: HTMLElement[][] = cards.map((card) => {
    const title = card.querySelector(".js-arch-title") as HTMLElement | null;
    const lines = Array.from(card.querySelectorAll<HTMLElement>(".js-arch-line"));
    return [title, ...lines].filter(Boolean) as HTMLElement[];
  });

  allCardTexts.forEach((items, i) => {
    const at = REVEAL_START + 0.015 + i * 0.025;
    tl.fromTo(
      items,
      { y: 16, autoAlpha: 0, clipPath: "inset(0% 0% 100% 0%)" },
      { y: 0, autoAlpha: 1, clipPath: FULL, duration: TEXT_SPAN, stagger: 0.012, ease: "power2.out" },
      at,
    );
  });

  // CTA button reveal after card content unfolds
  tl.fromTo(
    cta,
    { y: 24, autoAlpha: 0, scale: 0.96 },
    { y: 0, autoAlpha: 1, scale: 1, duration: CTA_SPAN, ease: "power3.out", immediateRender: true },
    CTA_START,
  );

  tl.set([...cards, ...cta], { pointerEvents: "auto" }, CTA_START + CTA_SPAN * 0.5);

  // 4. Content Hide: hide content first (CTA, text, glass, video zoom)
  tl.set([...cards, ...cta], { pointerEvents: "none" }, HIDE_START);

  tl.to(
    cta,
    { y: 24, autoAlpha: 0, scale: 0.96, duration: CTA_HIDE_SPAN, ease: "power2.in" },
    HIDE_START,
  );

  const flatTextList = allCardTexts.flat();
  tl.to(
    flatTextList,
    { y: 16, autoAlpha: 0, clipPath: "inset(0% 0% 100% 0%)", duration: TEXT_HIDE_SPAN, stagger: 0.006, ease: "power2.in" },
    HIDE_START + 0.01,
  );

  tl.to(
    glasses,
    { clipPath: HIDDEN, duration: GLASS_HIDE_SPAN, ease: "power2.inOut" },
    HIDE_START + 0.025,
  ).to(
    videos,
    { scale: 1, duration: VIDEO_HIDE_SPAN, ease: "power1.inOut" },
    HIDE_START + 0.015,
  );

  // 5. Close all cards in reverse reveal order using exact reverse of opening wipe animations
  for (let i = cells.length - 1; i >= 1; i--) {
    const closeIndex = (cells.length - 1) - i;
    const at = CLOSE_SIDE_2 + closeIndex * 0.050;
    tl.to(
      cells[i],
      { clipPath: CLOSED_RIGHT, duration: CLOSE_SPAN, ease: "sine.inOut" },
      at,
    ).to(
      cards[i],
      { xPercent: -18, scale: 1.08, duration: CLOSE_TRANSFORM_SPAN, ease: "power2.in", force3D: true },
      at,
    );
  }

  if (cells[0] && cards[0]) {
    tl.to(
      cells[0],
      { clipPath: CLOSED_DOWN, duration: CLOSE_SPAN, ease: "sine.inOut" },
      CLOSE_FEATURED,
    ).to(
      cards[0],
      { yPercent: -8, scale: 1.18, duration: CLOSE_TRANSFORM_SPAN, ease: "power2.in", force3D: true },
      CLOSE_FEATURED,
    );
  }

  // 6. Transition to Journal: heading & veil fade out before Journal appears
  tl.to(
    heading,
    { autoAlpha: 0, y: -20, duration: 0.045, ease: "power2.in" },
    EXIT_START,
  ).to(
    veil,
    { autoAlpha: 0, duration: 0.045 },
    EXIT_START + 0.01,
  ).to(
    panel,
    { autoAlpha: 0, duration: 0.015 },
    EXIT_START + 0.045,
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
