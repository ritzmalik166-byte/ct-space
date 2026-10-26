"use client";

import { useRef, type SyntheticEvent } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { motion } from "@/features/home/lib/store";
import { SLIDES } from "./slides";
import { servicesEntrance, servicesSequence, WIPE_FROM, type ServiceParts } from "./timeline";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Missing artwork falls back to the slide's gradient instead of a broken image icon. */
const hideOnError = (e: SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = "hidden";
};

const pad = (n: number) => String(n).padStart(2, "0");

export function CreativeServices() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;
      const all = (sel: string) => gsap.utils.toArray<HTMLElement>(sel, section);
      const one = (sel: string) => section.querySelector(sel) as HTMLElement;
      const parts: ServiceParts = {
        head: one(".js-cs-head"),
        pin: one(".js-cs-pin"),
        frame: one(".js-cs-frame"),
        stage: one(".js-cs-stage"),
        bgs: all(".js-cs-bg"),
        bgImgs: all(".js-cs-bg-img"),
        figs: all(".js-cs-figure"),
        copies: all(".js-cs-copy"),
        bars: all(".js-cs-bar"),
        explore: one(".js-cs-explore"),
      };
      const counter = one(".js-cs-count");

      servicesEntrance(parts, motion.reduced);
      servicesSequence(parts, motion.reduced, (index) => {
        counter.textContent = pad(index + 1);
        parts.explore.dataset.openContact = SLIDES[index].service;
        parts.copies.forEach((copy, i) => copy.toggleAttribute("inert", i !== index));
      });
    },
    { scope: root },
  );

  return (
    <section id="creative-services" ref={root} aria-labelledby="creative-services-title" className="relative">
      <div className="js-cs-pin relative h-[550svh]">
        <div className="js-cs-frame sticky top-0 flex h-svh w-full flex-col gap-3 bg-space pt-[72px] md:gap-4 md:pt-5">
          <div className="js-cs-head flex shrink-0 flex-col items-center gap-1.5 px-5 text-center sm:gap-2">
            <h2
              id="creative-services-title"
              className="bg-[linear-gradient(0deg,#94AEB8_0%,#F1F5F9_50%,#FFFFFF_100%)] bg-clip-text pb-[0.1em] font-heading text-[26px] font-bold uppercase leading-none tracking-[-0.6px] text-transparent sm:text-[34px]"
            >
              AI creative services
            </h2>
            <p className="max-w-[506px] font-sans text-sm font-normal leading-tight tracking-[-0.4px] text-[#B4C0CE] sm:text-base">
              AI-powered creative solutions for campaigns, content, branding, &amp; digital experiences.
            </p>
          </div>

          <div
            role="region"
            aria-roledescription="carousel"
            aria-label="AI creative services, scroll to browse"
            className="js-cs-stage relative min-h-0 w-full flex-1 overflow-hidden bg-space"
          >
            {/* Layer 1: background images; later slides wipe in over earlier ones. */}
            {SLIDES.map((slide, i) => (
              <div
                key={slide.bg}
                className={`js-cs-bg absolute inset-0 overflow-hidden bg-gradient-to-br ${slide.tint}`}
                style={i === 0 ? undefined : { clipPath: WIPE_FROM }}
              >
                <div className="js-cs-bg-img absolute inset-0 will-change-transform">
                  <Image src={slide.bg} alt="" fill sizes="100vw" className="object-cover" onError={hideOnError} />
                </div>
              </div>
            ))}

            {/* Layer 2: first shadow, under the figure. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[3] bg-black/55 [clip-path:polygon(0_0,100%_0,100%_38%,0_62%)] lg:[clip-path:polygon(0_0,72%_0,44%_100%,0_100%)]"
            />

            {/* Layer 3: figures. */}
            <div className="pointer-events-none absolute inset-y-0 right-[-6%] z-[4] w-[78%] sm:right-0 sm:w-[55%] lg:left-[44%] lg:right-auto lg:w-[42%]">
              {SLIDES.map((slide, i) => (
                <div
                  key={slide.figure}
                  className={`js-cs-figure absolute inset-x-0 bottom-0 top-[6%] origin-bottom will-change-transform ${i === 0 ? "" : "invisible opacity-0"}`}
                >
                  <Image src={slide.figure} alt="" fill sizes="(min-width: 1024px) 42vw, 78vw" className="object-contain object-bottom" onError={hideOnError} />
                </div>
              ))}
            </div>

            {/* Layer 4: second shadow, over the figure, plus a soft fade behind the copy. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[5] bg-black/40 [clip-path:polygon(100%_55%,100%_100%,0_100%,0_85%)] lg:[clip-path:polygon(93%_0,100%_0,100%_100%,63%_100%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-black/85 via-black/30 to-transparent lg:bg-gradient-to-r lg:from-black/55 lg:via-black/10"
            />

            {/* Layer 5: copy and scroll progress. */}
            <div className="absolute inset-0 z-[6] flex items-end px-5 pb-8 sm:px-10 sm:pb-12 lg:items-center lg:px-[80px] lg:pb-0">
              <div className="flex w-full max-w-[479px] flex-col gap-6 sm:gap-[30px]">
                <div aria-live="polite" className="grid">
                  {SLIDES.map((slide, i) => (
                    <div
                      key={slide.title}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${i + 1} of ${SLIDES.length}`}
                      inert={i !== 0}
                      className="js-cs-copy flex flex-col items-start gap-[30px] [grid-area:1/1]"
                    >
                      <h3 className={`js-cs-line font-heading text-[30px] font-bold leading-none tracking-normal text-white-700 sm:text-[38px] ${i === 0 ? "" : "invisible"}`}>
                        {slide.title}
                      </h3>
                      <p className={`js-cs-line font-sans text-base leading-none text-white-400 sm:text-[18px] ${i === 0 ? "" : "invisible"}`}>{slide.body}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  data-open-contact={SLIDES[0].service}
                  className="js-cs-explore group/explore flex h-[46px] w-[180px] items-center justify-between gap-2.5 rounded-[100px] bg-white px-[19px] py-[9px] font-sans text-base font-semibold text-black transition-[scale] duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Explore
                  <span className="grid size-7 place-items-center rounded-full bg-black text-white">
                    <svg viewBox="0 0 24 24" className="size-4 transition-[rotate] duration-500 group-hover/explore:rotate-45" aria-hidden>
                      <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>

                <div className="flex items-center gap-4" aria-hidden>
                  <span className="font-sans text-sm tabular-nums tracking-wide text-white/60">
                    <span className="js-cs-count text-white">01</span> / {pad(SLIDES.length)}
                  </span>
                  <div className="flex flex-1 gap-1.5">
                    {SLIDES.map((slide) => (
                      <span key={slide.title} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/20">
                        <span className="js-cs-bar block size-full origin-left bg-white" />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
