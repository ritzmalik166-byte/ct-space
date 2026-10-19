/*
 * Section 3 effect shaders. Colours are authored in display space; the materials
 * that use them disable tone mapping so emissive accents keep their exact hue.
 */

export const uvVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Display panel: thumbnail, scanlines, HUD overlay, hover/selected glow and power-on sweep. */
export const screenFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uHud;
  uniform vec3 uAccent;
  uniform float uTime;
  uniform float uHover;
  uniform float uSelected;
  uniform float uPower;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float boot = 1.0 - smoothstep(uPower - 0.08, uPower, 1.0 - uv.y);
    vec3 image = texture2D(uMap, uv).rgb;
    image = mix(vec3(dot(image, vec3(0.299, 0.587, 0.114))), image, 0.8) * 0.68;
    float scan = 0.94 + 0.06 * sin(uv.y * 900.0);
    float sweep = smoothstep(0.0, 0.04, 0.04 - abs(fract(uv.y - uTime * 0.07) - 0.5)) * 0.06;
    vec2 d = abs(uv - 0.5) * 2.0;
    float vignette = 1.0 - smoothstep(0.55, 1.15, length(d * vec2(0.85, 1.0)));
    vec3 color = image * scan * (0.55 + 0.45 * vignette) + uAccent * sweep;

    vec4 hud = texture2D(uHud, uv);
    color = mix(color, hud.rgb, hud.a);

    float edge = max(d.x, d.y);
    float rim = smoothstep(0.93, 1.0, edge);
    float lift = 0.35 * uHover + 0.55 * uSelected;
    color *= 1.0 + lift * 0.35;
    color += uAccent * rim * (0.25 + lift);
    color = mix(vec3(0.01, 0.015, 0.03), color, boot);
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Volumetric-looking projector beam: brighter at the lens, soft at the edges, slow dust. */
export const beamVertex = /* glsl */ `
  attribute float aAlong;
  attribute float aAcross;
  varying float vAlong;
  varying float vAcross;
  varying vec3 vWorld;
  void main() {
    vAlong = aAlong;
    vAcross = aAcross;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const beamFragment = /* glsl */ `
  uniform float uIntensity;
  uniform float uTime;
  uniform vec3 uColor;
  varying float vAlong;
  varying float vAcross;
  varying vec3 vWorld;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    float edge = smoothstep(0.0, 0.35, vAcross) * smoothstep(1.0, 0.65, vAcross);
    float falloff = mix(1.0, 0.35, vAlong);
    float dust = 0.85 + 0.3 * hash(floor(vWorld * 14.0 + vec3(0.0, uTime * 0.6, 0.0)));
    float a = uIntensity * edge * falloff * dust * 0.22;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/** Projection surface behind the HTML panel: glass fill, gold frame, faint grid, scan sweep. */
export const surfaceFragment = /* glsl */ `
  uniform float uReveal;
  uniform float uTime;
  uniform vec2 uSize;
  varying vec2 vUv;

  void main() {
    float open = smoothstep(0.0, 1.0, uReveal);
    float half_ = 0.5 * open;
    if (abs(vUv.y - 0.5) > half_ + 0.002) discard;
    vec2 px = vUv * uSize;
    float border = min(min(px.x, uSize.x - px.x), min(px.y, uSize.y - px.y));
    float frame = 1.0 - smoothstep(0.0, 0.025, border);
    float glow = exp(-border * 9.0);
    vec2 cell = abs(fract(px * 4.0) - 0.5);
    float grid = smoothstep(0.485, 0.5, max(cell.x, cell.y)) * 0.05;
    float sweep = exp(-pow((vUv.y - fract(uTime * 0.12)) * 18.0, 2.0)) * 0.08;
    float seam = exp(-pow((abs(vUv.y - 0.5) - half_) * 120.0, 2.0)) * (1.0 - open * 0.6);
    vec3 gold = vec3(0.96, 0.82, 0.46);
    vec3 cyan = vec3(0.45, 0.85, 1.0);
    vec3 color = vec3(0.02, 0.05, 0.09) * 0.6 + cyan * (grid + sweep) + gold * (frame * 0.9 + glow * 0.35) + cyan * seam;
    float alpha = clamp(0.22 + frame + glow * 0.4 + seam, 0.0, 1.0) * open;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Fresnel shell for the AI core and other glowing volumes. */
export const fresnelVertex = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const fresnelFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir))), uPower);
    float a = f * uIntensity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/** Open cone of light (pedestal emitter, bay floods): fades along its height and toward the rim. */
export const coneFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float a = uIntensity * pow(1.0 - vUv.y, 1.6) * 0.35;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/** Light spilling out of the opened bay, strongest at the floor. */
export const spillFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    vec2 d = abs(vUv - 0.5) * 2.0;
    float a = uIntensity * (1.0 - smoothstep(0.6, 1.0, d.x)) * mix(0.55, 1.0, 1.0 - vUv.y) * (1.0 - smoothstep(0.7, 1.0, d.y));
    vec3 color = mix(vec3(0.55, 0.85, 1.0), vec3(1.0, 0.86, 0.6), 1.0 - vUv.y);
    gl_FragColor = vec4(color * a, a);
  }
`;
