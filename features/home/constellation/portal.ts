import gsap from "gsap";

type PortalParts = { section: HTMLElement; panel: HTMLElement; stage: HTMLElement; rim: HTMLElement };

/** Rim artwork is drawn at this radius; it's scaled to follow the hole. */
const RIM_RADIUS = 100;

/**
 * Exit while the panel is pinned: the orbit system tilts back into a 3D disc (logos stay upright), the view
 * dives towards the core, and a portal opens from the core's exact centre onto the 3D network behind the page.
 * Call inside a GSAP context; returns a cleanup that clears the inline clip.
 */
export function portalExit({ section, panel, stage, rim }: PortalParts) {
  const portal = { t: 0 };
  let cx = 0;
  let cy = 0;
  let maxR = 0;

  // Layout offsets, not bounding rects, so the arrival tilt or the disc zoom can't skew the centre.
  const measure = () => {
    const w = panel.clientWidth;
    const h = panel.clientHeight;
    cx = w / 2;
    cy = stage.offsetTop + stage.offsetHeight / 2;
    maxR = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) + 40;
    rim.style.left = `${cx}px`;
    rim.style.top = `${cy}px`;
    apply();
  };

  // An even-odd path punches a circular hole through the panel; the rim's glow rides just outside its edge.
  const apply = () => {
    const r = portal.t * maxR;
    if (r < 0.5) {
      panel.style.clipPath = "";
      rim.style.visibility = "hidden";
      return;
    }
    const w = panel.clientWidth;
    const h = panel.clientHeight;
    panel.style.clipPath = `path(evenodd, "M0 0H${w}V${h}H0Z M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z")`;
    rim.style.visibility = "visible";
    rim.style.opacity = String(1 - portal.t * 0.7);
    rim.style.transform = `translate(-50%, -50%) scale(${(r + 3) / RIM_RADIUS})`;
  };

  gsap
    .timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: 1, onRefresh: measure },
    })
    .to(".js-cn-head", { y: -60, autoAlpha: 0, duration: 0.18, ease: "power2.in" }, 0.04)
    .fromTo(stage, { "--cn-tilt": "0deg" }, { "--cn-tilt": "62deg", duration: 0.38, ease: "sine.inOut" }, 0)
    .fromTo(stage, { "--cn-zoom": 1 }, { "--cn-zoom": 1.12, duration: 0.38, ease: "sine.inOut" }, 0)
    .to(stage, { "--cn-zoom": 4, duration: 0.5, ease: "power2.in" }, 0.4)
    .to(".js-cn-badge", { autoAlpha: 0, scale: 0.6, duration: 0.14, stagger: 0.02 }, 0.48)
    .to(".js-cn-orbit", { autoAlpha: 0, duration: 0.22, stagger: { each: 0.05, from: "end" } }, 0.58)
    .to(".js-cn-glow", { scale: 2.4, duration: 0.45, ease: "power2.in" }, 0.45)
    .fromTo(portal, { t: 0 }, { t: 1, duration: 0.42, ease: "power2.in", onUpdate: apply }, 0.58);

  return () => {
    panel.style.clipPath = "";
    rim.style.visibility = "hidden";
  };
}

export const PORTAL_RIM_SIZE = RIM_RADIUS * 2;
