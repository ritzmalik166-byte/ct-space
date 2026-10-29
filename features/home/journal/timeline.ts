
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/media";

gsap.registerPlugin(ScrollTrigger);

export function journalTimeline(root: HTMLElement): () => void {
  const reduced = prefersReducedMotion();
  const q = gsap.utils.selector(root);

  const heading = q(".js-jr-head");
  const grid = q(".js-jr-grid")[0] as HTMLElement | undefined;
  const cards = q(".js-jr-card") as HTMLElement[];
  const frames = q(".js-jr-frame");
  const lines = q(".js-jr-line");
  const cta = q(".js-jr-cta");
  const orbs = q(".js-jr-orb");
  const imgs = q(".js-jr-img");

  // Respect reduced-motion preferences.
  if (reduced) {
    gsap.set([...heading, ...cards, ...frames, ...lines, ...cta], {
      clearProps: "all",
    });

    return () => {};
  }

  // 1. Ambient floating glow orbs
  const orbTweens: gsap.core.Tween[] = [];

  if (orbs[0]) {
    orbTweens.push(
      gsap.to(orbs[0], {
        x: 30,
        y: -25,
        scale: 1.1,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      }),
    );
  }

  if (orbs[1]) {
    orbTweens.push(
      gsap.to(orbs[1], {
        x: -35,
        y: 20,
        scale: 1.08,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 1,
      }),
    );
  }

  // 2. Heading entrance when the Journal section arrives
  const headingTl = gsap.timeline({
    scrollTrigger: {
      trigger: root,
      start: "top 75%",
      toggleActions: "play none none reverse",
    },
  });

  headingTl.fromTo(
    heading,
    {
      y: 30,
      autoAlpha: 0,
      filter: "blur(5px)",
    },
    {
      y: 0,
      autoAlpha: 1,
      filter: "blur(0px)",
      duration: 0.85,
      ease: "power3.out",
      clearProps: "filter",
    },
  );

  // 3. Sequential card entrance
  // First card rises from below, then the second follows.
  const cardsTl = gsap.timeline({
    scrollTrigger: {
      trigger: grid ?? root,
      start: "top 80%",
      toggleActions: "play none none reverse",
    },
  });

  cardsTl.fromTo(
    cards,
    {
      y: 110,
      autoAlpha: 0,
      scale: 0.95,
      rotateX: 5,
      filter: "blur(6px)",
    },
    {
      y: 0,
      autoAlpha: 1,
      scale: 1,
      rotateX: 0,
      filter: "blur(0px)",
      duration: 1.15,
      stagger: 0.45,
      ease: "power3.out",
      clearProps: "filter",
    },
  );

  // 4. Card image reveal
  cardsTl.fromTo(
    frames,
    {
      clipPath: "inset(10% 0% 0% 0% round 14px)",
      scale: 1.04,
    },
    {
      clipPath: "inset(0% 0% 0% 0% round 14px)",
      scale: 1,
      duration: 1,
      stagger: 0.16,
      ease: "power3.out",
    },
    "-=0.8",
  );

  // 5. Staggered text reveal
  cardsTl.fromTo(
    lines,
    {
      y: 18,
      autoAlpha: 0,
    },
    {
      y: 0,
      autoAlpha: 1,
      duration: 0.65,
      stagger: 0.06,
      ease: "power2.out",
    },
    "-=0.55",
  );

  // 6. View all stories button
  cardsTl.fromTo(
    cta,
    {
      y: 25,
      autoAlpha: 0,
      scale: 0.95,
    },
    {
      y: 0,
      autoAlpha: 1,
      scale: 1,
      duration: 0.7,
      ease: "power3.out",
    },
    "-=0.25",
  );

  // 7. Image-only parallax while scrolling.
  // Card positions are deliberately not changed here.
  let scrubTrigger: ScrollTrigger | undefined;

  if (cards.length >= 2 && imgs.length) {
    scrubTrigger = ScrollTrigger.create({
      trigger: root,
      start: "top bottom",
      end: "bottom top",
      scrub: 1.2,
      onUpdate: (self) => {
        const progress = self.progress - 0.5;

        imgs.forEach((img) => {
          gsap.set(img, {
            yPercent: progress * 14,
          });
        });
      },
    });
  }

  // 8. Interactive 3D tilt, spotlight and magnetic arrow
  const cleanups: (() => void)[] = [];

  cards.forEach((card) => {
    const inner = card.querySelector(
      ".js-jr-card-inner",
    ) as HTMLElement | null;

    const spotlight = card.querySelector(
      ".js-jr-spotlight",
    ) as HTMLElement | null;

    const arrow = card.querySelector(
      ".js-jr-arrow",
    ) as HTMLElement | null;

    if (!inner) return;

    gsap.set(inner, {
      transformPerspective: 1200,
      transformStyle: "preserve-3d",
    });

    const rx = gsap.quickTo(inner, "rotationX", {
      duration: 0.5,
      ease: "power2.out",
    });

    const ry = gsap.quickTo(inner, "rotationY", {
      duration: 0.5,
      ease: "power2.out",
    });

    const rz = gsap.quickTo(inner, "z", {
      duration: 0.5,
      ease: "power2.out",
    });

    const arrowX = arrow
      ? gsap.quickTo(arrow, "x", {
          duration: 0.4,
          ease: "power2.out",
        })
      : null;

    const arrowY = arrow
      ? gsap.quickTo(arrow, "y", {
          duration: 0.4,
          ease: "power2.out",
        })
      : null;

    const onPointerMove = (e: PointerEvent) => {
      const rect = inner.getBoundingClientRect();

      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;

      // Subtle 3D movement
      rx(-py * 12);
      ry(px * 12);
      rz(12);

      // Cursor spotlight
      const mouseX = Math.round(
        ((e.clientX - rect.left) / rect.width) * 100,
      );

      const mouseY = Math.round(
        ((e.clientY - rect.top) / rect.height) * 100,
      );

      inner.style.setProperty("--mouse-x", `${mouseX}%`);
      inner.style.setProperty("--mouse-y", `${mouseY}%`);

      if (spotlight) {
        gsap.to(spotlight, {
          autoAlpha: 1,
          duration: 0.25,
          overwrite: "auto",
        });
      }

      // Magnetic arrow
      if (arrowX && arrowY) {
        arrowX(px * 12);
        arrowY(py * 12);
      }
    };

    const onPointerLeave = () => {
      rx(0);
      ry(0);
      rz(0);

      if (arrowX && arrowY) {
        arrowX(0);
        arrowY(0);
      }

      if (spotlight) {
        gsap.to(spotlight, {
          autoAlpha: 0,
          duration: 0.45,
          overwrite: "auto",
        });
      }
    };

    card.addEventListener("pointermove", onPointerMove);
    card.addEventListener("pointerleave", onPointerLeave);

    cleanups.push(() => {
      card.removeEventListener("pointermove", onPointerMove);
      card.removeEventListener("pointerleave", onPointerLeave);
    });
  });

  // 9. Cleanup
  return () => {
    headingTl.scrollTrigger?.kill();
    headingTl.kill();

    cardsTl.scrollTrigger?.kill();
    cardsTl.kill();

    scrubTrigger?.kill();

    orbTweens.forEach((tween) => tween.kill());

    cleanups.forEach((cleanup) => cleanup);
  };
}
