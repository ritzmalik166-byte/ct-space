"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { netAt, STEP_CARD_WIDTH, STEP_STOPS, stepCards } from "@/features/home/lib/store";
import { assetUrl } from "@/features/home/lib/assets";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STEPS: { lead: string; accent: string; body: string; video: string }[] = [
  {
    lead: "Listen",
    accent: "first.",
    body: "We sit with the people who'll actually use it: support calls, warehouse floors, the spreadsheet nobody admits to. The real problem is rarely the one in the brief.",
    video: assetUrl("04.mp4"),
  },
  {
    lead: "Map the",
    accent: "signal.",
    body: "We trace where your data lives, what it's worth and what's just noise. Most of the work happens here, and most teams skip it.",
    video: assetUrl("06.mp4"),
  },
  {
    lead: "Prototype in",
    accent: "days.",
    body: "A rough, working version in your hands within two weeks. Real data, real users, honest feedback. Then we iterate.",
    video: assetUrl("07.mp4"),
  },
  // {
  //   lead: "Ship, then",
  //   accent: "stay.",
  //   body: "We deploy, monitor and keep tuning. Models drift over time; we don't disappear.",
  //   video: assetUrl("11.mp4"),
  // },
];

const IN_LEAD = netAt(32);
const IN_LENGTH = netAt(23);
const OUT_START = netAt(28);
const OUT_LENGTH = netAt(18);

export function HowWeThink() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });

      tl.fromTo(".js-rail-fill", { scaleY: 0 }, { scaleY: 1, duration: 1 }, 0);

      gsap.utils.toArray<HTMLElement>(".js-step").forEach((step, i) => {
        const at = STEP_STOPS[i];
        const words = step.querySelectorAll(".js-step-word");
        const fades = step.querySelectorAll(".js-step-fade");
        const dot = root.current?.querySelectorAll(".js-rail-dot")[i];
        tl.set(step, { autoAlpha: 1 }, at - IN_LEAD)
          .fromTo(
            words,
            { yPercent: 110 },
            { yPercent: 0, duration: IN_LENGTH, stagger: netAt(4), ease: "power3.out" },
            at - IN_LEAD,
          )
          .fromTo(
            fades,
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: IN_LENGTH, stagger: netAt(5), ease: "power2.out" },
            at - IN_LEAD + netAt(7),
          );
        if (dot) tl.fromTo(dot, { scale: 1, opacity: 0.35 }, { scale: 1.6, opacity: 1, duration: netAt(14) }, at - IN_LEAD);
        tl.to(step, { autoAlpha: 0, y: -40, duration: OUT_LENGTH, ease: "power1.in" }, at + OUT_START);
        if (dot) tl.to(dot, { scale: 1, opacity: 0.6, duration: netAt(14) }, at + OUT_START);
      });

      const lastOut = STEP_STOPS[STEP_STOPS.length - 1] + OUT_START;
      tl.to(".js-think-ui", { autoAlpha: 0, duration: OUT_LENGTH }, lastOut);
      tl.set({}, {}, 1);
    },
    { scope: root },
  );

  return (
    <section id="how-we-think" ref={root} aria-labelledby="how-we-think-title" className="relative h-[400svh]">
      {/* Positioned every frame by the matching 3D key node, so the cards travel with the camera like the rings did. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        {STEPS.map((step, i) => (
          <div
            key={step.video}
            ref={(el) => {
              stepCards[i] = el;
              return () => {
                stepCards[i] = null;
              };
            }}
            style={{ width: STEP_CARD_WIDTH }}
            className="invisible absolute left-0 top-0 origin-center will-change-transform"
          >
            <video
              className="block aspect-square w-full rounded-full object-cover shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9),0_0_60px_-20px_rgb(34_211_238/0.4)] ring-1 ring-white/15"
              src={`${step.video}#t=0.1`}
              muted
              loop
              playsInline
              preload="metadata"
            />
          </div>
        ))}
      </div>

      <div className="sticky top-0 h-svh overflow-hidden">
        <div
          aria-hidden
          className="js-think-ui pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-space/85 via-space/40 to-transparent lg:inset-y-0 lg:left-0 lg:right-auto lg:h-full lg:w-1/2 lg:bg-gradient-to-r"
        />

        <div className="relative mx-auto flex h-full w-full max-w-7xl items-end px-6 pb-16 lg:items-center lg:px-10 lg:pb-0">
          <div aria-hidden className="js-think-ui absolute left-6 top-1/2 hidden h-56 -translate-y-1/2 lg:left-10 lg:block">
            <div className="relative h-full w-px bg-white/10">
              <div className="js-rail-fill absolute inset-0 origin-top bg-gradient-to-b from-cyan-300 via-violet-400 to-amber-200" />
            </div>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="js-rail-dot absolute -left-[3px] size-[7px] rounded-full bg-white opacity-35"
                style={{ top: `${(i / (STEPS.length - 1)) * 100}%` }}
              />
            ))}
          </div>

          <div className="relative w-full max-w-[440px] lg:ml-16">
            {STEPS.map((step, i) => (
              <article
                key={step.lead}
                className="js-step invisible absolute inset-x-0 bottom-0 flex flex-col gap-2.5 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
              >
                <p className="js-step-fade font-sans text-base font-normal leading-none tracking-[-0.6px] text-[#94A3B8] sm:text-lg">
                  Step {String(i + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
                </p>
                <h3 className="font-heading text-[30px] font-bold leading-none tracking-[-0.6px] text-white sm:text-[38px]">
                  {`${step.lead} ${step.accent}`.split(" ").map((word) => (
                    <span key={word} className="mr-[0.25em] inline-block overflow-hidden pb-[0.08em] align-top last:mr-0">
                      <span className="js-step-word inline-block">{word}</span>
                    </span>
                  ))}
                </h3>
                <p className="js-step-fade font-sans text-base font-normal leading-none tracking-[-0.6px] text-white sm:text-lg">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
