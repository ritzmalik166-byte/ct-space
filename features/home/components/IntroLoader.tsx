"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/media";
import { INTRO_DONE_EVENT, scene, SCENE_READY_EVENT } from "../lib/store";

const MIN_VISIBLE_MS = 1100;
/** Without WebGL the scene never reports ready, so the loader gives up after this. */
const MAX_VISIBLE_MS = 7000;
const LOGO = "/images/contenaissance-logo.webp";
const RISE = "animate-[rise_0.9s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none";

/** Server-rendered cover with the brand logo catching a light sweep until the 3D scene has compiled. */
export function IntroLoader() {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || !bar.current || !pct.current) return;
    const shownAt = performance.now();
    const quick = prefersReducedMotion();
    const progress = { v: 0 };
    let done = false;
    let tween: gsap.core.Timeline | undefined;

    const render = () => {
      gsap.set(bar.current, { scaleX: progress.v });
      pct.current!.textContent = `${Math.round(progress.v * 100)}`.padStart(2, "0");
    };
    // The scene reports only "ready", so creep toward 90% and finish on the real signal.
    const creep = gsap.to(progress, { v: 0.9, duration: MAX_VISIBLE_MS / 1000, ease: "expo.out", onUpdate: render });

    const hide = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt)) / 1000;
      creep.kill();
      tween = gsap
        .timeline({ onComplete: () => gsap.set(el, { display: "none" }) })
        .to(progress, { v: 1, duration: quick ? 0.1 : Math.max(0.45, wait), ease: "power2.inOut", onUpdate: render })
        .call(() => {
          scene.introDone = true;
          window.dispatchEvent(new Event(INTRO_DONE_EVENT));
        })
        .to(el.querySelector(".js-ld-meta"), { autoAlpha: 0, y: 8, duration: quick ? 0.15 : 0.35, ease: "power2.in" })
        .to(
          el.querySelector(".js-ld-mark"),
          { scale: quick ? 1 : 1.08, autoAlpha: 0, duration: quick ? 0.2 : 0.6, ease: "power2.in" },
          "<",
        )
        .to(el, { autoAlpha: 0, duration: quick ? 0.2 : 0.7, ease: "power2.out" }, quick ? ">" : "<0.25");
    };

    if (scene.ready) hide();
    window.addEventListener(SCENE_READY_EVENT, hide);
    const fallback = window.setTimeout(hide, MAX_VISIBLE_MS);

    return () => {
      window.removeEventListener(SCENE_READY_EVENT, hide);
      window.clearTimeout(fallback);
      creep.kill();
      tween?.kill();
    };
  }, []);

  return (
    <div
      ref={root}
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[70] grid place-items-center overflow-hidden bg-space"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 animate-breathe rounded-full bg-[radial-gradient(closest-side,rgb(200_144_31/0.16),rgb(200_144_31/0.05)_55%,transparent)] motion-reduce:animate-none"
      />

      <div className="relative flex flex-col items-center">
        <div className={`js-ld-mark relative w-[min(62vw,16rem)] ${RISE}`}>
          <Image
            src={LOGO}
            width={274}
            height={133}
            alt="Contenaissance — Ritz GenAI Storytelling Studios"
            loading="eager"
            fetchPriority="high"
            className="h-auto w-full"
          />
          {/* Light band clipped to the logo's own alpha so only the gold catches it. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden mix-blend-plus-lighter [mask-image:url(/images/contenaissance-logo.webp)] [mask-size:100%_100%] motion-reduce:hidden"
          >
            <div className="h-full w-1/3 animate-[sweep_2.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[#fff3c4]/80 to-transparent" />
          </div>
        </div>

        <div className={`js-ld-meta mt-9 flex flex-col items-center gap-3 [animation-delay:0.25s] ${RISE}`}>
          <div className="relative flex items-center">
            <div className="relative h-px w-40 overflow-hidden bg-white/10">
              <div
                ref={bar}
                className="absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-[#b98318] via-[#f7d27a] to-[#b98318]"
              />
            </div>
            <span className="absolute left-full ml-3 font-mono text-[10px] tabular-nums tracking-[0.12em] text-[#c8a24d]">
              <span ref={pct}>00</span>%
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-slate-500">Calibrating the cosmos</span>
        </div>
      </div>
    </div>
  );
}
