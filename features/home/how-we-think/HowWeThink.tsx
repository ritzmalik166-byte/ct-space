"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { motion } from "@/features/home/lib/store";
import { createDeck } from "./deck";
import { createSteps } from "./steps";
import { assetUrl } from "@/features/home/lib/assets";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STEPS: { lead: string; accent: string; body: string; video: string }[] = [
  {
    lead: "Listen",
    accent: "first.",
    body: "We sit with the people who'll actually use it: support calls, warehouse floors, the spreadsheet nobody admits to. The real problem is rarely the one in the brief.",
    video: assetUrl("auto.mp4"),
  },
  {
    lead: "Map the",
    accent: "signal.",
    body: "We trace where your data lives, what it's worth and what's just noise. Most of the work happens here, and most teams skip it.",
    video: assetUrl("01.mp4"),
  },
  {
    lead: "Prototype in",
    accent: "days.",
    body: "A rough, working version in your hands within two weeks. Real data, real users, honest feedback. Then we iterate.",
    video: assetUrl("02.MP4"),
  },
  {
    lead: "Ship, then",
    accent: "stay.",
    body: "We deploy, monitor and keep tuning. Models drift over time; we don't disappear.",
    video: assetUrl("11.mp4"),
  },
];

export function HowWeThink() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;
      const reduced = motion.reduced;
      const deck = createDeck(gsap.utils.toArray<HTMLElement>(".js-deck-card"), reduced);
      const steps = createSteps(section, reduced);
      let active = 0;
      let shown = false;

      const go = (index: number) => {
        active = index;
        if (!shown) return;
        steps.show(index);
        deck.show(index);
      };

      // Each step owns an equal share of the pinned scroll; the rail fills along the way.
      gsap.fromTo(".js-rail-fill", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: 0.6 } });
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const index = Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length));
          if (index !== active) go(index);
        },
      });

      // Arrival: as the panel comes up, the cards deal in one by one and the first step's copy rises in.
      ScrollTrigger.create({
        trigger: section,
        start: "top 40%",
        end: "bottom top",
        onEnter: () => {
          shown = true;
          go(active);
        },
        onEnterBack: () => {
          shown = true;
          go(active);
        },
        onLeave: () => {
          shown = false;
          deck.stop();
        },
        onLeaveBack: () => {
          shown = false;
          steps.hide();
          deck.hide();
        },
      });

      return () => deck.destroy();
    },
    { scope: root },
  );

  return (
    <section id="how-we-think" ref={root} aria-labelledby="how-we-think-title" className="relative h-[500svh]">
      <div className="sticky top-0 h-svh overflow-hidden bg-white py-10 md:py-auto">
<div
  aria-hidden
  className="
    js-think-ui
    absolute left-1/2 top-[5svh]
    mt-0 h-[48svh] w-0 -translate-x-1/2

    md:top-[4svh]
    md:h-[50svh]

    lg:left-[64%]
    lg:top-1/2
    lg:mt-20
    lg:h-[min(72svh,680px)]
    lg:-translate-y-3/5
  "
>
          {STEPS.map((step) => (
            <div
              key={step.video}
              className="js-deck-card absolute left-0 top-0 aspect-[9/16] h-full -translate-x-1/2 overflow-hidden rounded-[14px] bg-black shadow-[0_30px_60px_-24px_rgb(0_0_0/0.45)] will-change-transform"
            >
              <video className="block size-full object-cover" src={`${step.video}#t=0.1`} muted loop playsInline preload="metadata" />
            </div>
          ))}
        </div>

        <div className="relative mx-auto h-full w-full max-w-7xl px-6 lg:flex lg:items-center lg:px-10">

          <div aria-hidden className="js-think-ui absolute left-6 top-1/2 hidden h-56 -translate-y-1/2 lg:left-10 lg:block">
            <div className="relative h-full w-px bg-black/15">
              <div className="js-rail-fill absolute inset-0 origin-top bg-black" />
            </div>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="js-rail-dot absolute -left-[5px] size-[11px] rounded-full bg-black opacity-35"
                style={{ top: `${(i / (STEPS.length - 1)) * 100}%`, translate: "0 -50%" }}
              />
            ))}
          </div>

          <div className="relative h-full w-full max-w-[440px] pb-[12svh] md:left-1/2 md:-translate-x-1/2 lg:left-auto lg:translate-x-0 lg:ml-16 lg:max-w-[min(400px,34vw)]">
            {STEPS.map((step, i) => (
              <div
                key={step.lead}
                className="absolute inset-x-0 bottom-0 top-auto flex flex-col justify-end pb-8 md:bottom-auto md:top-[calc(53svh+30px)] md:pb-0 lg:inset-0 lg:top-0 lg:justify-center lg:pb-0"
              >
                <article className="js-step relative flex w-full flex-col gap-2.5 text-black">
                  <p className="js-step-fade font-sans text-base font-normal leading-none tracking-[-0.6px] text-black/70 sm:text-lg">
                    Step {String(i + 1).padStart(2, "0")} /{" "}
                    {String(STEPS.length).padStart(2, "0")}
                  </p>

                  <h3 className="font-heading text-[28px] font-bold leading-tight tracking-[-0.6px] text-black sm:text-[38px]">
                    {`${step.lead} ${step.accent}`.split(" ").map((word, wordIndex) => (
                      <span
                        key={`${word}-${wordIndex}`}
                        className="mr-[0.25em] inline-block overflow-hidden pb-[0.08em] align-top last:mr-0"
                      >
                        <span className="js-step-word inline-block">{word}</span>
                      </span>
                    ))}
                  </h3>

                  <p className="js-step-fade max-w-full pr-2 font-sans text-sm font-normal leading-snug tracking-[-0.3px] text-black sm:text-lg">
                    {step.body}
                  </p>
                </article>
              </div>
            ))}

          </div>
        </div>
      </div>
    </section>
  );
}
