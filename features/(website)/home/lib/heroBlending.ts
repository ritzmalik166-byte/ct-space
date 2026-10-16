import { CustomBlending, OneFactor, SrcAlphaFactor, ZeroFactor } from "three";

/**
 * Additive colour that leaves the canvas alpha untouched. The hero canvas is
 * transparent over the page's glow gradients; standard additive blending also
 * accumulates alpha, which would hide that glow behind dense glowing layers.
 */
export const ADDITIVE_GLOW = {
  blending: CustomBlending,
  blendSrc: SrcAlphaFactor,
  blendDst: OneFactor,
  blendSrcAlpha: ZeroFactor,
  blendDstAlpha: OneFactor,
  transparent: true,
  depthWrite: false,
} as const;