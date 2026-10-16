export interface HeroQuality {
  particleCount: number;
  /** Galaxy-only fine stars and dust (not part of the morph). */
  galaxyDetailCount: number;
  /** Character-only dense particle skin (not part of the morph). */
  humanDetailCount: number;
  starCount: number;
  maxDpr: number;
  isMobile: boolean;
}

export const MOBILE_QUERY = "(max-width: 767px)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const ok = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

/** Picks particle budgets once on mount; never re-evaluated on resize. */
export function detectHeroQuality(): HeroQuality {
  const isMobile = window.matchMedia(MOBILE_QUERY).matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const lowEnd = cores <= 4 || memory <= 4;

  if (isMobile) {
    return {
      particleCount: lowEnd ? 11000 : 15000,
      galaxyDetailCount: lowEnd ? 9000 : 18000,
      humanDetailCount: lowEnd ? 22000 : 36000,
      starCount: 500,
      maxDpr: 1.5,
      isMobile,
    };
  }
  return {
    particleCount: lowEnd ? 20000 : 34000,
    galaxyDetailCount: lowEnd ? 28000 : 60000,
    humanDetailCount: lowEnd ? 60000 : 110000,
    starCount: 1300,
    maxDpr: lowEnd ? 1.5 : 2,
    isMobile,
  };
}
