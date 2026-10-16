/**
 * Eye laser: two camera-facing ribbons (left dominant, right weaker) built in
 * view space from world-space start/end uniforms, so one static geometry
 * serves every frame and target.
 */
const BEAM_COMMON = /* glsl */ `
  uniform vec3 uStartL;
  uniform vec3 uStartR;
  uniform vec3 uEnd;
  uniform float uReach;
  uniform float uIntensity;
  uniform float uTime;
  uniform float uMotion;
`;

/**
 * The hero's readability gradient (Section1) darkens the canvas under the
 * text column; boost the laser there so the beam visibly reaches its target.
 * Mirrors that gradient: horizontal on desktop, bottom-up when stacked.
 */
const SHADE_COMPENSATION = /* glsl */ `
  uniform vec2 uResolution;
  uniform float uStacked;

  float shadeCompensation() {
    vec2 f = gl_FragCoord.xy / uResolution;
    float a = uStacked > 0.5
      ? (f.y < 0.45 ? mix(1.0, 0.7, f.y / 0.45) : mix(0.7, 0.0, clamp((f.y - 0.45) / 0.25, 0.0, 1.0)))
      : (f.x < 0.4 ? mix(0.85, 0.35, f.x / 0.4) : mix(0.35, 0.0, clamp((f.x - 0.4) / 0.2, 0.0, 1.0)));
    return min(1.0 / (1.0 - a * 0.85), 3.5);
  }
`;

export const laserBeamVertex = /* glsl */ `
  ${BEAM_COMMON}
  uniform float uWidth;
  attribute float aBeam;
  varying vec2 vUv;
  varying float vBeam;

  void main() {
    vec3 s = (viewMatrix * vec4(mix(uStartL, uStartR, aBeam), 1.0)).xyz;
    vec3 e = (viewMatrix * vec4(uEnd, 1.0)).xyz;
    vec3 dir = e - s;
    vec2 side = normalize(vec2(-dir.y, dir.x) + 1e-6);
    float t = position.x;
    vec3 p = s + dir * (t * uReach);
    float w = uWidth * mix(0.45, 1.0, t) * mix(1.0, 0.75, aBeam);
    p.xy += side * position.y * w;
    vUv = vec2(t, position.y);
    vBeam = aBeam;
    gl_Position = projectionMatrix * vec4(p, 1.0);
  }
`;

export const laserBeamFragment = /* glsl */ `
  ${BEAM_COMMON}
  ${SHADE_COMPENSATION}
  uniform float uPulse;
  varying vec2 vUv;
  varying float vBeam;

  void main() {
    float t = vUv.x;
    float s = vUv.y;
    float core = exp(-s * s * 60.0);
    float halo = exp(-s * s * 4.5) * 0.24;
    float ends = smoothstep(0.0, 0.06, t) * (0.7 + 0.3 * smoothstep(0.6, 1.0, t));
    // Data packets travelling eye → target, plus the one-off formation pulse.
    float packets = pow(max(0.0, sin((t * 6.0 - uTime * 2.6) * 3.14159)), 30.0) * 0.7 * uMotion;
    float head = exp(-pow((t - uPulse) * 12.0, 2.0)) * 1.6;
    float shimmer = 1.0 - 0.1 * uMotion * (0.5 + 0.5 * sin(t * 85.0 - uTime * 22.0));
    float strength = mix(1.0, 0.5, vBeam);

    vec3 coreColor = vec3(0.95, 0.93, 1.0);
    vec3 haloColor = vec3(0.5, 0.38, 1.0);
    vec3 color = coreColor * core * (1.0 + packets + head) * shimmer
      + haloColor * halo * (1.0 + packets * 0.8 + head * 0.6);
    gl_FragColor = vec4(color * shadeCompensation(), uIntensity * strength * ends);
  }
`;

/** Stream particles along each beam (kind 0), eye flares (1) and the impact glow (2). */
export const laserSparksVertex = /* glsl */ `
  ${BEAM_COMMON}
  uniform float uPixelRatio;
  uniform float uFlare;
  uniform float uImpact;
  attribute float aBeam;
  attribute float aKind;
  attribute float aSeed;
  varying float vAlpha;
  varying float vCore;

  void main() {
    vec3 start = mix(uStartL, uStartR, aBeam);
    float strength = mix(1.0, 0.55, aBeam);
    vec3 s = (viewMatrix * vec4(start, 1.0)).xyz;
    vec3 e = (viewMatrix * vec4(uEnd, 1.0)).xyz;
    vec3 p;
    float size;

    if (aKind < 0.5) {
      float speed = 0.45 + fract(aSeed * 13.7) * 0.55;
      float t = fract(aSeed * 7.31 + uTime * speed) * uReach;
      vec3 dir = e - s;
      vec2 side = normalize(vec2(-dir.y, dir.x) + 1e-6);
      p = s + dir * t;
      p.xy += side * (fract(aSeed * 91.3) - 0.5) * 0.045;
      size = 1.6 + fract(aSeed * 5.1) * 2.2;
      vAlpha = uIntensity * strength * smoothstep(0.0, 0.08, t) * (0.45 + 0.55 * fract(aSeed * 3.3));
      vCore = 1.0;
    } else if (aKind < 1.5) {
      p = s;
      p.z += 0.02;
      size = 30.0 * strength;
      vAlpha = uFlare * strength;
      vCore = 0.35;
    } else {
      p = e;
      size = 34.0 + 6.0 * sin(uTime * 7.0) * uMotion;
      vAlpha = uImpact;
      vCore = 0.3;
    }

    gl_PointSize = size * uPixelRatio;
    gl_Position = projectionMatrix * vec4(p, 1.0);
  }
`;

export const laserSparksFragment = /* glsl */ `
  ${SHADE_COMPENSATION}
  varying float vAlpha;
  varying float vCore;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d2 = dot(c, c) * 4.0;
    if (d2 > 1.0) discard;
    float core = exp(-d2 * 18.0 / vCore);
    float halo = exp(-d2 * 4.0) * 0.4;
    vec3 color = mix(vec3(0.55, 0.42, 1.0), vec3(0.96, 0.94, 1.0), core / (core + halo + 1e-4));
    gl_FragColor = vec4(color * shadeCompensation(), (core + halo) * vAlpha);
  }
`;
