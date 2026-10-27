import gsap from "gsap";

type Pose = { xPercent: number; yPercent: number; rotation: number; scale: number; opacity: number };

/** Resting pose by depth in the stack: 0 is the card on top, the rest fan out behind it. */
const POSES: Pose[] = [
  { xPercent: 0, yPercent: 0, rotation: 0, scale: 1, opacity: 1 },
  { xPercent: 22, yPercent: -3, rotation: 8, scale: 0.95, opacity: 0.95 },
  { xPercent: -22, yPercent: 3, rotation: -8, scale: 0.92, opacity: 0.9 },
  { xPercent: 42, yPercent: -6, rotation: 15, scale: 0.88, opacity: 0.75 },
];
/** Off-stage pose the cards deal in from and drop back to. */
const HIDDEN: Pose = { xPercent: 0, yPercent: 120, rotation: -6, scale: 0.9, opacity: 0 };
/** Cards behind the top one are softened; set once per swap, never animated. */
const BEHIND_FILTER = "blur(3px)";

const poseAt = (depth: number) => POSES[Math.min(depth, POSES.length - 1)];

/**
 * A stack of video cards where only the top card plays. Moving to the next step sends the top card out and
 * tucks it in at the back; moving back pulls the last card out and lays it on top again.
 */
export function createDeck(cards: HTMLElement[], reduced: boolean) {
  const n = cards.length;
  const videos = cards.map((card) => card.querySelector("video"));
  let current = -1;

  // Each card takes its film's own proportions, so nothing is cropped or letterboxed.
  const fit = (card: HTMLElement, video: HTMLVideoElement) => {
    if (video.videoWidth && video.videoHeight) card.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
  };
  const offs = videos.map((video, i) => {
    if (!video) return () => {};
    const onMeta = () => fit(cards[i], video);
    onMeta();
    video.addEventListener("loadedmetadata", onMeta);
    return () => video.removeEventListener("loadedmetadata", onMeta);
  });

  const depthOf = (i: number, active: number) => (i - active + n) % n;

  const restack = (active: number, skip = -1) => {
    cards.forEach((card, i) => {
      if (i === skip) return;
      const depth = depthOf(i, active);
      card.style.zIndex = String(n - depth);
      card.style.filter = depth === 0 ? "none" : BEHIND_FILTER;
    });
  };

  const settle = (active: number) => {
    restack(active);
    videos.forEach((video, i) => {
      if (!video) return;
      if (i === active && !reduced) video.play().catch(() => {});
      else video.pause();
    });
  };

  gsap.set(cards, HIDDEN);
  restack(0);

  /** First appearance: the cards deal in one by one, back of the stack first, and the top one starts playing. */
  const enter = (active: number) => {
    restack(active);
    if (reduced) {
      cards.forEach((card, i) => gsap.set(card, poseAt(depthOf(i, active))));
      settle(active);
      return;
    }
    const order = cards.map((_, i) => i).sort((a, b) => depthOf(b, active) - depthOf(a, active));
    const tl = gsap.timeline({ onComplete: () => current >= 0 && settle(current) });
    order.forEach((i, k) => tl.to(cards[i], { ...poseAt(depthOf(i, active)), duration: 0.8, ease: "power3.out" }, k * 0.15));
  };

  const show = (active: number) => {
    if (active === current) return;
    const previous = current;
    current = active;

    if (previous < 0 || reduced) {
      gsap.killTweensOf(cards);
      enter(active);
      return;
    }

    const forward = depthOf(active, previous) <= n / 2;
    // The card that changes ends of the stack: the old top going to the back, or the back card coming to the top.
    const mover = forward ? previous : active;
    gsap.killTweensOf(cards);
    // Restack straight away (also repairs anything a fast scroll interrupted); an outgoing top card stays above
    // and sharp until it is tucked in at the back.
    settle(active);
    if (forward) {
      cards[mover].style.zIndex = String(n + 1);
      cards[mover].style.filter = "none";
    }
    cards.forEach((card, i) => {
      const target = poseAt(depthOf(i, active));
      if (i !== mover) {
        gsap.to(card, { ...target, duration: 0.6, ease: "power3.out" });
        return;
      }
      gsap
      .timeline()
      // Move the outgoing card down and out of view
      .to(card, {
        yPercent: 120,
        xPercent: 0,
        rotation: 0,
        opacity: 0,
        duration: 0.35,
        ease: "power2.in",
      })
      .call(() => restack(current))
      // Reset below the stack
      .set(card, {
        yPercent: 120,
        xPercent: 0,
        opacity: 0,
      })
      // Enter upward from the bottom into its resting position
      .to(card, {
        ...target,
        duration: 0.6,
        ease: "power3.out",
      });
    });
  };

  const stop = () => {
    gsap.killTweensOf(cards);
    videos.forEach((video) => video?.pause());
    current = -1;
  };

  /** Scrolled back above the section: the cards drop away so they can deal in again next time. */
  const hide = () => {
    stop();
    gsap.to(cards, { ...HIDDEN, duration: reduced ? 0 : 0.4, ease: "power2.in" });
  };

  const destroy = () => {
    stop();
    offs.forEach((off) => off());
  };

  return { show, stop, hide, destroy };
}
