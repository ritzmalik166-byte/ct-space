import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export type FeatureItem = { li: HTMLElement; card: HTMLElement; tilt: HTMLElement; shine: HTMLElement };

export type FeatureParts = {
  section: HTMLElement;
  panel: HTMLElement;
  items: FeatureItem[];
  cta: { inner: HTMLElement; outer: HTMLElement };
};

const DEPTH = 1200;

/** Reduced motion: a plain fade, no depth or camera-like moves. */
export function simpleEntrance({ section, items, cta }: FeatureParts) {
  gsap.fromTo(
    [...items.map((i) => i.card), cta.inner],
    { autoAlpha: 0 },
    { autoAlpha: 1, stagger: 0.1, scrollTrigger: { trigger: section, start: "top 80%", end: "top 20%", scrub: true } },
  );
}

/**
 * The cards rise out of depth as one fanned, stacked deck and then deal outwards to their slots.
 * On mobile (`fan` false) they only rise, since the row is a horizontal scroller.
 */
export function cardsEntrance({ section, items, cta }: FeatureParts, fan: boolean) {
  const centre = items[1]?.li;
  const tl = gsap.timeline({
    defaults: { ease: "power3.out" },
    scrollTrigger: { trigger: section, start: "top 85%", end: "top 5%", scrub: 1, invalidateOnRefresh: true },
  });

  items.forEach(({ li, card, shine }, i) => {
    const side = i - 1;
    tl.fromTo(
      card,
      { y: 260, z: -700, rotateX: 60, autoAlpha: 0, transformPerspective: DEPTH },
      { y: 0, z: 0, rotateX: 0, autoAlpha: 1, duration: 0.4, ease: "power2.out" },
      0.1 + Math.abs(side) * 0.05,
    );
    if (fan && centre) {
      tl.fromTo(
        card,
        { x: () => centre.offsetLeft - li.offsetLeft, rotateZ: side * 7, rotateY: side * -18 },
        { x: 0, rotateZ: 0, rotateY: 0, duration: 0.35 },
        0.5,
      );
    }
    // The shine rests at -100% (Tailwind translate), so this sweeps it fully across and out.
    tl.fromTo(shine, { xPercent: 0 }, { xPercent: 220, duration: 0.3, ease: "power1.inOut" }, 0.72 + i * 0.06);
  });

  tl.fromTo(cta.inner, { y: 30, scale: 0.8, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.2, ease: "back.out(2)" }, 0.8);
}

/**
 * Hand-off to the next section while the panel is pinned: everything shrinks back and fades out together,
 * then the next section scrolls in.
 */


export function cardsExit({ section, items, cta }: FeatureParts) {
  const targets = [
    ...items.map(({ card }) => card),
    cta.outer,
  ];

  gsap.to(targets, {
    autoAlpha: 0,
    y: -80,
    ease: "none",
    stagger: 0.05,

scrollTrigger: {
  trigger: section,
  start: "top top",
  end: "center top",
  scrub: 0.5,
  invalidateOnRefresh: true,
  onUpdate: (self) => {
    section.toggleAttribute("data-exiting", self.progress > 0.02);
  },
},

  });
}

/** Pointer tilt on fine pointers; paused while the exit has taken over the cards. */
export function bindTilt({ section, items }: FeatureParts) {
  const offs = items.map(({ li, tilt }) => {
    gsap.set(tilt, { transformPerspective: 900 });
    const rx = gsap.quickTo(tilt, "rotationX", { duration: 0.6, ease: "power3.out" });
    const ry = gsap.quickTo(tilt, "rotationY", { duration: 0.6, ease: "power3.out" });
    const leave = () => {
      rx(0);
      ry(0);
    };
    const move = (e: PointerEvent) => {
      if (section.hasAttribute("data-exiting")) return leave();
      const r = li.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 14);
      rx(((e.clientY - r.top) / r.height - 0.5) * -14);
    };
    li.addEventListener("pointermove", move);
    li.addEventListener("pointerleave", leave);
    return () => {
      li.removeEventListener("pointermove", move);
      li.removeEventListener("pointerleave", leave);
    };
  });
  return () => offs.forEach((off) => off());
}
