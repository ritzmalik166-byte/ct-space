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
        .timeline({ paused: true, defaults: { duration: 1.2, ease: "power3.out" } })
        .fromTo(".js-ti-frame", { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }, 0)
        .fromTo(".js-ti-video", { scale: 1.15 }, { scale: 1 }, 0);

      ScrollTrigger.create({
        trigger: root.current,
        start: "top 10%",
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
      className="relative z-30 flex min-h-0 shadow-[0_-30px_80px_-20px_rgb(0_0_0/0.8)] sm:mt-[calc(-1*min(var(--cn-h,100svh),100svh))] flex-col items-center gap-2.5 bg-white pt-[76px] sm:gap-3 lg:pt-20"
    >
      <SectionHeading
        id="how-we-think-title"
        title="How we think"
        subtitle="Inside every good AI product is a network of small, careful decisions."
        tone="light"
        className="px-4"
      />

      <div className="js-ti-frame h-[55svh] max-h-[700px] min-h-0 w-full shrink-0 overflow-hidden bg-white/[0.03] sm:h-[60svh] lg:h-[85svh]">
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
