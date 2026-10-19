import type Lenis from "lenis";

let instance: Lenis | null = null;

export function registerLenis(lenis: Lenis | null) {
  instance = lenis;
}

/** Freezes page scrolling (e.g. while a modal surface is open) without moving the current position. */
export function setScrollLocked(locked: boolean) {
  if (instance) {
    if (locked) instance.stop();
    else instance.start();
    return;
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

/** Scrolls through Lenis when it is active, otherwise natively (reduced motion disables Lenis). */
export function scrollToY(y: number, { immediate = false } = {}) {
  if (instance) {
    instance.scrollTo(y, { duration: immediate ? 0 : 1.2, immediate });
    return;
  }
  window.scrollTo({ top: y, behavior: immediate ? "auto" : "smooth" });
}
