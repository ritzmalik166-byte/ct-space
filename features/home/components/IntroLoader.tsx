"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/media";
import { INTRO_DONE_EVENT, scene, SCENE_READY_EVENT } from "../lib/store";

const MIN_VISIBLE_MS = 900;
/** Without WebGL the scene never reports ready, so the loader gives up after this. */
const MAX_VISIBLE_MS = 7000;
const INFINITY = "M50 25C38 9 10 9 10 25s28 16 40 0 40-16 40 0-28 16-40 0z";

/** Server-rendered cover with the gold infinity mark drawing itself until the 3D scene has compiled. */
export function IntroLoader() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const shownAt = performance.now();
    let done = false;
    let tween: gsap.core.Timeline | undefined;

    const hide = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt)) / 1000;
      const quick = prefersReducedMotion();
      tween = gsap
        .timeline({ delay: quick ? 0 : wait, onComplete: () => gsap.set(el, { display: "none" }) })
        .call(() => {
          scene.introDone = true;
          window.dispatchEvent(new Event(INTRO_DONE_EVENT));
        })
        .to(el.querySelector(".js-ld-mark"), { scale: quick ? 1 : 1.12, autoAlpha: 0, duration: quick ? 0.2 : 0.55, ease: "power2.in" })
        .to(el, { autoAlpha: 0, duration: quick ? 0.2 : 0.7, ease: "power2.out" }, quick ? 0 : 0.25);
    };

    if (scene.ready) hide();
    window.addEventListener(SCENE_READY_EVENT, hide);
    const fallback = window.setTimeout(hide, MAX_VISIBLE_MS);

    return () => {
      window.removeEventListener(SCENE_READY_EVENT, hide);
      window.clearTimeout(fallback);
      tween?.kill();
    };
  }, []);

  return (
    <div
      ref={root}
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[70] grid place-items-center bg-space"
    >
      <div className="js-ld-mark flex flex-col items-center gap-5">
        <svg viewBox="0 0 100 50" className="h-14 w-auto overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="loader-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f7d27a" />
              <stop offset="0.5" stopColor="#c8901f" />
              <stop offset="1" stopColor="#f3c55c" />
            </linearGradient>
          </defs>
          <path d={INFINITY} fill="none" stroke="rgb(200 162 77 / 0.14)" strokeWidth="8" strokeLinecap="round" />
          <path
            d={INFINITY}
            pathLength={1}
            fill="none"
            stroke="url(#loader-gold)"
            strokeWidth="8"
            strokeLinecap="round"
            className="animate-draw [stroke-dasharray:0.35_0.65] motion-reduce:animate-none motion-reduce:[stroke-dasharray:none]"
          />
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-slate-500">Calibrating the cosmos</span>
      </div>
    </div>
  );
}
