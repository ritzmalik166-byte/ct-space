"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HandNote } from "./components/HandNote";
import { RotatingWords } from "./components/RotatingWords";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const HEADLINE: { text: string; serif?: boolean }[][] = [
  [{ text: "We" }, { text: "build" }, { text: "AI" }],
  [{ text: "that" }, { text: "actually", serif: true }],
  [{ text: "ships." }],
];

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const glow = useRef<HTMLDivElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.25 });
      tl.fromTo(".js-badge", { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, 0.4)
        .fromTo(
          ".js-word",
          { yPercent: 110, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: 1.1, stagger: 0.08, ease: "expo.out" },
          "-=0.4",
        )
        .fromTo(
          ".js-fade",
          { y: 20, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.12 },
          "-=0.7",
        )
        .set(".js-note", { autoAlpha: 1 }, "+=0.6")
        .fromTo(".js-note p", { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.6 })
        .fromTo(
          ".js-note-path",
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 0.9, stagger: 0.7, ease: "power2.inOut" },
          "-=0.2",
        );

      gsap.to(".js-scroll-out", {
        y: -90,
        autoAlpha: 0,
        ease: "none",
        stagger: 0.04,
        scrollTrigger: { trigger: root.current, start: "top top", end: "65% top", scrub: true },
      });

      const xTo = gsap.quickTo(glow.current, "x", { duration: 0.9, ease: "power3" });
      const yTo = gsap.quickTo(glow.current, "y", { duration: 0.9, ease: "power3" });
      const onMove = contextSafe!((e: PointerEvent) => {
        xTo(e.clientX);
        yTo(e.clientY);
      });
      window.addEventListener("pointermove", onMove, { passive: true });
      return () => window.removeEventListener("pointermove", onMove);
    },
    { scope: root },
  );

  return (
    <section id="hero" ref={root} className="relative isolate flex min-h-svh flex-col overflow-hidden">
      <div
        ref={glow}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 -z-10 size-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(253_230_138/0.06),transparent_65%)]"
      />

      <div aria-hidden className="h-15 shrink-0" />
      <div className="js-scroll-out pointer-events-none absolute inset-0">
        <HandNote />
      </div>

      <div className="js-scroll-out relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-6 pb-10 pt-[36vh] sm:pt-[40vh] lg:justify-center lg:px-10 lg:pb-12 lg:pt-8">
        <div className="max-w-2xl">
          <p className="js-badge js-reveal flex items-center gap-2.5 text-sm text-slate-400">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Booking two new projects for early 2027
          </p>

          <h1 className="mt-6 text-[clamp(2rem,6vw,5.9rem)] font-bold leading-[0.92] tracking-[-0.04em]">
            {HEADLINE.map((line, i) => (
              <span key={i} className="block">
                {line.map((word) => (
                  <span key={word.text} className="mr-[0.2em] inline-block overflow-hidden pb-[0.1em] align-top">
                    <span
                      className={`js-word js-reveal inline-block ${
                        word.serif ? "italic text-cyan-200" : ""
                      }`}
                    >
                      {word.text}
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </h1>

          <p className="js-fade js-reveal mt-7 max-w-xl text-lg leading-relaxed text-slate-400">
            We&apos;re a small, senior team of engineers and designers. We help companies turn messy
            data and big ideas into{" "}
            <RotatingWords
              delay={1.8}
              words={["support agents", "vision models", "internal copilots", "forecasting tools"]}
            />{" "}
            that people genuinely use, not demos that die in a slide deck.
          </p>

          <div className="js-fade js-reveal mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Link
              href="#contact"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-space transition-colors hover:bg-cyan-100"
            >
              Tell us what you&apos;re building
              <svg viewBox="0 0 16 16" className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="#work" className="inline-flex items-center rounded-full border border-transparent px-6 py-3.5 bg-black text-sm text-white/80 transition-colors border-white text-white">
              See what we&apos;ve shipped
            </Link>
          </div>

          {/* <figure className="js-fade js-reveal mt-12 flex max-w-lg gap-4 border-t border-white/10 pt-6">
            <div
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-rose-300 font-serif text-lg italic text-space"
            >
              N
            </div>
            <div>
              <blockquote className="font-serif text-[1.2rem] leading-snug text-white/85">
                &ldquo;They spent a week sitting with our support team before writing a single line of
                code. That&apos;s why it worked.&rdquo;
              </blockquote>
              <figcaption className="mt-2 text-xs text-cyan-400/80">
                Neha Kapoor · Head of Customer Experience, fintech startup
              </figcaption>
            </div>
          </figure> */}
        </div>
      </div>

      <div className="js-scroll-out relative z-10">
      <div className="js-fade js-reveal mx-auto flex w-full max-w-7xl items-end justify-between gap-6 border-t border-white/[0.07] px-6 py-5 lg:px-10">
        <p className="max-w-md text-sm text-slate-400">
          <span className="font-medium text-cyan-300">currently building →</span>{" "}
          a vision model that spots crop disease from a single phone photo.
        </p>
        <span className="hidden items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500 sm:flex">
          Scroll
          <span className="relative h-px w-10 overflow-hidden bg-white/15">
            <span className="absolute inset-y-0 left-0 w-1/2 animate-slide bg-white/60" />
          </span>
        </span>
      </div>
      </div>
    </section>
  );
}
