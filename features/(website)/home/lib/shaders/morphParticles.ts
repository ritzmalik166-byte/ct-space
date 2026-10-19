export const SHARED_POINT_FRAGMENT = /* glsl */ `
  uniform float uOpacity;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    // Tight stellar core with a faint soft halo.
    float core = exp(-d * d * 9.0);
    float halo = exp(-d * d * 2.6) * 0.2;
    gl_FragColor = vec4(vColor, (core + halo) * vAlpha * uOpacity);
  }
`;

export const morphParticlesVertex = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uFlow;
  uniform float uMotion;
  uniform float uRobotW;
  uniform float uShipW;
  uniform float uScanY;
  uniform float uEyeGlow;
  uniform vec2 uBlink;
  uniform vec2 uLidY;
  uniform vec2 uGaze;
  uniform vec2 uNozzle[3];
  uniform float uCutY;
  uniform float uForm;

  attribute vec3 aRobot;
  attribute vec3 aShip;
  attribute vec3 aColorGalaxy;
  attribute vec3 aColorRobot;
  attribute vec3 aColorShip;
  attribute vec3 aSizes;
  attribute vec4 aMeta;
  attribute vec4 aFx;

  varying vec3 vColor;
  varying float vAlpha;

  const float PI = 3.14159265;
  const vec3 ACCENT = vec3(0.8, 0.74, 1.0);

  vec2 rotate2(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
  }

  void main() {
    float seed = aMeta.x;
    float phase = aMeta.y;
    float sweep = aMeta.z;
    float plume = aMeta.w;
    float t = uTime * uMotion;

    // Galaxy: rigid rotation + bounded differential shear (inner region
    // leads, then relaxes) + per-star orbital wobble. Bounded so the arms
    // never wind up over time.
    vec3 galaxy = position;
    float r = length(galaxy.xz);
    float inner = 1.0 - smoothstep(0.0, 3.2, r);
    float angle = t * 0.05
      + sin(t * 0.11) * 0.1 * inner
      + sin(t * (0.3 + 0.55 * inner) + phase * 6.2831) * 0.03 / (0.6 + r);
    galaxy.xz = rotate2(galaxy.xz, angle);
    galaxy.y += sin(t * 0.4 + phase * 6.2831) * 0.008;

    // Robot: blinking squashes the tagged eye particles onto the lid line.
    vec3 robot = aRobot;
    float eye = aFx.y;
    float isEye = step(0.5, eye);
    float isRight = step(1.5, eye);
    float blink = mix(uBlink.x, uBlink.y, isRight) * isEye;
    float lid = mix(uLidY.x, uLidY.y, isRight);
    // Gaze: iris and pupil slide inside the socket (offset is pre-clamped).
    robot.xy += uGaze * isEye * step(0.1, fract(eye));
    robot.y = mix(robot.y, lid, blink * (robot.y > lid ? 1.0 : 0.4));

    // Spaceship: plume particles stream out of their nozzle and taper.
    vec3 ship = aShip;
    float isPlume = step(0.001, plume);
    float stream = fract(t * 1.3 + phase);
    int nozzle = int(clamp(aFx.w - 1.0, 0.0, 2.0) + 0.5);
    vec2 axis = uNozzle[nozzle];
    float travel = stream * plume * uShipW * isPlume;
    ship.x -= travel;
    ship.yz = mix(ship.yz, axis + (ship.yz - axis) * (1.0 + stream * 0.35), isPlume);

    // Two morph segments from one progress value, staggered per point.
    float seg = clamp(uProgress * 2.0, 0.0, 2.0);
    float delay = seed * 0.28 + sweep * 0.27;
    float k1 = smoothstep(delay, delay + 0.45, clamp(seg, 0.0, 1.0));
    float k2 = smoothstep(delay, delay + 0.45, clamp(seg - 1.0, 0.0, 1.0));

    vec3 p = mix(mix(galaxy, robot, k1), ship, k2);

    float flow = sin(k1 * PI) + sin(k2 * PI);
    vec3 drift = vec3(
      sin(seed * 41.0 + t * 0.9 + p.y * 1.4),
      cos(phase * 37.0 + t * 0.8 + p.x * 1.2),
      sin(seed * 23.0 - t * 0.7 + p.z * 1.3)
    );
    p += drift * flow * uFlow;
    p.xz = rotate2(p.xz, flow * (seed - 0.5) * 0.8);

    vec3 color = mix(mix(aColorGalaxy, aColorRobot, k1), aColorShip, k2);
    float size = mix(mix(aSizes.x, aSizes.y, k1), aSizes.z, k2);

    // Character-only lighting: a faint volumetric-scan band and eye glow.
    float robotK = k1 * (1.0 - k2) * uRobotW;
    float scan = exp(-pow((aRobot.y - uScanY) * 7.0, 2.0));
    color += ACCENT * scan * 0.22 * robotK * (0.3 + length(aColorRobot));
    color *= mix(1.0, uEyeGlow * (1.0 - blink * 0.4), isEye * robotK);

    // Spaceship-only: nozzle throat flicker and plume fade.
    float shipK = k2 * uShipW;
    float glow = step(0.5, aFx.w) * (1.0 - isPlume);
    float flicker = 0.88 + 0.12 * sin(t * 21.0 + phase * 30.0) * sin(t * 6.3 + phase * 11.0);
    color *= mix(1.0, flicker * 1.15, glow * shipK);

    // Galaxy-only: brightest stars twinkle gently.
    float twinkleAmp = mix(0.1, 0.3, aFx.x) * (1.0 - k1);
    float twinkle = 1.0 - twinkleAmp + twinkleAmp * sin(t * 2.0 + phase * 40.0);

    float formed = clamp(uForm, 0.0, 1.0);
    p = mix(p, p * 0.992, formed);
    size *= 1.0 - formed;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float depth = -mv.z;
    gl_PointSize = max(size * uSize * uPixelRatio / depth, (1.15 * uPixelRatio) * (1.0 - formed));

    float depthFade = clamp(1.3 - (depth - 9.0) * 0.16, 0.25, 1.0);
    float plumeFade = mix(1.0, pow(1.0 - stream, 1.6) * uShipW, isPlume * k2);
    float cut = mix(1.0, smoothstep(uCutY - 0.5, uCutY + 0.4, aRobot.y), k1 * (1.0 - k2));
    vAlpha = depthFade * twinkle * plumeFade * cut * (1.0 + flow * 0.2) * (1.0 - formed);
    vColor = mix(color, vec3(0.95, 0.82, 0.48), formed * 0.35);
  }
