"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const VIDEO_SRC = "/videos/169817-841954032.mp4";

/** Opens the "How we think" chapter: title, a framed film, and the cue into the scroll-driven steps below. */
export function ThinkIntro() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const clip = video.current;

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: root.current, start: "top 85%", end: "center center", scrub: 0.8 },
      });
      tl.fromTo(".js-ti-head > *", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.12, duration: 0.35, ease: "power2.out" }, 0)
        .fromTo(
          ".js-ti-frame",
          { clipPath: "inset(10% 14% 10% 14% round 30px)", autoAlpha: 0.4 },
          { clipPath: "inset(0% 0% 0% 0% round 30px)", autoAlpha: 1, duration: 1 },
          0.1,
        )
        .fromTo(".js-ti-video", { scale: 1.18 }, { scale: 1, duration: 1 }, 0.1)
        .fromTo(".js-ti-cue", { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3 }, 0.8);

      // The film only decodes while it is on screen.
      ScrollTrigger.create({
        trigger: ".js-ti-frame",
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          if (!clip || reduced) return;
          if (self.isActive) clip.play().catch(() => {});
          else clip.pause();
        },
      });

      return () => clip?.pause();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="how-we-think-title" className="relative z-10 bg-space px-4 py-20 sm:py-28">
      <div className="js-ti-head mx-auto flex max-w-[506px] flex-col items-center gap-2.5 text-center">
        <h2
          id="how-we-think-title"
          className="bg-[linear-gradient(180deg,#FFFFFF_0%,#F1F5F9_45.31%,#94A3B8_90.63%)] bg-clip-text align-middle font-heading text-[30px] font-bold uppercase leading-none tracking-normal text-transparent sm:text-[38px]"
        >
          How we think
        </h2>
        <p className="align-middle font-sans text-[16px] font-normal leading-none tracking-[-0.6px] text-[#94A3B8] sm:text-[18px]">
          Inside every good AI product is a network of small, careful decisions.
        </p>
      </div>

      <div className="js-ti-frame mx-auto mt-10 aspect-[1260/620] w-full max-w-[1260px] overflow-hidden rounded-[30px] bg-white/[0.03] opacity-100 shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)] ring-1 ring-white/10 sm:mt-14">
        <video
          ref={video}
          className="js-ti-video block size-full object-cover"
          src={`${VIDEO_SRC}#t=0.1`}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        />
      </div>

      <p className="js-ti-cue mt-10 flex items-center justify-center gap-2 font-sans text-sm text-slate-300 sm:mt-12">
        keep scrolling, we&apos;ll show you ours
        <span aria-hidden className="inline-block animate-bounce">↓</span>
      </p>
    </section>
  );
}
