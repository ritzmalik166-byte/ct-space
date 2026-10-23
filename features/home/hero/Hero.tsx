"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";
import { RotatingWords } from "./components/RotatingWords";
import { INTRO_DONE_EVENT, scene } from "../lib/store";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const HEADLINE = ["We", "Build", "AI", "That", "Actually", "Ships."];
const VIDEO_SRC = "/videos/229254_medium.mp4";

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const reduced = prefersReducedMotion();
      const clip = video.current;
      const play = () => {
        if (clip && !reduced) clip.play().catch(() => {});
      };
      play();

      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1, paused: !scene.introDone });
      tl.fromTo(".js-hero-media", { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 1.6, ease: "power2.out" }, 0)
        .fromTo(
          ".js-word",
          { yPercent: 110, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: 1.1, stagger: 0.08, ease: "expo.out" },
          0.3,
        )
        .fromTo(".js-fade", { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.12 }, "-=0.7");

      gsap.to(".js-scroll-out", {
        y: -90,
        autoAlpha: 0,
        ease: "none",
        stagger: 0.04,
        scrollTrigger: { trigger: root.current, start: "top top", end: "65% top", scrub: true },
      });

      // The video gives way to the 3D dive underneath, and stops decoding once the hero is gone.
      gsap.to(".js-hero-veil", {
        autoAlpha: 0,
        scale: 1.06,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
          onLeave: () => clip?.pause(),
          onEnterBack: play,
        },
      });

      const xTo = gsap.quickTo(glow.current, "x", { duration: 0.9, ease: "power3" });
      const yTo = gsap.quickTo(glow.current, "y", { duration: 0.9, ease: "power3" });
      const onMove = contextSafe!((e: PointerEvent) => {
        xTo(e.clientX);
        yTo(e.clientY);
      });
      window.addEventListener("pointermove", onMove, { passive: true });

      const start = contextSafe!(() => tl.play());
      window.addEventListener(INTRO_DONE_EVENT, start, { once: true });

      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener(INTRO_DONE_EVENT, start);
        clip?.pause();
      };
    },
    { scope: root },
  );

  return (
    <section id="hero" ref={root} className="relative isolate flex min-h-svh flex-col overflow-hidden">
      <div aria-hidden className="js-hero-veil pointer-events-none absolute inset-0 -z-10 origin-center">
        <div className="js-hero-media invisible absolute inset-0">
          <video
            ref={video}
            className="size-full object-cover"
            src={`${VIDEO_SRC}#t=0.1`}
            muted
            loop
            playsInline
            preload="metadata"
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgb(5_6_11/0.25)_0%,rgb(5_6_11/0.6)_70%,rgb(5_6_11/0.85)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-space to-transparent" />
      </div>

      <div
        ref={glow}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 -z-10 size-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(253_230_138/0.06),transparent_65%)]"
      />

      <div className="js-scroll-out relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pb-16 pt-28 text-center lg:px-10">
        <h1 className="font-heading text-[clamp(2.4rem,5.6vw,70px)] font-bold capitalize leading-none tracking-normal text-white [text-shadow:0_4px_40px_rgb(0_0_0/0.45)]">
          {HEADLINE.map((word) => (
            <span key={word} className="mr-[0.22em] inline-block overflow-hidden pb-[0.1em] align-top last:mr-0">
              <span className="js-word js-reveal inline-block">{word}</span>
            </span>
          ))}
        </h1>

        <p className="js-fade js-reveal mt-6 max-w-[42rem] font-sans text-[17px] font-normal leading-[28px] tracking-normal text-white sm:text-[20px] sm:leading-[32px]">
          A senior team of engineers and storytellers turning big ideas into{" "}
          <RotatingWords delay={1.8} words={["brand films", "support agents", "vision models", "internal copilots"]} /> that
          people genuinely use.
        </p>

        <Link
          href="/#archive"
          aria-label="Portfolio"
          className="js-fade js-reveal group mt-12 flex h-[65px] w-[65px] items-center justify-end overflow-hidden rounded-[32.5px] bg-white text-black shadow-[0_10px_40px_-10px_rgb(255_255_255/0.5)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-[176px] focus-visible:w-[176px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
    </section>
  );
}
