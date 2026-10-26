"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { scrollToY } from "@/lib/scroll";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Scroll offset, as a share of the viewport height, before the button appears. */
const SHOW_AFTER = 0.6;
const RING = 2 * Math.PI * 22;

export function BackToTop() {
  const button = useRef<HTMLButtonElement>(null);
  const ring = useRef<SVGCircleElement>(null);

  useGSAP(() => {
    const el = button.current;
    if (!el || !ring.current) return;
    const setOffset = gsap.quickSetter(ring.current, "strokeDashoffset");

    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        setOffset(RING * (1 - self.progress));
        const shown = String(self.scroll() > window.innerHeight * SHOW_AFTER);
        if (el.dataset.shown !== shown) el.dataset.shown = shown;
      },
    });
  });

  return (
    <button
      ref={button}
      type="button"
      data-shown="false"
      onClick={() => scrollToY(0)}
      aria-label="Back to top"
      className="group fixed bottom-5 right-5 z-30 grid size-12 translate-y-3 place-items-center rounded-full bg-black/60 text-white opacity-0 shadow-[0_8px_24px_rgb(0_0_0/0.45)] backdrop-blur-md transition-[opacity,translate,color] duration-300 hover:text-[#F4C542] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4C542] data-[shown=false]:pointer-events-none data-[shown=true]:translate-y-0 data-[shown=true]:opacity-100 sm:bottom-8 sm:right-8 sm:size-14"
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r="22" fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="1.5" />
        <circle
          ref={ring}
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="#F4C542"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={RING}
          strokeDashoffset={RING}
        />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="size-5 transition-[translate] duration-300 group-hover:-translate-y-0.5"
        aria-hidden
      >
        <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
