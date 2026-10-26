"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { canHover, prefersReducedMotion } from "@/lib/media";
import { RotatingWords } from "./components/RotatingWords";
import { HERO_VIDEO_SRC, INTRO_DONE_EVENT, scene } from "../lib/store";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const HEADLINE = ["We", "Build", "AI", "That", "Actually", "Ships."];
/** Share of the hero's scroll by which the copy has fully faded; matches the Navbar's COMPACT_AT. */
const HIDE_BY = 0.2;

/**
 * The video itself lives in the shared 3D canvas (`HeroShatter`): it assembles from flying tiles on load
 * and shatters past the camera while this section is pinned. This component owns the copy and overlays.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const reduced = prefersReducedMotion();
      const section = root.current;

      // Entrance: the video settles in from a slight zoom while the words flip up in 3D.
      const intro = gsap.timeline({ defaults: { ease: "power3.out" }, paused: !scene.introDone });
      if (reduced) {
        intro.fromTo([".js-hero-video", ".js-word", ".js-fade", ".js-hero-cue"], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 });
      } else {
        intro
          .fromTo(".js-hero-video", { autoAlpha: 0, scale: 1.12 }, { autoAlpha: 1, scale: 1, duration: 2.2 }, 0)
          .fromTo(
            ".js-word",
            { yPercent: 100, rotateX: -85, autoAlpha: 0, transformOrigin: "50% 100%" },
            { yPercent: 0, rotateX: 0, autoAlpha: 1, duration: 1.3, stagger: 0.08, ease: "expo.out" },
            1.1,
          )
          .fromTo(".js-fade-text", { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1 }, 1.6)
          .fromTo(".js-fade-cta", { scale: 0.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.9, ease: "back.out(2.2)" }, 1.85)
          .fromTo(".js-hero-cue", { y: -12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8 }, 2.2);
      }
      const start = contextSafe!(() => intro.play());
      window.addEventListener(INTRO_DONE_EVENT, start, { once: true });

      // While pinned, the next section slides up from below (its -100svh margin). The copy is gone within the first
      // HIDE_BY of that, then the hero's height shrinks from the bottom in lockstep with the section's top edge: the
      // panel is clipped by the covered share and its contents shift up by half of it, staying centred. Unsmoothed so
      // neither the copy nor the edge lags the scroll.
      gsap
        .timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: true } })
        .to(".js-hero-cue", { autoAlpha: 0, duration: HIDE_BY * 0.4 }, 0)
        .to(".js-hero-sub", { y: reduced ? 0 : 40, autoAlpha: 0, duration: HIDE_BY * 0.8, ease: "power1.in" }, 0)
        .to(".js-hero-title", { y: reduced ? 0 : -30, autoAlpha: 0, duration: HIDE_BY, ease: "power1.in" }, 0)
        .fromTo(".js-hero-panel", { clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 100% 0%)", duration: 1 }, 0)
        .fromTo(".js-hero-shift", { yPercent: 0 }, { yPercent: -50, duration: 1 }, 0);

      // Play only while the hero is uncovered, and never with reduced motion.
      const media = video.current;
      if (media && !reduced) {
        ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "50% top",
          onToggle: ({ isActive }) => (isActive ? media.play().catch(() => {}) : media.pause()),
        });
      }

      // The glow only tracks the pointer while it is over the hero, and never on touch screens.
      let onMove: ((e: PointerEvent) => void) | undefined;
      if (canHover() && !reduced && section) {
        const xTo = gsap.quickTo(glow.current, "x", { duration: 0.9, ease: "power3" });
        const yTo = gsap.quickTo(glow.current, "y", { duration: 0.9, ease: "power3" });
        onMove = contextSafe!((e: PointerEvent) => {
          xTo(e.clientX);
          yTo(e.clientY);
        });
        section.addEventListener("pointermove", onMove, { passive: true });
      }

      return () => {
        if (onMove) section?.removeEventListener("pointermove", onMove);
        window.removeEventListener(INTRO_DONE_EVENT, start);
      };
    },
    { scope: root },
  );

  return (
    <section id="hero" ref={root} className="relative h-[200svh]">
      <div className="js-hero-panel sticky top-0 h-svh overflow-hidden">
        <div className="js-hero-shift relative isolate flex size-full flex-col">
          <div aria-hidden className="js-hero-media absolute inset-0 -z-20">
            <video
              ref={video}
              src={HERO_VIDEO_SRC}
              muted
              loop
              playsInline
              preload="auto"
              className="js-hero-video invisible size-full object-cover"
            />
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgb(5_6_11/0.2)_0%,rgb(5_6_11/0.55)_70%,rgb(5_6_11/0.8)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-space to-transparent" />
          </div>

          <div
            ref={glow}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 -z-10 size-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(253_230_138/0.06),transparent_65%)]"
          />

          <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pb-16 pt-28 text-center lg:px-10">
            <h1 className="js-hero-title font-heading text-[clamp(2.4rem,5.6vw,70px)] font-bold capitalize leading-none tracking-normal text-white [perspective:900px] [text-shadow:0_4px_40px_rgb(0_0_0/0.45)]">
              {HEADLINE.map((word) => (
                <span key={word} className="mr-[0.22em] inline-block pb-[0.1em] align-top last:mr-0">
                  <span className="-mb-[0.2em] inline-block overflow-hidden pb-[0.2em] align-top [perspective:600px]">
                    <span className="js-word js-reveal inline-block">{word}</span>
                  </span>
                </span>
              ))}
            </h1>

            <div className="js-hero-sub flex flex-col items-center">
              <p className="js-fade js-fade-text js-reveal mt-6 max-w-[42rem] font-sans text-[17px] font-normal leading-[28px] tracking-normal text-white sm:text-[20px] sm:leading-[32px]">
                A senior team of engineers and storytellers turning big ideas into{" "}
                <RotatingWords delay={2.8} words={["AI products.", "digital experiences.", "intelligent systems.", "customer solutions."]} />
              </p>

              <Link
                href="/#archive"
                aria-label="Portfolio"
                className="js-fade js-fade-cta js-reveal group mt-12 flex h-[65px] w-[65px] items-center justify-end overflow-hidden rounded-[32.5px] bg-white text-black shadow-[0_10px_40px_-10px_rgb(255_255_255/0.5)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-[176px] focus-visible:w-[176px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span
                  aria-hidden
                  className="whitespace-nowrap pl-6 font-sans text-base font-semibold opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:delay-150 group-focus-visible:opacity-100"
                >
                  Portfolio
                </span>
                <span className="grid size-[65px] shrink-0 place-items-center">
                  <svg viewBox="0 0 24 24" className="size-7 transition-transform duration-500 group-hover:rotate-45" aria-hidden>
                    <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>

          <div
            aria-hidden
            className="js-hero-cue invisible absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3 font-sans text-[11px] uppercase tracking-[0.3em] text-white/60"
          >
            Scroll
            <span className="relative block h-10 w-px overflow-hidden bg-white/15">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-cue-drop bg-white/80" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
