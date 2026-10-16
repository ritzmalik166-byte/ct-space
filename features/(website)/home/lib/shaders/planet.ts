/*
 * Procedural planets: 3D value-noise terrain or banded gas, Worley craters,
 * soft terminator lighting from the galaxy core, and a fresnel atmosphere.
 * Colours are authored in display (sRGB) space like the particle shaders.
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
      mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise3(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return v;
  }

  // Distance to the nearest jittered cell point (crater centres).
  float worley(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    float d = 1.0;
    for (int z = -1; z <= 1; z++)
    for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec3 o = vec3(float(x), float(y), float(z));
      vec3 c = o + vec3(hash3(i + o), hash3(i + o + 19.1), hash3(i + o + 47.3)) - f;
      d = min(d, dot(c, c));
    }
    return sqrt(d);
  }
`;

export const planetVertex = /* glsl */ `
  varying vec3 vObjNormal;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vObjNormal = normal;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const planetFragment = /* glsl */ `
  uniform float uTime;
  uniform float uSpin;
  uniform float uSeed;
  uniform float uKind;
  uniform float uOpacity;
  uniform vec3 uLightDir;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform vec3 uAtmo;
  uniform float uAtmoStrength;
  uniform float uCraters;

  varying vec3 vObjNormal;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  ${NOISE}

  void main() {
    float a = uTime * uSpin;
    vec3 n = normalize(vObjNormal);
    vec3 q = vec3(cos(a) * n.x - sin(a) * n.z, n.y, sin(a) * n.x + cos(a) * n.z) + uSeed;

    vec3 albedo;
    if (uKind < 0.5) {
      // Rocky / icy: continents, fine regolith detail and craters.
      float h = fbm(q * 2.2);
      float fine = fbm(q * 9.0);
      albedo = mix(uColorA, uColorB, smoothstep(0.38, 0.68, h));
      albedo = mix(albedo, uColorC, (1.0 - smoothstep(0.3, 0.55, h)) * 0.6);
      albedo *= 0.85 + fine * 0.3;
      float d = worley(q * 3.4);
      float floor_ = 1.0 - smoothstep(0.12, 0.26, d);
      float rim = smoothstep(0.2, 0.27, d) * (1.0 - smoothstep(0.27, 0.36, d));
      albedo *= 1.0 - floor_ * 0.3 * uCraters;
      albedo += rim * 0.07 * uCraters;
    } else {
      // Gas giant: turbulent latitude bands.
      float warp = fbm(q * vec3(1.6, 5.0, 1.6));
      float bands = sin(q.y * 11.0 + warp * 3.2) * 0.5 + 0.5;
      float streaks = fbm(q * vec3(2.0, 18.0, 2.0));
      albedo = mix(uColorA, uColorB, bands);
      albedo = mix(albedo, uColorC, smoothstep(0.55, 0.8, streaks) * 0.45);
    }

    vec3 N = normalize(vNormalW);
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(cameraPosition - vPosW);
    float ndl = dot(N, L);
    float diffuse = smoothstep(-0.12, 0.95, ndl);
    vec3 color = albedo * (diffuse * 1.05 + 0.018);

    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 28.0) * 0.12 * step(uKind, 0.5);
    color += spec * diffuse;

    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    color += uAtmo * fresnel * uAtmoStrength * smoothstep(-0.35, 0.6, ndl);

    gl_FragColor = vec4(color, uOpacity);
  }
`;

/** Back-face shell slightly larger than the planet: thin glowing limb. */
export const atmosphereVertex = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vNormalW;

  void main() {
    vNormalV = normalize(normalMatrix * normal);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragment = /* glsl */ `
  uniform vec3 uAtmo;
  uniform vec3 uLightDir;
  uniform float uStrength;
  uniform float uOpacity;

  varying vec3 vNormalV;
  varying vec3 vNormalW;

  void main() {
    float z = vNormalV.z;
    float outer = 1.0 - smoothstep(-0.32, 0.0, z);
    float inner = smoothstep(-0.95, -0.36, z);
    float lit = smoothstep(-0.45, 0.65, dot(normalize(vNormalW), normalize(uLightDir)));
    float glow = outer * inner * (0.15 + 0.85 * lit);
    gl_FragColor = vec4(uAtmo * glow * uStrength * uOpacity, 1.0);
  }
`;

export const ringVertex = /* glsl */ `
  varying float vRadius;

  void main() {
    vRadius = length(position.xy);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ringFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uInner;
  uniform float uOuter;
  uniform float uLight;
  uniform float uOpacity;

  varying float vRadius;

  float h1(float x) { return fract(sin(x * 127.1) * 43758.5453); }
  float n1(float x) { float i = floor(x); float f = fract(x); return mix(h1(i), h1(i + 1.0), f * f * (3.0 - 2.0 * f)); }

  void main() {
    float t = (vRadius - uInner) / (uOuter - uInner);
    float edge = smoothstep(0.0, 0.2, t) * (1.0 - smoothstep(0.7, 1.0, t));
    float bands = n1(t * 38.0) * 0.6 + n1(t * 9.0) * 0.4;
    float gap = 1.0 - (smoothstep(0.52, 0.56, t) - smoothstep(0.6, 0.64, t)) * 0.8;
    float alpha = edge * gap * (0.1 + bands * 0.32);
    vec3 color = mix(uColorA, uColorB, bands) * uLight;
    gl_FragColor = vec4(color, alpha * uOpacity);
  }
`;
