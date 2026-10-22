import type Lenis from "lenis";
import { prefersReducedMotion } from "./media";

let lenis: Lenis | null = null;

/** The page that owns smooth scrolling registers its Lenis instance here (null on teardown). */
export function registerLenis(instance: Lenis | null) {
  lenis = instance;
}

export function scrollToY(y: number) {
  const target = Math.max(0, y);
  if (lenis) {
    lenis.scrollTo(target, { duration: Math.min(2.6, 0.9 + Math.abs(target - window.scrollY) / 6000) });
  } else {
    window.scrollTo({ top: target, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
}

/**
 * Scrolls to an in-page section. Sections that overlap the previous one (negative top margin)
 * only show their sticky panel once they cover the viewport, so the target skips that run-in.
 */
export function scrollToHash(hash: string) {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id || id === "top" || id === "hero") {
    scrollToY(0);
    return true;
  }
  const el = document.getElementById(id);
  if (!el) return false;
  const overlap = Math.max(0, -parseFloat(getComputedStyle(el).marginTop) || 0);
  const top = el.getBoundingClientRect().top + window.scrollY;
  scrollToY(top + overlap + (overlap ? window.innerHeight * 0.12 : 0));
  return true;
}
