"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SectionHeading } from "@/features/home/components/SectionHeading";
import { prefersReducedMotion } from "@/lib/media";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const VIDEO_SRC = "/videos/169817-841954032.mp4";

/** Opens the "How we think" chapter: title and a framed film filling the rest of the screen. */
export function ThinkIntro() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const clip = video.current;

      // The film only decodes while the section is on screen.
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          if (!clip || reduced) return;
          if (self.isActive) clip.play().catch(() => { });
          else clip.pause();
        },
      });

      if (reduced) return () => clip?.pause();

      // Once the section has scrolled fully into place, the film wipes up from the bottom on its own (time-based,
      // not scrubbed); scrolling back above the section closes it again.
      const reveal = gsap
        .timeline({
          paused: true,
          defaults: { duration: 1.4, ease: "power3.inOut" },
        })
        .fromTo(
          ".js-ti-frame",
          {
            clipPath: "inset(40% 40% 40% 40%)",
            scale: 0.65,
            borderRadius: "24px",
          },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            scale: 1,
            borderRadius: "24px",
          },
          0,
        )
        .fromTo(
          ".js-ti-video",
          { scale: 1.3 },
          { scale: 1, duration: 1.4 },
          0,
        );

      ScrollTrigger.create({
        trigger: ".js-ti-frame",
        start: "top 85%",
        onEnter: () => reveal.play(),
        onLeaveBack: () => reveal.reverse(),
      });

      return () => clip?.pause();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-labelledby="how-we-think-title"
      className="relative z-30 flex min-h-0 flex-col items-center gap-2.5 bg-white pt-[76px] sm:mt-[calc(-1*min(var(--cn-h,100svh),100svh))] sm:gap-3 lg:pt-20"
    >
      <SectionHeading
        id="how-we-think-title"
        title="How we think"
        subtitle="Inside every good AI product is a network of small, careful decisions."
        tone="light"
        className="px-4"
      />

<div className="js-ti-frame sm:mt-5 mx-auto h-[55svh] max-h-[700px] min-h-0 w-full max-w-7xl shrink-0 overflow-hidden rounded-3xl bg-white/[0.03] sm:h-[60svh] lg:h-[85svh]">
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
    </section>
  );
}
