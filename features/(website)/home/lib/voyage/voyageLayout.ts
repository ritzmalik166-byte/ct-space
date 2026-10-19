import { MathUtils, Vector3 } from "three";
import type { HeroSceneState } from "../heroSceneState";
import { PORTFOLIO_PARTNERS } from "../portfolioPartners";
import { PARTNER_COUNT, activeFloat, slotOffset } from "./carousel";

const FOV = 35;
/** Wheel progress (0–1) by which the craft has fully left the viewport on the left. */
const SHIP_EXIT = 0.85;

/**
 * Viewport-derived solar system. Scroll writes scalars on the hero state;
 * this class turns them into world positions once per frame. Nothing here allocates.
 *
 * Desktop framing follows the Section 02 reference: a cropped sun in the lower
 * left, partners on an elliptical orbit whose crest (the active slot) sits top
 * centre, the craft between the sun and the active planet, and the right third
 * left clear for the partner panel.
 */
export class VoyageLayout {
  readonly sun = new Vector3();
  readonly orbitCenter = new Vector3();
  readonly cameraPosition = new Vector3(0, 0, 16);
  readonly cameraTarget = new Vector3();
  readonly positions: Vector3[] = Array.from({ length: PARTNER_COUNT }, () => new Vector3());
  readonly radii = new Float32Array(PARTNER_COUNT);
  readonly visibility = new Float32Array(PARTNER_COUNT);
  readonly emphasis = new Float32Array(PARTNER_COUNT);
  readonly shipDest = new Vector3();
  readonly shipAim = new Vector3();

  sunRadius = 3;
  orbitA = 5;
  orbitB = 5;
  focusAngle = 1.3;
  step = 0.38;
  depth = 1.4;
  /** Desktop: the orbit wraps the sun, receding behind it after the crest and nearing the camera before it. */
  sunOrbit = false;
  depthFront = 2.2;
  unit = 1;
  active = 0;
  shipCruiseScale = 0.7;
  /** Depth/proximity factor already folded into `shipCruiseScale`; drives exhaust point size. */
  shipDepthScale = 1;
  shipBank = 0;
  reveal = 0;
  engine = 0;
  heat = 0;
  /** Smoothed 0–1 scroll speed. Falls back to 0 when the timeline is idle. */
  drive = 0;
  time = 0;
  mobile = false;

  private readonly dir = new Vector3();
  /** cx, cy, ax, ay, az of the craft orbit, then tan(fov/2)·aspect, camera z and exit margin. */
  private readonly shipPath = new Float64Array(8);

  /**
   * Craft position at a wheel progress. It follows its orbit through the planets (near side
   * first, then receding behind them, where planets occlude it by depth), and from 0.3 eases
   * off that curve toward the left edge, fully past it at its own depth by SHIP_EXIT.
   * Returns sin(phi), the orbital depth term used for apparent size.
   */
  private shipPoint(orbit: number, out: Vector3) {
    const [cx, cy, ax, ay, az, edgeK, camZ, margin] = this.shipPath;
    // Extra recession on the far side keeps it deeper than every planet (the wheel never
    // goes past z = -3.5), so planets crossing the path occlude the craft by depth.
    const sink = 2.5;
    const phi = Math.PI / 2 - orbit * Math.PI * 1.35;
    const sin = Math.sin(phi);
    const back = 1 - sin;
    out.set(cx + ax * Math.cos(phi), cy - ay * sin, -1 + az * sin - (sink * back * back) / 4);
    const edge = -edgeK * (camZ - out.z) - margin;
    out.x = MathUtils.lerp(out.x, edge, MathUtils.smootherstep(orbit, 0.3, SHIP_EXIT));
    return sin;
  }

  /** Depth of the orbit at an angle: the crest is nearest, the flanks recede. */
  orbitZ(angle: number) {
    if (this.sunOrbit) {
      const d = Math.sin(angle - this.focusAngle);
      return -d * (d > 0 ? this.depth : this.depthFront);
    }
    return -this.depth * (1 - Math.cos(angle - this.focusAngle));
  }

  /** Whether a partner currently orbits on the far side of the sun. */
  isBehindSun(index: number) {
    return this.positions[index].z < this.sun.z;
  }

  orbitPoint(angle: number, scale: number, out: Vector3) {
    return out.set(
      this.orbitCenter.x + Math.cos(angle) * this.orbitA * scale,
      this.orbitCenter.y + Math.sin(angle) * this.orbitB * scale,
      this.orbitZ(angle) * scale,
    );
  }

