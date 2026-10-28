
import gsap from "gsap";

export type ServiceParts = {
  /** Tall wrapper whose sticky child holds the full-screen stage. */
  pin: HTMLElement;
  frame: HTMLElement;
  stage: HTMLElement;
  bgs: HTMLElement[];
  bgImgs: HTMLElement[];
  figs: HTMLElement[];
  copies: HTMLElement[];
  bars: HTMLElement[];
  /** Shared across slides, so it stays put while the copy swaps. */
  explore: HTMLElement;
};

/** Diagonal wipe used for slide transitions. */
export const WIPE_FROM =
  "polygon(135% 0%, 135% 0%, 100% 100%, 100% 100%)";

const WIPE_TO =
  "polygon(0% 0%, 135% 0%, 100% 100%, -35% 100%)";

export const WIPE_SVH = 70;

const wipeStart = () =>
  `bottom-=${(window.innerHeight * WIPE_SVH) / 100} bottom`;

const HOLD = 3;
const SWAP = 3;
const EXIT = 2;

/** Background and figure movement during slide transitions. */
const BG_DRIFT = 4;
const BG_TRAVEL = 100;
const FIG_DRIFT = 8;
const FIG_EXIT = 100;
const FIG_ENTER = 28;

const lines = (copy: HTMLElement) =>
  copy.querySelectorAll<HTMLElement>(".js-cs-line");

const out = { immediateRender: false };

/**
 * Only the individual image cards are revealed from left to right.
 * The stage, heading, copy, and button do not receive this wipe.
 */
export function servicesEntrance(
  { pin, bgImgs, bgs, figs, copies, explore }: ServiceParts,
  reduced: boolean,
) {
  const tl = gsap.timeline({
    defaults: { ease: "power2.out" },
    scrollTrigger: {
      trigger: pin,
      start: "top 20%",
      end: "top top",
      scrub: 1.5,
      invalidateOnRefresh: true,
    },
  });

  if (reduced) {
    tl.fromTo(
      [...lines(copies[0]), explore, figs[0]],
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.4, stagger: 0.08 },
      0,
    );
    return;
  }

  // 1. Reveal the full background image first.
  tl.fromTo(
    bgs[0],
    { clipPath: "inset(0% 100% 0% 0%)" },
    {
      clipPath: "inset(0% 0% 0% 0%)",
      duration: 1.5,
      ease: "power2.inOut",
    },
    0,
  )

    // 2. Settle the background image.
    .fromTo(
      bgImgs[0],
      { scale: 1.15 },
      { scale: 1, duration: 1.2, ease: "power2.out" },
      0,
    )

    // 3. Show the boy only after the background reveal completes.
    .fromTo(
      figs[0],
      { yPercent: 25, autoAlpha: 0 },
      {
        yPercent: 0,
        autoAlpha: 1,
        duration: 0.8,
        ease: "power2.out",
      },
      1.5,
    )

    // 4. Show the heading, description, and Explore button last.
    .fromTo(
      [...lines(copies[0]), explore],
      { y: 30, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        stagger: 0.12,
        duration: 0.6,
        ease: "power3.out",
      },
      2.1,
    );
}

/**
 * Pinned slide sequence:
 * - Each slide holds while its progress bar fills.
 * - The next image card wipes in.
 * - Backgrounds, figures, and text transition as before.
 * - The final frame retains its existing exit animation.
 */
