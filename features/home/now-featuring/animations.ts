import gsap from "gsap";

export type FeatureItem = { li: HTMLElement; card: HTMLElement; tilt: HTMLElement; shine: HTMLElement };

export type FeatureParts = {
  section: HTMLElement;
  panel: HTMLElement;
  items: FeatureItem[];
  head: { inner: HTMLElement; outer: HTMLElement };
  cta: { inner: HTMLElement; outer: HTMLElement };
  fade: HTMLElement;
};

const DEPTH = 1200;

/** Reduced motion: a plain fade, no depth or camera-like moves. */
export function simpleEntrance({ section, items, head, cta }: FeatureParts) {
  gsap.fromTo(
    [head.inner, ...items.map((i) => i.card), cta.inner],
    { autoAlpha: 0 },
    { autoAlpha: 1, stagger: 0.1, scrollTrigger: { trigger: section, start: "top 80%", end: "top 20%", scrub: true } },
  );
}

/**
 * The cards rise out of depth as one fanned, stacked deck and then deal outwards to their slots.
 * On mobile (`fan` false) they only rise, since the row is a horizontal scroller.
 */
export function cardsEntrance({ section, items, head, cta }: FeatureParts, fan: boolean) {
  const centre = items[1]?.li;
  const tl = gsap.timeline({
    defaults: { ease: "power3.out" },
    scrollTrigger: { trigger: section, start: "top 85%", end: "top 5%", scrub: 1, invalidateOnRefresh: true },
  });

  tl.fromTo(
    head.inner,
    { rotateX: -75, y: 50, autoAlpha: 0, transformPerspective: 800, transformOrigin: "50% 100%" },
    { rotateX: 0, y: 0, autoAlpha: 1, duration: 0.3 },
    0,
  );

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
 * Hand-off to the next section while the panel is pinned: the side cards swing open like doors
 * and the centre film flies forward until it fills the screen.
 */
export function cardsExit({ section, panel, items, head, cta, fade }: FeatureParts) {
  const [left, centre, right] = items;
  if (!left || !centre || !right) return;
  const { li } = centre;
  const cover = () => Math.max(panel.clientWidth / li.offsetWidth, panel.clientHeight / li.offsetHeight) * 1.02;

  gsap
    .timeline({
      defaults: { ease: "none", immediateRender: false },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => section.toggleAttribute("data-exiting", self.progress > 0.02),
      },
    })
    .fromTo(head.outer, { y: 0, autoAlpha: 1 }, { y: -90, autoAlpha: 0, duration: 0.25, ease: "power2.in" }, 0)
    .fromTo(cta.outer, { y: 0, autoAlpha: 1 }, { y: 70, autoAlpha: 0, duration: 0.2, ease: "power2.in" }, 0)
    .fromTo(
      left.li,
      { rotateY: 0, z: 0, autoAlpha: 1, transformPerspective: DEPTH, transformOrigin: "0% 50%" },
      { rotateY: 82, z: -200, autoAlpha: 0, duration: 0.45, ease: "power2.in" },
      0.05,
    )
    .fromTo(
      right.li,
      { rotateY: 0, z: 0, autoAlpha: 1, transformPerspective: DEPTH, transformOrigin: "100% 50%" },
      { rotateY: -82, z: -200, autoAlpha: 0, duration: 0.45, ease: "power2.in" },
      0.05,
    )
    .fromTo(
      li,
      { x: 0, y: 0, scale: 1 },
      {
        x: () => panel.clientWidth / 2 - (li.offsetLeft + li.offsetWidth / 2),
        y: () => panel.clientHeight / 2 - (li.offsetTop + li.offsetHeight / 2),
        scale: cover,
        duration: 0.7,
        ease: "power2.inOut",
      },
      0.15,
    )
    .fromTo(centre.tilt, { clipPath: "inset(0% round 10px)" }, { clipPath: "inset(0% round 0px)", duration: 0.3 }, 0.55)
    .fromTo(fade, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0.75);
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