  update(width: number, height: number, sceneState: HeroSceneState, time: number, delta: number, reduceMotion: boolean) {
    const aspect = width / Math.max(height, 1);
    const mobile = width < 768;
    const tablet = !mobile && width < 1180;
    this.mobile = mobile;
    this.time = reduceMotion ? 0 : time;

    const camZ = 16;
    const visH = 2 * Math.tan(MathUtils.degToRad(FOV / 2)) * camZ;
    const visW = visH * aspect;
    this.unit = Math.min(visH / 10.1, visW / 9.5);
    this.cameraPosition.set(0, 0, camZ);
    this.cameraTarget.set(0, 0, 0);

    let fade0 = 2.6;
    let fade1 = 3.5;
    this.sunOrbit = false;
    if (mobile) {
      this.sun.set(-visW * 0.62, visH * 0.1, -1.2);
      this.sunRadius = visW * 0.3;
      this.orbitCenter.set(0, visH * 0.0, 0);
      this.orbitA = visW * 0.5;
      this.orbitB = visH * 0.27;
      this.focusAngle = Math.PI / 2;
      this.step = 0.62;
      this.depth = 1.1;
      this.shipCruiseScale = 0.36 * this.unit;
      fade0 = 1.4;
      fade1 = 2.2;
    } else if (tablet) {
      this.sun.set(-visW * 0.4, -visH * 0.42, -1.5);
      this.sunRadius = visH * 0.28;
      this.orbitCenter.set(-visW * 0.1, -visH * 0.3, 0);
      this.orbitA = visW * 0.34;
      this.orbitB = visH * 0.55;
      this.focusAngle = 1.36;
      this.step = 0.42;
      this.depth = 1.3;
      this.shipCruiseScale = 0.58 * this.unit;
      fade0 = 2.0;
      fade1 = 2.9;
    } else {
      this.sun.set(-visW * 0.38, -visH * 0.4, -1.5);
      this.sunRadius = visH * 0.3;
      // Enters below-right of the sun, crests top centre, then sinks behind the sun's upper disc.
      this.orbitCenter.set(-visW * 0.122, -visH * 0.268, 0);
      this.orbitA = visW * 0.25;
      this.orbitB = visH * 0.456;
      this.focusAngle = 1.2;
      this.step = 0.565;
      this.depth = 3.5;
      this.depthFront = 2.2;
      this.sunOrbit = true;
      this.shipCruiseScale = 0.7 * this.unit;
      // Both ends of the wheel are off screen or hidden by the sun, so fade only at the wrap.
      fade0 = 3.25;
      fade1 = 3.5;
    }

    const launch = sceneState.launch;
    this.reveal = MathUtils.smoothstep(launch, 0.2, 0.82);

    const age = performance.now() - sceneState.scrollStamp;
    const live = age < 110 ? Math.min(1, Math.abs(sceneState.scrollVelocity) / 1600) : 0;
    const dt = Math.min(Math.max(delta, 0), 0.05);
    const rate = live > this.drive ? 7 : 2.4;
    this.drive += (live - this.drive) * (1 - Math.exp(-rate * dt));
    const idle = 0.42 * MathUtils.smoothstep(launch, 0.85, 1);
    this.engine = Math.min(1, Math.max(sceneState.thrust, this.drive, idle));
    this.heat = reduceMotion
      ? 0
      : MathUtils.smoothstep(launch, 0.14, 0.38) * (1 - MathUtils.smoothstep(launch, 0.68, 0.9)) * Math.max(sceneState.thrust, 0);

    const active = activeFloat(sceneState.orbit);
    this.active = active;
    const planetScale = (mobile ? 0.78 : 1) * this.unit;
    for (let i = 0; i < PARTNER_COUNT; i++) {
      const off = slotOffset(i, active);
      const angle = this.focusAngle - off * this.step;
      this.orbitPoint(angle, 1, this.positions[i]);
      const emphasis = 1 - Math.min(1, Math.abs(off) / 0.85);
      this.emphasis[i] = emphasis;
      // Tablet: upcoming planets (right side) fade before they reach the partner panel.
      const right = off > 0 && !mobile && !this.sunOrbit;
      this.visibility[i] = 1 - MathUtils.smoothstep(Math.abs(off), right ? 1.2 : fade0, right ? 1.85 : fade1);
      const depthScale = 1 - 0.12 * (1 - Math.cos(off * this.step));
      this.radii[i] = PORTFOLIO_PARTNERS[i].radius * planetScale * depthScale * (1 + 0.42 * emphasis * emphasis);
    }

    // Craft orbit, scrubbed by the same orbit progress as the wheel. It starts on the near
    // side (low, large), sweeps right and recedes behind the planets (high, small), then
    // swings left above and behind the sun. The plane is shallow so the nose never points
    // straight up, and every point stays clear of the sun sphere.
    const [cx, cy, ax, ay, az] = mobile
      ? [0, -visH * 0.2, visW * 0.3, visH * 0.06, 2.6]
      : tablet
        ? [-visW * 0.14, -visH * 0.06, visW * 0.26, visH * 0.15, 4]
        : [-visW * 0.16, -visH * 0.04, visW * 0.27, visH * 0.15, 4.5];
    this.shipPath.set([cx, cy, ax, ay, az, Math.tan(MathUtils.degToRad(FOV / 2)) * aspect, camZ, 4.5 * this.unit]);
    const sin = this.shipPoint(sceneState.orbit, this.shipDest);
    // Forward tangent sampled just ahead on the path; the aim point leads the craft along it.
    this.shipPoint(sceneState.orbit + 0.01, this.shipAim);
    this.dir.subVectors(this.shipAim, this.shipDest).normalize();
    this.shipAim.copy(this.shipDest).addScaledVector(this.dir, 3 * this.unit);

    // Apparent size: shrink with orbital depth and again while passing near a planet, both
    // continuous in scroll progress so there is no visible scaling step.
    let near = 0;
    for (let i = 0; i < PARTNER_COUNT; i++) {
      const p = this.positions[i];
      const d = Math.hypot(p.x - this.shipDest.x, p.y - this.shipDest.y);
      const r = this.radii[i];
      near = Math.max(near, this.visibility[i] * (1 - MathUtils.smoothstep(d, r + 0.4 * this.unit, r + 2.4 * this.unit)));
    }
    this.shipDepthScale = (0.42 + 0.24 * (1 + sin)) * (1 - 0.3 * near);
    this.shipCruiseScale *= this.shipDepthScale;
    this.shipBank = reduceMotion ? 0 : -0.22;
  }
}
