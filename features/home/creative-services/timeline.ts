import gsap from "gsap";

export type ServiceParts = {
  head: HTMLElement;
  /** Tall wrapper whose sticky child holds the full-screen stage. */
  pin: HTMLElement;
  frame: HTMLElement;
  stage: HTMLElement;
  bgs: HTMLElement[];
  bgImgs: HTMLElement[];
  figs: HTMLElement[];
  copies: HTMLElement[];
  bars: HTMLElement[];
};

/** Diagonal wipe that leans with the stage's shadow bands. */
export const WIPE_FROM = "polygon(135% 0%, 135% 0%, 100% 100%, 100% 100%)";
const WIPE_TO = "polygon(0% 0%, 135% 0%, 100% 100%, -35% 100%)";

const HOLD = 0.7;
const SWAP = 1;
const EXIT = 1.2;
/** Parallax depths: background drifts least, figure most, so the layers separate as they travel left. */
const BG_DRIFT = 4;
const BG_TRAVEL = 35;
const FIG_DRIFT = 8;
const FIG_TRAVEL = 110;

const lines = (copy: HTMLElement) => copy.querySelectorAll<HTMLElement>(".js-cs-line");
const out = { immediateRender: false };

/** Scroll-in: the stage opens from a rounded window while the first slide settles into place. */
export function servicesEntrance({ head, pin, stage, bgImgs, figs, copies }: ServiceParts, reduced: boolean) {
  gsap.fromTo(
    head,
    { y: 50, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, ease: "power2.out", scrollTrigger: { trigger: head, start: "top 90%", end: "top 55%", scrub: 1 } },
  );
  const tl = gsap.timeline({
    defaults: { ease: "power2.out" },
    scrollTrigger: { trigger: pin, start: "top bottom", end: "top top", scrub: 1 },
  });
  tl.fromTo(
    lines(copies[0]),
    { y: 40, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.4, ease: "power3.out" },
    0.5,
  );
  if (reduced) return;
  tl.fromTo(stage, { clipPath: "inset(14% 10% 14% 10% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1 }, 0)
    .fromTo(bgImgs[0], { scale: 1.25 }, { scale: 1, duration: 1 }, 0)
    .fromTo(figs[0], { yPercent: 25, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7 }, 0.3);
}

/**
 * The pinned scroll story: each slide holds (drifting left, its progress bar filling), then the next one
 * wipes in diagonally while background and figure leave at different speeds. Ends by tilting the whole
 * stage back into the page as the next section arrives. `onSlide` fires when the visible slide changes.
 */
export function servicesSequence(p: ServiceParts, reduced: boolean, onSlide: (index: number) => void) {
  const n = p.bgs.length;
  const mids: number[] = [];
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: p.pin, start: "top top", end: "bottom bottom", scrub: 1 },
  });

  let t = 0;
  for (let i = 0; i < n; i++) {
    tl.fromTo(p.bars[i], { scaleX: 0 }, { scaleX: 1, duration: HOLD + (i < n - 1 ? SWAP : 0) }, t);
    if (!reduced) {
      tl.fromTo(p.bgImgs[i], { xPercent: 0 }, { xPercent: -BG_DRIFT, duration: HOLD, ...out }, t).fromTo(
        p.figs[i],
        { xPercent: 0 },
        { xPercent: -FIG_DRIFT, duration: HOLD, ...out },
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
    tl.fromTo(p.frame, { autoAlpha: 1 }, { autoAlpha: 0, duration: EXIT, ...out }, t);
  } else {
    tl.fromTo(
      p.frame,
      { rotateX: 0, scale: 1, y: 0, clipPath: "inset(0% round 0px)", transformPerspective: 1200, transformOrigin: "50% 100%" },
      { rotateX: 24, scale: 0.84, y: -40, clipPath: "inset(0% round 32px)", duration: EXIT, ease: "power2.in", ...out },
      t,
    )
      .fromTo(p.frame, { autoAlpha: 1 }, { autoAlpha: 0, duration: EXIT * 0.4, ...out }, t + EXIT * 0.6)
      .fromTo(p.bgImgs[last], { xPercent: -BG_DRIFT }, { xPercent: -14, duration: EXIT, ...out }, t)
      .fromTo(p.figs[last], { xPercent: -FIG_DRIFT }, { xPercent: -45, duration: EXIT, ease: "power2.in", ...out }, t);
  }

  let shown = 0;
  tl.eventCallback("onUpdate", () => {
    const index = mids.filter((m) => tl.time() >= m).length;
    if (index !== shown) onSlide((shown = index));
  });
}

function swap(tl: gsap.core.Timeline, p: ServiceParts, a: number, t: number, reduced: boolean) {
  const b = a + 1;

  if (reduced) {
    tl.fromTo(p.bgs[b], { clipPath: WIPE_TO, autoAlpha: 0 }, { autoAlpha: 1, duration: SWAP }, t)
      .fromTo([p.figs[a], ...lines(p.copies[a])], { autoAlpha: 1 }, { autoAlpha: 0, duration: SWAP * 0.4, ...out }, t)
      .fromTo([p.figs[b], ...lines(p.copies[b])], { autoAlpha: 0 }, { autoAlpha: 1, duration: SWAP * 0.5 }, t + SWAP * 0.5);
    return;
  }

  tl.fromTo(p.bgs[b], { clipPath: WIPE_FROM }, { clipPath: WIPE_TO, duration: SWAP, ease: "power2.inOut" }, t)
    .fromTo(p.bgImgs[b], { xPercent: BG_TRAVEL, scale: 1.1 }, { xPercent: 0, scale: 1, duration: SWAP, ease: "power2.out" }, t)
    .fromTo(p.bgImgs[a], { xPercent: -BG_DRIFT }, { xPercent: -BG_TRAVEL, duration: SWAP, ease: "power2.in", ...out }, t)
    .fromTo(
      p.figs[a],
      { xPercent: -FIG_DRIFT, rotate: 0, autoAlpha: 1 },
      { xPercent: -FIG_TRAVEL, rotate: -4, autoAlpha: 0, duration: SWAP * 0.7, ease: "power2.in", ...out },
      t,
    )
    .fromTo(
      p.figs[b],
      { xPercent: FIG_TRAVEL, rotate: 5, autoAlpha: 0 },
      { xPercent: 0, rotate: 0, autoAlpha: 1, duration: SWAP * 0.75, ease: "power3.out" },
      t + SWAP * 0.25,
    )
    .fromTo(
      lines(p.copies[a]),
      { y: 0, autoAlpha: 1 },
      { y: -40, autoAlpha: 0, stagger: 0.06, duration: 0.35, ease: "power2.in", ...out },
      t,
    )
    .fromTo(
      lines(p.copies[b]),
      { y: 40, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.45, ease: "power3.out" },
      t + SWAP * 0.5,
    );
}
