"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";
import Link from "next/link";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const MISSION_EMAIL = "hello@contenaissance.com";
const PHONE = { label: "+971 4 800 2872", href: "tel:+97148002872" };

const FIELD =
  "w-full rounded-xl border border-white/10 bg-[#070b14]/90 px-4 py-3 text-base text-white placeholder:text-slate-500 transition-colors focus:border-cyan-400/60 focus:outline-none sm:text-sm";

type Mode = "cta" | "form" | "sent";

/** Progress where the sticky panel locks: the trigger starts when the section enters (100svh of its 300svh). */
const STUCK_AT = 100 / 300;
const LIFT_OFF = 0.8;

export function Launch() {
  const root = useRef<HTMLElement>(null);
  const flight = useRef<HTMLSpanElement>(null);
  const [mode, setMode] = useState<Mode>("cta");

  // Each mode swap fades the new block in; the scroll timeline never touches these nodes.
  useEffect(() => {
    if (mode === "cta") return;
    const block = root.current?.querySelector(`.js-ln-${mode}`);
    if (!block) return;
    const tween = gsap.fromTo(block, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: prefersReducedMotion() ? 0 : 0.5, ease: "power3.out" });
    if (mode === "form") block.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    return () => {
      tween.kill();
    };
  }, [mode]);

  const launch = () => {
    const rocket = flight.current;
    if (!rocket || prefersReducedMotion()) return;
    const reach = Math.max(window.innerWidth, window.innerHeight) * 0.75;
    gsap
      .timeline()
      .to(rocket, { x: -2, y: 2, duration: 0.05, repeat: 5, yoyo: true, ease: "none" })
      .to(rocket, { x: reach, y: -reach, scale: 0.7, duration: 1.1, ease: "power2.in" })
      .set(rocket, { x: 0, y: 140, scale: 1, autoAlpha: 0 }, "+=0.6")
      .to(rocket, { y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out" });
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const subject = encodeURIComponent(`New mission from ${name}`);
    const body = encodeURIComponent(`${data.get("message") ?? ""}\n\n${name}\n${data.get("email") ?? ""}`);
    launch();
    setMode("sent");
    window.location.href = `mailto:${MISSION_EMAIL}?subject=${subject}&body=${body}`;
  };

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top bottom",
          end: "bottom bottom",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      tl.fromTo(".js-ln-panel", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT)
        .fromTo(".js-ln-glow", { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.14, ease: "power2.out" }, STUCK_AT)
        .fromTo(".js-ln-rocket", { autoAlpha: 0, y: 90 }, { autoAlpha: 1, y: 0, duration: 0.12, ease: "power3.out" }, STUCK_AT + 0.02)
        .fromTo(".js-ln-word", { yPercent: 110 }, { yPercent: 0, duration: 0.07, stagger: 0.02, ease: "power3.out" }, STUCK_AT + 0.08)
        .fromTo(".js-ln-cta", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.06, stagger: 0.025, ease: "power2.out" }, STUCK_AT + 0.16);

      if (!reduced) {
        // Lift-off just before the footer arrives: the rocket leaves along its nose, leaving an exhaust trail.
        const reach = () => Math.max(window.innerWidth, window.innerHeight) * 0.7;
        tl.fromTo(".js-ln-trail", { scaleY: 0 }, { scaleY: 1, duration: 0.08, ease: "power1.in" }, LIFT_OFF)
          .to(".js-ln-rocket", { x: reach, y: () => -reach(), duration: 0.16, ease: "power2.in" }, LIFT_OFF + 0.02)
          .to(".js-ln-glow", { scale: 1.25, duration: 0.16 }, LIFT_OFF)
          .to(".js-ln-trail", { autoAlpha: 0, duration: 0.06 }, LIFT_OFF + 0.12);
      }

      tl.set({}, {}, 1);
    },
    { scope: root },
  );

  return (
    <section
      id="contact"
      ref={root}
      aria-labelledby="launch-title"
      className="pointer-events-none relative -mt-[100svh] h-[300svh]"
    >
      <div className="js-ln-panel invisible sticky top-0 h-svh overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgb(6_8_14/0.6)_0%,rgb(5_6_11/0.9)_70%)]" />
        <div
          aria-hidden
          className="js-ln-glow absolute inset-0 m-auto size-[min(46rem,120vw)] rounded-full bg-[radial-gradient(circle,rgb(255_96_48/0.2)_0%,rgb(120_40_20/0.12)_38%,transparent_68%)]"
        />

        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <div aria-hidden className="js-ln-rocket relative mb-8 sm:mb-10">
            <span className="absolute left-1/2 top-1/2 size-0 rotate-45">
              <span className="js-ln-trail block h-[45svh] w-[3px] origin-top -translate-x-1/2 scale-y-0 rounded-full bg-gradient-to-b from-orange-300 via-orange-500/50 to-transparent blur-[1px]" />
            </span>
            <span ref={flight} className="relative block">
              <span className="block animate-hover-float text-[clamp(2.6rem,5vw,3.6rem)] leading-none drop-shadow-[0_0_24px_rgb(255_120_60/0.45)]">
                🚀
              </span>
            </span>
          </div>

          <h2
            id="launch-title"
            className="text-[clamp(2.4rem,6vw,4.6rem)] font-bold leading-[1.05] tracking-[-0.035em] text-white"
          >
            {["Ready", "for", "lift-off?"].map((word) => (
              <span key={word} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
                <span className="js-ln-word inline-block">{word}</span>
                {word !== "lift-off?" && <span>&nbsp;</span>}
              </span>
            ))}
          </h2>

          {mode === "form" && (
            <form
              onSubmit={submit}
              className="js-ln-form pointer-events-auto invisible mt-8 grid w-full max-w-lg gap-3 text-left sm:mt-10 sm:grid-cols-2"
            >
              <label className="sr-only" htmlFor="ln-name">Name</label>
              <input id="ln-name" name="name" required autoComplete="name" placeholder="Your name" className={FIELD} />
              <label className="sr-only" htmlFor="ln-email">Email</label>
              <input id="ln-email" name="email" type="email" required autoComplete="email" placeholder="Email" className={FIELD} />
              <label className="sr-only" htmlFor="ln-message">Project</label>
              <textarea
                id="ln-message"
                name="message"
                required
                rows={3}
                data-lenis-prevent
                placeholder="What are we launching?"
                className={`${FIELD} resize-none sm:col-span-2`}
              />
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setMode("cta")}
                  className="min-h-11 px-2 text-sm text-slate-400 transition-colors hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-11 rounded-full bg-[#ff6b3d] px-7 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_36px_-8px_rgb(255_107_61/0.75)] transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-[#ff7d55] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
                >
                  Launch mission
                </button>
              </div>
            </form>
          )}

          {mode === "sent" && (
            <div role="status" className="js-ln-sent invisible mt-8 max-w-md sm:mt-10">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-300">Mission logged</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Your email app has opened with the details. Hit send and we&apos;ll be in touch.
              </p>
              <button
                type="button"
                onClick={() => setMode("cta")}
                className="pointer-events-auto mt-4 min-h-11 text-sm text-white/85 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                Back
              </button>
            </div>
          )}

          <div className={`mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:gap-4 ${mode === "cta" ? "" : "hidden"}`}>
            <button
              type="button"
              onClick={() => setMode("form")}
              className="js-ln-cta pointer-events-auto rounded-full bg-[#ff6b3d] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_36px_-8px_rgb(255_107_61/0.75)] transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-[#ff7d55] hover:shadow-[0_14px_44px_-8px_rgb(255_107_61/0.9)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
            >
              Start a mission
            </button>
            <Link
              href={PHONE.href}
              className="js-ln-cta pointer-events-auto rounded-full bg-[#070b14] px-7 py-3.5 text-sm text-white/85 ring-1 ring-white/15 transition-colors duration-300 hover:text-white hover:ring-white/35 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
            >
              {PHONE.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
