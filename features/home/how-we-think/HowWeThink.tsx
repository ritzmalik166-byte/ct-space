"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { STEP_STOPS } from "@/features/home/lib/store";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STEPS: { lead: string; accent: string; body: string }[] = [
  {
    lead: "Listen",
    accent: "first.",
    body: "We sit with the people who'll actually use it: support calls, warehouse floors, the spreadsheet nobody admits to. The real problem is rarely the one in the brief.",
  },
  {
    lead: "Map the",
    accent: "signal.",
    body: "We trace where your data lives, what it's worth and what's just noise. Most of the work happens here, and most teams skip it.",
  },
  {
    lead: "Prototype in",
    accent: "days.",
    body: "A rough, working version in your hands within two weeks. Real data, real users, honest feedback. Then we iterate.",
  },
  {
    lead: "Ship, then",
    accent: "stay.",
    body: "We deploy, monitor and keep tuning. Models drift over time; we don't disappear.",
  },
];

const IN_LEAD = 0.07;
const IN_LENGTH = 0.05;
const OUT_START = 0.06;
const OUT_LENGTH = 0.04;

export function HowWeThink() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        ".js-think-intro > *",
        { y: 40, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: { trigger: root.current, start: "top 55%", end: "top 5%", scrub: true },
        },
      );

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });

      tl.to(".js-think-intro", { autoAlpha: 0, y: -50, duration: 0.05 }, 0.03);
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
            { yPercent: 0, duration: IN_LENGTH, stagger: 0.008, ease: "power3.out" },
            at - IN_LEAD,
          )
          .fromTo(
            fades,
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: IN_LENGTH, stagger: 0.01, ease: "power2.out" },
            at - IN_LEAD + 0.015,
          );
        if (dot) tl.fromTo(dot, { scale: 1, opacity: 0.35 }, { scale: 1.6, opacity: 1, duration: 0.03 }, at - IN_LEAD);

        tl.to(step, { autoAlpha: 0, y: -40, duration: OUT_LENGTH, ease: "power1.in" }, at + OUT_START);
        if (dot) tl.to(dot, { scale: 1, opacity: 0.6, duration: 0.03 }, at + OUT_START);
      });

      tl.to(".js-think-ui", { autoAlpha: 0, duration: 0.05 }, 0.74);
      tl.set({}, {}, 1);
    },
    { scope: root },
  );

  return (
    <section id="how-we-think" ref={root} aria-labelledby="how-we-think-title" className="relative h-[560svh]">
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

          <div className="relative w-full max-w-xl lg:ml-16">
            <div className="js-think-intro absolute inset-x-0 bottom-0 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-400/80">02 · How we think</p>
              <h2
                id="how-we-think-title"
                className="mt-5 text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1] tracking-[-0.035em]"
              >
                Inside every good AI product is a{" "}
                <span className="italic text-cyan-200">network</span> of small,
                careful decisions.
              </h2>
              <p className="mt-5 text-base font-medium text-cyan-300/80">keep scrolling, we&apos;ll show you ours ↓</p>
            </div>

            {STEPS.map((step, i) => (
              <article
                key={step.lead}
                className="js-step invisible absolute inset-x-0 bottom-0 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
              >
                <p className="js-step-fade font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-400/80">
                  Step {String(i + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
                </p>
                <h3 className="mt-4 text-[clamp(2.4rem,5.5vw,4.6rem)] font-bold leading-[0.95] tracking-[-0.04em]">
                  {step.lead.split(" ").map((word) => (
                    <span key={word} className="mr-[0.2em] inline-block overflow-hidden pb-[0.08em] align-top">
                      <span className="js-step-word inline-block">{word}</span>
                    </span>
                  ))}
                  <span className="inline-block overflow-hidden pb-[0.08em] align-top">
                    <span className="js-step-word inline-block italic text-cyan-200">
                      {step.accent}
                    </span>
                  </span>
                </h3>
                <p className="js-step-fade mt-5 max-w-md text-base leading-relaxed text-slate-400 sm:text-lg">
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
