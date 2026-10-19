/**
 * Solar-system and spacecraft effect shaders. Planet surfaces use textured
 * MeshStandardMaterial; these cover what PBR materials can't: the animated
 * photosphere, corona and prominences, heat glow and engine exhaust.
 */

const NOISE = /* glsl */ `
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise3(p);
      p = p * 2.02 + vec3(1.7, 9.2, 3.4);
      a *= 0.5;
    }
    return v;
  }
`;

export const voyageVertex = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vUv;

  void main() {
    vObj = position;
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/** Photosphere: the sun map, gently domain-warped over time, with limb darkening and HDR core for bloom. */
export const sunFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uOpacity;

  varying vec3 vObj;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vUv;

  ${NOISE}

  void main() {
    vec3 n = normalize(vObj);
    vec2 warp = vec2(
      fbm(n * 3.0 + vec3(uTime * 0.02, 0.0, 0.0)),
      fbm(n * 3.0 + vec3(5.2, uTime * 0.017, 1.3))
    ) - 0.5;
    vec2 uv = vUv + vec2(uTime * 0.0025, 0.0) + warp * 0.018;
    vec3 tex = texture2D(uMap, uv).rgb;
    float cells = fbm(n * 38.0 + vec3(uTime * 0.05));
    float flare = smoothstep(0.55, 0.85, fbm(n * 5.0 - vec3(uTime * 0.01)));

    vec3 V = normalize(cameraPosition - vWorld);
    float mu = clamp(dot(normalize(vNormalW), V), 0.0, 1.0);
    float limb = 0.45 + 0.55 * pow(mu, 0.55);

    // Deep orange photosphere with hot gold filaments rather than a flat yellow disc.
    float heat = dot(tex, vec3(0.3, 0.55, 0.15));
    float hot = smoothstep(0.45, 0.95, heat);
    vec3 base = mix(vec3(0.42, 0.08, 0.01), vec3(1.0, 0.42, 0.06), smoothstep(0.2, 0.75, heat));
    vec3 color = base * (0.9 + 0.35 * cells) + vec3(1.0, 0.72, 0.3) * pow(hot, 2.0) * 1.6;
    color += vec3(1.0, 0.6, 0.2) * flare * 0.35;
    color *= limb;
    color = mix(color, vec3(1.0, 0.45, 0.1) * 1.3, pow(1.0 - mu, 3.0) * 0.55);
    gl_FragColor = vec4(color, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Corona + prominences on a back-facing shell around the sun. The glow is a
 * function of the view ray's closest approach to the sun's centre, so it hugs
 * the visible limb and stays tight instead of becoming a flat halo.
 */
export const coronaFragment = /* glsl */ `
  uniform vec3 uCenter;
  uniform float uRadius;
  uniform float uShell;
  uniform float uTime;
  uniform float uOpacity;

  varying vec3 vWorld;

  ${NOISE}

  void main() {
    vec3 V = normalize(vWorld - cameraPosition);
    vec3 oc = uCenter - cameraPosition;
    float t = dot(oc, V);
    vec3 closest = cameraPosition + V * t;
    vec3 radial = closest - uCenter;
    float rho = length(radial) / uRadius;
    if (rho < 1.0) discard;
    vec3 dir = normalize(radial);
    float h = (rho - 1.0) / (uShell - 1.0);

    float glow = exp(-h * 6.0) * 1.0 + exp(-h * 2.2) * 0.22;
    float streak = fbm(dir * 6.0 + vec3(0.0, 0.0, uTime * 0.03));
    float rays = mix(0.65, 1.35, streak);
    float flare = pow(smoothstep(0.55, 0.85, fbm(dir * 3.2 + vec3(uTime * 0.02, 0.0, 0.0))), 2.0);
    float prominence = flare * exp(-h * 4.2) * smoothstep(0.0, 0.04, h) * (0.6 + 0.4 * fbm(dir * 18.0 + vec3(0.0, h * 6.0 - uTime * 0.2, 0.0)));

    vec3 color = vec3(1.0, 0.56, 0.18) * glow * rays + vec3(1.0, 0.42, 0.1) * prominence * 1.6;
    float alpha = clamp((glow * rays + prominence) * uOpacity, 0.0, 1.0);
    gl_FragColor = vec4(color * uOpacity, alpha);
  }
`;

export const heatFragment = /* glsl */ `
  uniform float uHeat;
  varying vec3 vObj;
  varying vec3 vWorld;
  varying vec3 vNormalW;

  void main() {
    float along = clamp((vObj.x + 2.2) / 4.8, 0.0, 1.0);
    float nose = smoothstep(0.55, 0.98, along);
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(normalize(vNormalW), V), 0.0), 2.4);
    float alpha = nose * fres * uHeat * 0.85;
    vec3 color = mix(vec3(1.0, 0.45, 0.1), vec3(1.0, 0.9, 0.75), fres);
    gl_FragColor = vec4(color * 1.6, alpha);
  }
`;

export const plumeVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vFacing = abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`;

/** Gold exhaust sheath: white-hot at the nozzle, cooling to amber along the trail. */
export const plumeFragment = /* glsl */ `
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vFacing;

  void main() {
    float along = vUv.y;
    float core = pow(vFacing, 1.6);
    float fade = pow(1.0 - along, 1.35) * smoothstep(0.0, 0.04, along + 0.02);
    vec3 hot = vec3(1.0, 0.92, 0.75);
    vec3 color = mix(hot, uColor, smoothstep(0.0, 0.35, along));
    float alpha = core * fade * uIntensity;
    gl_FragColor = vec4(color * (1.0 + 1.8 * (1.0 - along)) * alpha, alpha);
  }
`;

/** Sparks streaming back from a nozzle; positions come entirely from seeds and time. */
export const exhaustVertex = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uEngine;
  uniform float uLength;
  uniform float uRadius;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vLife;

  void main() {
    float life = fract(aSeed.x + uTime * (0.55 + aSeed.w * 0.35));
    float spread = uRadius * aSeed.z * (0.35 + life * 1.4);
    vec3 p = vec3(-life * uLength * (0.25 + uEngine), cos(aSeed.y) * spread, sin(aSeed.y) * spread);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vLife = life;
    gl_PointSize = uSize * aSeed.w * (1.0 - life * 0.7) * uPixelRatio * uEngine / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`;

export const exhaustFragment = /* glsl */ `
  uniform float uEngine;
  varying float vLife;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float a = (1.0 - d * 4.0) * (1.0 - vLife) * uEngine;
    vec3 color = mix(vec3(1.0, 0.9, 0.65), vec3(1.0, 0.55, 0.15), vLife);
    gl_FragColor = vec4(color * a * 1.5, a);
  }
`;
