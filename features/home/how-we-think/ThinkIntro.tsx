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
  const panel = useRef<HTMLDivElement>(null);
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

      // Pinned screen: stops at full screen while the video smoothly stretches
      // into a full rectangle. Holds briefly once fully stretched, then unpins
      // to let the user scroll into the next section ("How we think" steps).
      gsap
        .timeline({
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${window.innerHeight * 1.2}`,
            pin: panel.current,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        })
        .fromTo(
          ".js-ti-frame",
          {
            clipPath: "inset(40% 40% 40% 40%)",
            scale: 0.65,
            borderRadius: window.innerWidth < 940 ? "0px" : "24px",
          },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            scale: 1,
            borderRadius: window.innerWidth < 940 ? "0px" : "24px",
            duration: 1,
            ease: "power2.inOut",
          },
          0,
        )
        .fromTo(
          ".js-ti-video",
          { scale: 1.3 },
          { scale: 1, duration: 1, ease: "power2.inOut" },
          0,
        )
        // Hold the fully stretched video before proceeding to the next section
        .to({}, { duration: 0.5 });

      return () => clip?.pause();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-labelledby="how-we-think-title"
      className="relative z-30 bg-white sm:mt-[calc(-1*min(var(--cn-h,100svh),100svh))]"
    >
      <div
        ref={panel}
        className="relative flex h-svh min-h-svh w-full flex-col items-center gap-2.5 bg-white pt-[76px] sm:gap-3 lg:py-20 overflow-hidden"
      >
        <SectionHeading
          id="how-we-think-title"
          title="How we think"
          subtitle="Inside every good AI product is a network of small, careful decisions."
          tone="light"
          className="px-4 shrink-0"
        />

        <div className="js-ti-frame mx-auto mt-5 h-[68svh] max-h-none min-h-0 w-full max-w-7xl shrink-0 overflow-hidden rounded-none bg-white sm:mt-5 sm:h-[60svh] sm:max-h-[700px] sm:rounded-3xl lg:h-[85svh]">
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
      </div>
    </section>
  );
}
