"use client";

import { Fragment, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const PARTNERS = ["Emaar Properties", "Berkeley Group", "Related Companies", "DAMAC Luxury", "Hines Global", "Candy & Candy"];

const NAME = "font-mono text-[10px] uppercase leading-snug tracking-[0.2em] text-slate-400 transition-colors hover:text-white sm:text-[11px]";

function Separator() {
  return (
    <span aria-hidden className="font-mono text-xs text-slate-600">
      +
    </span>
  );
}

export function Partners() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      gsap.fromTo(
        ".js-pt-item",
        { autoAlpha: 0, y: reduced ? 0 : 14 },
        {
          autoAlpha: 1,
          y: 0,
          stagger: 0.05,
          ease: "power2.out",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom 75%", scrub: 0.6 },
        },
      );
    },
    { scope: root },
  );

  return (
    <section
      id="partners"
      ref={root}
      aria-labelledby="partners-title"
      className="relative border-t border-white/[0.06] bg-[#050913]"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-6 lg:gap-10 lg:px-10">
        <h2
          id="partners-title"
          className="js-pt-item shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400 sm:text-[11px]"
        >
          Portfolio partners:
        </h2>

        {/* The label stays put while the names loop; the duplicate list makes the -50% translate seamless. */}
        <div className="group relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
          <div className="js-pt-item flex w-max animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-8 pr-8 lg:gap-12 lg:pr-12">
                {PARTNERS.map((name) => (
                  <Fragment key={name}>
                    <li className={`whitespace-nowrap ${NAME}`}>{name}</li>
                    <li aria-hidden>
                      <Separator />
                    </li>
                  </Fragment>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
