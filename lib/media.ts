/** Browser-only media checks; call from effects or event handlers, never during render. */
export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const canHover = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