`;

export const morphParticlesFragment = SHARED_POINT_FRAGMENT;

/** Blink lid edges, corneal catchlights and a faint eye glow over the character's eyes. */
export const robotEyesVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uVisible;
  uniform float uGlow;
  uniform vec4 uLeft;
  uniform vec4 uRight;
  uniform float uRyUp;
  uniform float uRyLow;
  uniform vec2 uBlink;
  uniform vec2 uLidY;
  uniform vec2 uGaze;

  attribute float aEye;
  attribute float aKind;
  attribute float aParam;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    bool left = aEye < 0.0;
    vec4 e = left ? uLeft : uRight;
    float blink = left ? uBlink.x : uBlink.y;
    float lid = left ? uLidY.x : uLidY.y;
    float cx = e.x;
    float cy = e.y;
    float rx = e.w;
    float side = sign(cx);

    vec3 p = vec3(cx, cy, e.z + 0.02);
    float alpha = 0.0;
    float size = 1.0;
    vec3 color = vec3(0.86, 0.8, 1.0);
    float lidVisible = smoothstep(0.05, 0.35, blink);
    float iris = rx * 0.367;

    if (aKind < 0.5) {
      // Upper lid edge, only drawn while it sweeps down during a blink.
      float u = aParam;
      float open = cy + uRyUp * pow(max(0.0, 1.0 - u * u), 0.72) + 0.012 * u * side;
      p.x = cx + u * rx;
      p.y = mix(open, lid, blink);
      alpha = lidVisible * 0.55;
      size = 0.8;
    } else if (aKind < 1.5) {
      float u = aParam;
      float open = cy - uRyLow * pow(max(0.0, 1.0 - u * u), 0.72) + 0.012 * u * side;
      p.x = cx + u * rx;
      p.y = mix(open, lid, blink * 0.4);
      alpha = lidVisible * 0.3;
      size = 0.7;
    } else if (aKind < 2.5) {
      // Corneal catchlight toward the key light; follows the gaze.
      p.x = cx + uGaze.x - iris * 0.32;
      p.y = cy + 0.006 + uGaze.y + iris * 0.36;
      p.z += 0.015;
      alpha = 0.5 * (1.0 - blink) * (0.85 + 0.15 * uGlow);
      size = 1.05;
      color = vec3(0.96, 0.95, 1.0);
    } else {
      p.xy += uGaze;
      alpha = 0.06 * uGlow * (1.0 - blink * 0.85);
      size = 14.0;
      color = vec3(0.62, 0.55, 1.0);
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = size * 40.0 * uPixelRatio / -mv.z;
    vAlpha = alpha * uVisible;
    vColor = color;
  }
`;

export const robotEyesFragment = SHARED_POINT_FRAGMENT;

/**
 * Dense, non-morphing skin of the particle-human. Points condense onto the
 * surface as the character forms and scatter softly as it dissolves.
 */
export const humanDetailVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uReveal;
  uniform float uMotion;
  uniform float uScanY;
  uniform float uCutY;

  attribute vec3 aColor;
  attribute vec2 aMeta; // size, seed

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float seed = aMeta.y;
    float k = smoothstep(seed * 0.55, seed * 0.55 + 0.45, uReveal);
    vec3 dir = normalize(vec3(sin(seed * 91.7), cos(seed * 53.3), sin(seed * 27.1 + 1.3)) + 1e-4);
    vec3 p = position + dir * (1.0 - k) * (0.6 + seed * 0.8);

    // Faint shimmer of individual points, never a global flicker.
    float shimmer = 0.88 + 0.12 * sin(uTime * uMotion * (0.7 + seed * 1.6) + seed * 80.0);
    float scan = exp(-pow((position.y - uScanY) * 7.0, 2.0));
    vColor = aColor * shimmer + vec3(0.8, 0.74, 1.0) * scan * 0.12 * (0.3 + length(aColor));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = max(aMeta.x * uSize * uPixelRatio / depth, 0.85 * uPixelRatio);
    float cut = smoothstep(uCutY - 0.5, uCutY + 0.4, position.y);
    vAlpha = k * k * cut;
  }
`;

export const humanDetailFragment = SHARED_POINT_FRAGMENT;

export const starFieldVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uMotion;

  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio;
    vAlpha = 0.45 + 0.55 * (0.5 + 0.5 * sin(uTime * uMotion * (0.6 + aPhase) + aPhase * 50.0));
    vColor = aColor;
  }
`;

export const starFieldFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = exp(-d * d * 7.0);
    gl_FragColor = vec4(vColor, a * vAlpha * 0.8);
  }
`;
