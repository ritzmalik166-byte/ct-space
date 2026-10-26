import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ORBITS } from "./data";
import { orbitPoint, VIEW } from "./geometry";

/**
 * Moves each `.js-cn-rider` along its orbit on the GSAP ticker while the section is on screen.
 * Each rider keeps its own clock so a hovered logo stops while the rest keep orbiting.
 * Call inside a GSAP context; returns the listener/observer cleanup.
 */
export function startRiders(section: HTMLElement, stage: HTMLElement, reduced: boolean) {
  const riders = gsap.utils.toArray<HTMLElement>(".js-cn-rider", section);
  if (!riders.length) return () => {};

  const slots = ORBITS.flatMap((orbit) => orbit.partners.map((_, i) => ({ orbit, offset: i / orbit.partners.length })));
  const elapsed = riders.map(() => 0);
  const held = riders.map(() => false);
  let scale = stage.clientWidth / VIEW.w;

  const place = () => {
    riders.forEach((el, i) => {
      const { orbit, offset } = slots[i];
      const p = orbitPoint(orbit.w, orbit.h, offset + ((orbit.reverse ? -1 : 1) * elapsed[i]) / orbit.lap);
      el.style.transform = `translate3d(${(p.x - VIEW.x) * scale}px, ${(p.y - VIEW.y) * scale}px, 0)`;
    });
  };

  const tick = (_: number, deltaMs: number) => {
    const step = Math.min(deltaMs, 100) / 1000;
    held.forEach((stopped, i) => {
      if (!stopped) elapsed[i] += step;
    });
    place();
  };

  const offs = riders.map((el, i) => {
    const hold = () => (held[i] = true);
    const release = () => (held[i] = false);
    el.addEventListener("pointerenter", hold);
    el.addEventListener("pointerleave", release);
    el.addEventListener("focusin", hold);
    el.addEventListener("focusout", release);
    return () => {
      el.removeEventListener("pointerenter", hold);
      el.removeEventListener("pointerleave", release);
      el.removeEventListener("focusin", hold);
      el.removeEventListener("focusout", release);
    };
  });

  const observer = new ResizeObserver(() => {
    scale = stage.clientWidth / VIEW.w;
    place();
  });
  observer.observe(stage);
  place();

  ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => {
      section.toggleAttribute("data-paused", !self.isActive);
      if (reduced) return;
      if (self.isActive) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    },
  });

  return () => {
    gsap.ticker.remove(tick);
    observer.disconnect();
    offs.forEach((off) => off());
  };
}
