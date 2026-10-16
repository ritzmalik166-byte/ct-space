import { SHARED_POINT_FRAGMENT } from "./morphParticles";

/**
 * Galaxy detail particles. Rotation matches the morphing galaxy exactly so the
 * two layers read as one structure; uVisible dissolves the layer outward as
 * the scroll morph begins.
 */
export const galaxyDetailVertex = /* glsl */ `
  uniform float uTime;
  uniform float uMotion;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uVisible;

  attribute vec3 aColor;
  attribute float aSize;
  attribute vec2 aMeta;

  varying vec3 vColor;
  varying float vAlpha;

  vec2 rotate2(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
  }

  void main() {
    float phase = aMeta.x;
    float seed = aMeta.y;
    float t = uTime * uMotion;

    vec3 p = position;
    float r = length(p.xz);
    float inner = 1.0 - smoothstep(0.0, 3.2, r);
    float angle = t * 0.05
      + sin(t * 0.11) * 0.1 * inner
      + sin(t * (0.3 + 0.55 * inner) + phase * 6.2831) * 0.03 / (0.6 + r);
    p.xz = rotate2(p.xz, angle);
    // Delicate drifting of the fine dust.
    p.y += sin(t * 0.4 + phase * 6.2831) * 0.01;
    p.xz *= 1.0 + sin(t * 0.23 + seed * 6.2831) * 0.004;

    // Dissolve outward and thin out as the morph takes over.
    float out_ = 1.0 - uVisible;
    p.xz *= 1.0 + out_ * (0.25 + seed * 0.45);
    p.y += (seed - 0.5) * out_ * 1.4;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = max(aSize * uSize * uPixelRatio / depth, uPixelRatio);

    float twinkle = 0.86 + 0.14 * sin(t * 1.7 + phase * 50.0);
    float depthFade = clamp(1.3 - (depth - 9.0) * 0.16, 0.3, 1.0);
    vAlpha = depthFade * twinkle * uVisible * uVisible;
    vColor = aColor;
  }
`;

export const galaxyDetailFragment = SHARED_POINT_FRAGMENT;