export function servicesSequence(
  p: ServiceParts,
  reduced: boolean,
  onSlide: (index: number) => void,
) {
  const n = p.bgs.length;
  const mids: number[] = [];

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: p.pin,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
      invalidateOnRefresh: true,
    },
  });

  let t = 0;

  for (let i = 0; i < n; i++) {
    tl.fromTo(
      p.bars[i],
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: HOLD + (i < n - 1 ? SWAP : 0),
      },
      t,
    );

    if (!reduced) {
      tl.fromTo(
        p.bgImgs[i],
        { xPercent: 0 },
        {
          xPercent: -BG_DRIFT,
          duration: HOLD,
          ...out,
        },
        t,
      ).fromTo(
        p.figs[i],
        { xPercent: 0 },
        {
          xPercent: -FIG_DRIFT,
          duration: HOLD,
          ...out,
        },
        t,
      );
    }

    t += HOLD;

    if (i === n - 1) break;

    swap(tl, p, i, t, reduced);
    mids.push(t + SWAP / 2);
    t += SWAP;
  }

  const last = n - 1;

  if (reduced) {
    tl.fromTo(
      p.frame,
      { autoAlpha: 1 },
      { autoAlpha: 0, duration: EXIT, ...out },
      t,
    );
  } else {
    // Keep the existing final frame exit unchanged.
    tl.fromTo(
      p.frame,
      { clipPath: "inset(0% 0% 0% 0%)" },
      {
        clipPath: "inset(0% 100% 0% 0%)",
        duration: EXIT,
        ease: "power2.inOut",
        ...out,
      },
      t,
    )
      .set(p.frame, { autoAlpha: 0 }, t + EXIT)
      .fromTo(
        p.bgImgs[last],
        { xPercent: -BG_DRIFT },
        { xPercent: -14, duration: EXIT, ...out },
        t,
      )
      .fromTo(
        p.figs[last],
        { xPercent: -FIG_DRIFT },
        {
          xPercent: -45,
          duration: EXIT,
          ease: "power2.in",
          ...out,
        },
        t,
      );
  }

  let shown = 0;

  tl.eventCallback("onUpdate", () => {
    const index = mids.filter((m) => tl.time() >= m).length;

    if (index !== shown) {
      shown = index;
      onSlide(index);
    }
  });
}

function swap(
  tl: gsap.core.Timeline,
  p: ServiceParts,
  a: number,
  t: number,
  reduced: boolean,
) {
  const b = a + 1;

  if (reduced) {
    tl.fromTo(
      p.bgs[b],
      { clipPath: WIPE_TO, autoAlpha: 0 },
      { autoAlpha: 1, duration: SWAP },
      t,
    )
      .fromTo(
        [p.figs[a], ...lines(p.copies[a])],
        { autoAlpha: 1 },
        {
          autoAlpha: 0,
          duration: SWAP * 0.4,
          ...out,
        },
        t,
      )
      .fromTo(
        [p.figs[b], ...lines(p.copies[b])],
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: SWAP * 0.5,
        },
        t + SWAP * 0.5,
      );

    return;
  }

  // Only the incoming image card gets the diagonal slide-transition wipe.
  tl.fromTo(
    p.bgs[b],
    { clipPath: WIPE_FROM },
    {
      clipPath: WIPE_TO,
      duration: SWAP,
      ease: "power2.inOut",
    },
    t,
  )
    .fromTo(
      p.bgImgs[b],
      { xPercent: BG_TRAVEL },
      {
        xPercent: 0,
        duration: SWAP,
        ease: "power2.inOut",
      },
      t,
    )
    .fromTo(
      p.bgImgs[a],
      { xPercent: -BG_DRIFT },
      {
        xPercent: -BG_TRAVEL,
        duration: SWAP,
        ease: "power2.inOut",
        ...out,
      },
      t,
    )
    .fromTo(
      p.figs[a],
      { xPercent: -FIG_DRIFT },
      {
        xPercent: -FIG_EXIT,
        duration: SWAP * 0.7,
        ease: "power2.in",
        ...out,
      },
      t,
    )
    .set(p.figs[a], { autoAlpha: 0 }, t + SWAP * 0.7)
    .fromTo(
      p.figs[b],
      {
        xPercent: FIG_ENTER,
        scale: 0.94,
        autoAlpha: 0,
      },
      {
        xPercent: 0,
        scale: 1,
        autoAlpha: 1,
        duration: SWAP * 0.6,
        ease: "power2.out",
      },
      t + SWAP * 0.4,
    )
    .fromTo(
      lines(p.copies[a]),
      { y: 0, autoAlpha: 1 },
      {
        y: -40,
        autoAlpha: 0,
        stagger: 0.06,
        duration: 0.35,
        ease: "power2.in",
        ...out,
      },
      t,
    )
    .fromTo(
      lines(p.copies[b]),
      { y: 40, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        stagger: 0.08,
        duration: 0.45,
        ease: "power3.out",
      },
      t + SWAP * 0.5,
    );
}
