"use client";

import { useEffect, useRef, type PointerEvent, type Ref, type RefObject } from "react";
import gsap from "gsap";
import { canHover, prefersReducedMotion } from "@/lib/media";

type Movers = { rx: gsap.QuickToFunc; ry: gsap.QuickToFunc; gx?: gsap.QuickToFunc; gy?: gsap.QuickToFunc };
type TiltOptions = { x?: number; y?: number; perspective?: number };

/**
 * Pointer tilt for cards: rotates `target` (degrees per half card) and steers an optional glow
 * toward the cursor. Transform-only and skipped on touch screens and under reduced motion.
 */
export function useTilt(
  target: RefObject<HTMLElement | null>,
  glow?: RefObject<HTMLElement | null>,
  { x = 6, y = 8, perspective }: TiltOptions = {},
) {
  const movers = useRef<Movers | null>(null);

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    if (perspective) gsap.set(el, { transformPerspective: perspective });
    const g = glow?.current;
    movers.current = {
      rx: gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3" }),
      ry: gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3" }),
      gx: g ? gsap.quickTo(g, "x", { duration: 0.45, ease: "power3" }) : undefined,
      gy: g ? gsap.quickTo(g, "y", { duration: 0.45, ease: "power3" }) : undefined,
    };
    return () => {
      movers.current = null;
      gsap.killTweensOf(g ? [el, g] : el);
    };
  }, [target, glow, perspective]);

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const m = movers.current;
    if (!m || !canHover() || prefersReducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    m.rx(-(py / r.height - 0.5) * x);
    m.ry((px / r.width - 0.5) * y);
    m.gx?.(px);
    m.gy?.(py);
  };

  const onPointerLeave = () => {
    movers.current?.rx(0);
    movers.current?.ry(0);
  };

  return { onPointerMove, onPointerLeave };
}

/** Soft cyan light that follows the cursor; place inside the tilted card (needs a `group` ancestor). */
export function TiltGlow({ glow }: { glow: Ref<HTMLSpanElement> }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
      <span
        ref={glow}
        className="absolute -left-32 -top-32 size-64 rounded-full bg-[radial-gradient(circle,rgb(34_211_238/0.16)_0%,transparent_65%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
    </span>
  );
}
