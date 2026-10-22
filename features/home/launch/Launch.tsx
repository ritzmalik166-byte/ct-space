"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";
import Link from "next/link";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const MISSION_HREF = "mailto:hello@contenaissance.com?subject=New%20mission";
const PHONE = { label: "+971 4 800 2872", href: "tel:+97148002872" };

/** Progress where the sticky panel locks: the trigger starts when the section enters (100svh of its 300svh). */
const STUCK_AT = 100 / 300;
const LIFT_OFF = 0.8;

export function Launch() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top bottom",
          end: "bottom bottom",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      tl.fromTo(".js-ln-panel", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT)
        .fromTo(".js-ln-glow", { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.14, ease: "power2.out" }, STUCK_AT)
        .fromTo(".js-ln-rocket", { autoAlpha: 0, y: 90 }, { autoAlpha: 1, y: 0, duration: 0.12, ease: "power3.out" }, STUCK_AT + 0.02)
        .fromTo(".js-ln-word", { yPercent: 110 }, { yPercent: 0, duration: 0.07, stagger: 0.02, ease: "power3.out" }, STUCK_AT + 0.08)
        .fromTo(".js-ln-cta", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.06, stagger: 0.025, ease: "power2.out" }, STUCK_AT + 0.16);

      if (!reduced) {
        // Lift-off just before the footer arrives: the rocket leaves along its nose, leaving an exhaust trail.
        const reach = () => Math.max(window.innerWidth, window.innerHeight) * 0.7;
        tl.fromTo(".js-ln-trail", { scaleY: 0 }, { scaleY: 1, duration: 0.08, ease: "power1.in" }, LIFT_OFF)
          .to(".js-ln-rocket", { x: reach, y: () => -reach(), duration: 0.16, ease: "power2.in" }, LIFT_OFF + 0.02)
          .to(".js-ln-glow", { scale: 1.25, duration: 0.16 }, LIFT_OFF)
          .to(".js-ln-trail", { autoAlpha: 0, duration: 0.06 }, LIFT_OFF + 0.12);
      }

      tl.set({}, {}, 1);
    },
    { scope: root },
  );

  return (
    <section
      id="contact"
      ref={root}
      aria-labelledby="launch-title"
      className="pointer-events-none relative -mt-[100svh] h-[300svh]"
    >
      <div className="js-ln-panel invisible sticky top-0 h-svh overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgb(6_8_14/0.6)_0%,rgb(5_6_11/0.9)_70%)]" />
        <div
          aria-hidden
          className="js-ln-glow absolute inset-0 m-auto size-[min(46rem,120vw)] rounded-full bg-[radial-gradient(circle,rgb(255_96_48/0.2)_0%,rgb(120_40_20/0.12)_38%,transparent_68%)]"
        />

        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <div aria-hidden className="js-ln-rocket relative mb-8 sm:mb-10">
            <span className="absolute left-1/2 top-1/2 size-0 rotate-45">
              <span className="js-ln-trail block h-[45svh] w-[3px] origin-top -translate-x-1/2 scale-y-0 rounded-full bg-gradient-to-b from-orange-300 via-orange-500/50 to-transparent blur-[1px]" />
            </span>
            <span className="relative block animate-hover-float text-[clamp(2.6rem,5vw,3.6rem)] leading-none drop-shadow-[0_0_24px_rgb(255_120_60/0.45)]">
              🚀
            </span>
          </div>

          <h2
            id="launch-title"
            className="text-[clamp(2.4rem,6vw,4.6rem)] font-bold leading-[1.05] tracking-[-0.035em] text-white"
          >
            {["Ready", "for", "lift-off?"].map((word) => (
              <span key={word} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
                <span className="js-ln-word inline-block">{word}</span>
                {word !== "lift-off?" && <span>&nbsp;</span>}
              </span>
            ))}
          </h2>

          <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
            <Link
              href={MISSION_HREF}
              className="js-ln-cta pointer-events-auto rounded-full bg-[#ff6b3d] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_36px_-8px_rgb(255_107_61/0.75)] transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-[#ff7d55] hover:shadow-[0_14px_44px_-8px_rgb(255_107_61/0.9)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
            >
              Start a mission
            </Link>
            <Link
              href={PHONE.href}
              className="js-ln-cta pointer-events-auto rounded-full bg-[#070b14] px-7 py-3.5 text-sm text-white/85 ring-1 ring-white/15 transition-colors duration-300 hover:text-white hover:ring-white/35 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
            >
              {PHONE.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
