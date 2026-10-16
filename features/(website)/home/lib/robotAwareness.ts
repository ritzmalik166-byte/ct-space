import {
  MathUtils,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
  type Camera,
  type Object3D,
  type ShaderMaterial,
} from "three";
import type { HeroFxController } from "./heroSceneFx";
import { getHumanEyes } from "./particles/humanShape";
import type { RobotInteraction } from "./robotInteraction";

/** Iris travel in character-local units; keeps the iris inside the eye opening. */
const GAZE_X = 0.075;
const GAZE_UP = 0.018;
const GAZE_DOWN = 0.016;
/** Eye rotation (rad) that maps to full iris travel. */
const EYE_YAW = 0.38;
const EYE_PITCH = 0.3;
/** World-space z of the plane hovered text is treated as lying on, between the character and the camera. */
export const LOOK_PLANE_Z = 4;
const FIRST_PASS = 0.7;
const SWEEP_PERIOD = 1.8;
const FORM_PULSE = 0.38;
const PULSE_DONE = 3;

export interface AwarenessFrame {
  camera: Camera;
  canvas: HTMLCanvasElement;
  anchor: Object3D;
  time: number;
  delta: number;
  dpr: number;
  reduceMotion: boolean;
}

function easeInOut(k: number) {
  return k * k * (3 - 2 * k);
}

/**
 * Turns pointer/hover state into gaze offsets, laser uniforms and the DOM scan
 * overlay. Screen targets come from real bounding rects, projected through the
 * live camera onto the plane of the robot's eyes, so the beam lands on the
 * hovered text at any viewport size or DPR.
 */
export class RobotAwareness {
  private readonly startL = { value: new Vector3() };
  private readonly startR = { value: new Vector3() };
  private readonly end = { value: new Vector3() };
  private readonly reach = { value: 0 };
  private readonly intensity = { value: 0 };
  private readonly time = { value: 0 };
  private readonly motion = { value: 1 };
  private readonly resolution = { value: new Vector2(1, 1) };
  private readonly stacked = { value: 0 };

  readonly beamUniforms = {
    uResolution: this.resolution,
    uStacked: this.stacked,
    uStartL: this.startL,
    uStartR: this.startR,
    uEnd: this.end,
    uReach: this.reach,
    uIntensity: this.intensity,
    uTime: this.time,
    uMotion: this.motion,
    uWidth: { value: 0.07 },
    uPulse: { value: PULSE_DONE },
  };

  readonly sparkUniforms = {
    uResolution: this.resolution,
    uStacked: this.stacked,
    uStartL: this.startL,
    uStartR: this.startR,
    uEnd: this.end,
    uReach: this.reach,
    uIntensity: this.intensity,
    uTime: this.time,
    uMotion: this.motion,
    uPixelRatio: { value: 1 },
    uFlare: { value: 0 },
    uImpact: { value: 0 },
  };

  /** True while the beam has any visible contribution. */
  visible = false;

  private level = 0;
  private gazeX = 0;
  private gazeY = 0;
  private wanting = false;
  private formStart = -10;
  private scanClock = 0;
  private lastTarget: HTMLElement | null = null;
  private screen = { x: 0, y: 0 };
  private box = { x: 0, y: 0, w: 0, h: 0 };
  private overlayShown = false;

  private readonly eyes = getHumanEyes();
  private readonly mid = new Vector3();
  private readonly point = new Vector3();
  private readonly ndc = new Vector2();
  private readonly plane = new Plane(new Vector3(0, 0, 1), 0);
  private readonly raycaster = new Raycaster();

  bindMaterials(beam: ShaderMaterial, sparks: ShaderMaterial) {
    beam.uniforms = this.beamUniforms;
    sparks.uniforms = this.sparkUniforms;
    beam.needsUpdate = true;
    sparks.needsUpdate = true;
  }

  update(f: AwarenessFrame, fx: HeroFxController, ia: RobotInteraction) {
    const dt = Math.min(f.delta, 0.1);
    const robotOn = fx.robotWeight > 0.5;
    ia.setActive(robotOn);
    ia.tick(performance.now());

    const target = fx.robotWeight > 0.9 ? ia.target : null;
    const wants = target !== null;
    fx.lookActive = false;
    const idle = !robotOn && !wants && this.level === 0 && this.gazeX === 0 && this.gazeY === 0;
    if (idle) {
      this.visible = false;
      fx.gazeX = 0;
      fx.gazeY = 0;
      fx.scanLevel = 0;
      this.writeOverlay(ia.getOverlay(), null);
      return;
    }

    const rect = f.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Eye centres in world space (including the current gaze offset).
    const { left, right } = this.eyes;
    f.anchor.updateWorldMatrix(true, false);
    f.anchor.localToWorld(this.startL.value.set(left.x + this.gazeX, left.y + this.gazeY, left.z));
    f.anchor.localToWorld(this.startR.value.set(right.x + this.gazeX, right.y + this.gazeY, right.z));
    this.mid.addVectors(this.startL.value, this.startR.value).multiplyScalar(0.5);
    this.plane.constant = -this.mid.z;

    // Scan target: sweep across the hovered element's real rect.
    if (target) {
      const r = target.getBoundingClientRect();
      if (target !== this.lastTarget) {
        this.lastTarget = target;
        this.scanClock = 0;
      }
      this.scanClock += dt;
      const c = this.scanClock;
      let u = 0.5;
      let v = 0.5;
      if (!f.reduceMotion) {
        u = c < FIRST_PASS ? easeInOut(c / FIRST_PASS) : 0.5 + 0.5 * Math.cos((Math.PI * (c - FIRST_PASS)) / SWEEP_PERIOD);
        v = 0.5 + 0.28 * Math.sin(c * 1.1) * Math.min(1, c / FIRST_PASS);
      }
      const tx = r.left + r.width * (0.03 + 0.94 * u);
      const ty = r.top + r.height * v;
      const snap = this.level < 0.02;
      const k = snap ? 1 : 1 - Math.exp(-14 * dt);
      const kb = snap ? 1 : 1 - Math.exp(-11 * dt);
      this.screen.x += (tx - this.screen.x) * k;
      this.screen.y += (ty - this.screen.y) * k;
      this.box.x += (r.left - this.box.x) * kb;
      this.box.y += (r.top - this.box.y) * kb;
      this.box.w += (r.width - this.box.w) * kb;
      this.box.h += (r.height - this.box.h) * kb;
      // The head aims at the element's centre; only the eyes follow the sweep.
      fx.lookActive = true;
      fx.lookX = this.box.x + this.box.w * 0.5;
      fx.lookY = this.box.y + this.box.h * 0.5;
    } else {
      this.lastTarget = null;
    }

    if (wants && !this.wanting && this.level < 0.3) this.formStart = f.time;
    this.wanting = wants;
    this.level = MathUtils.damp(this.level, wants ? 1 : 0, wants ? 9 : 14, dt);
    if (!wants && this.level < 0.003) this.level = 0;

    if (this.level > 0) this.project(this.screen.x, this.screen.y, rect, f.camera, this.end.value);

    // Gaze: look at the scan point while scanning, otherwise at the pointer.
    // Measured in the head's own frame, so the eyes only cover what the head
    // turn has not, and they lead it while it is still turning.
    let goalX = 0;
    let goalY = 0;
    let tracking = false;
    if (robotOn && !f.reduceMotion) {
      this.plane.constant = -LOOK_PLANE_Z;
      if (this.level > 0.05) {
        tracking = this.project(this.screen.x, this.screen.y, rect, f.camera, this.point);
      } else if (ia.hasPointer) {
        tracking = this.project(ia.pointerX, ia.pointerY, rect, f.camera, this.point);
      }
      this.plane.constant = -this.mid.z;
    }
    if (tracking) {
      f.anchor.worldToLocal(this.point);
      const dx = this.point.x - (left.x + right.x) * 0.5;
      const dy = this.point.y - left.y;
      const dz = this.point.z - left.z;
      const yaw = Math.atan2(dx, dz);
      const pitch = Math.atan2(dy, Math.hypot(dx, dz));
      const range = pitch > 0 ? GAZE_UP : GAZE_DOWN;
      goalX = GAZE_X * Math.tanh(yaw / EYE_YAW);
      goalY = range * Math.tanh(pitch / EYE_PITCH);
      const ex = goalX / GAZE_X;
      const ey = goalY / range;
      const e = ex * ex + ey * ey;
      if (e > 1) {
        const s = 1 / Math.sqrt(e);
        goalX *= s;
        goalY *= s;
      }
    }
    const lambda = tracking ? 7 : 2.5;
    this.gazeX = MathUtils.damp(this.gazeX, goalX, lambda, dt);
    this.gazeY = MathUtils.damp(this.gazeY, goalY, lambda, dt);
    if (!tracking && Math.abs(this.gazeX) < 1e-4 && Math.abs(this.gazeY) < 1e-4) {
      this.gazeX = 0;
      this.gazeY = 0;
    }
    fx.gazeX = this.gazeX * fx.robotWeight;
    fx.gazeY = this.gazeY * fx.robotWeight;
    fx.scanLevel = this.level;

    // Laser uniforms.
    const since = f.time - this.formStart;
    this.time.value = f.reduceMotion ? 0 : f.time;
    this.motion.value = f.reduceMotion ? 0 : 1;
    this.intensity.value = this.level;
    this.reach.value = f.reduceMotion ? (this.level > 0 ? 1 : 0) : Math.min(1, this.level * 1.6);
    this.beamUniforms.uPulse.value = f.reduceMotion || since > FORM_PULSE * 1.3 ? PULSE_DONE : since / FORM_PULSE;
    this.sparkUniforms.uPixelRatio.value = f.dpr;
    this.resolution.value.set(f.canvas.width, f.canvas.height);
    this.stacked.value = rect.width < 768 ? 1 : 0;
    this.sparkUniforms.uFlare.value = this.level * (0.6 + (f.reduceMotion ? 0 : 0.7 * Math.exp(-since * 4)));
    this.sparkUniforms.uImpact.value = this.level * MathUtils.smoothstep(this.reach.value, 0.85, 1);
    this.visible = this.level > 0;

    this.writeOverlay(ia.getOverlay(), this.visible ? rect : null);
  }

  /** Client-pixel point → world point on the eyes' plane, via the live camera. */
  private project(x: number, y: number, rect: DOMRect, camera: Camera, out: Vector3) {
    this.ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, camera);
    return this.raycaster.ray.intersectPlane(this.plane, out) !== null;
  }

  private writeOverlay(overlay: HTMLElement | null, rect: DOMRect | null) {
    if (!overlay) return;
    if (!rect) {
      if (this.overlayShown) {
        overlay.style.opacity = "0";
        this.overlayShown = false;
      }
      return;
    }
    this.overlayShown = true;
    const s = overlay.style;
    s.opacity = this.level.toFixed(3);
    s.setProperty("--scan-x", `${(this.box.x - rect.left).toFixed(1)}px`);
    s.setProperty("--scan-y", `${(this.box.y - rect.top).toFixed(1)}px`);
    s.setProperty("--scan-w", `${this.box.w.toFixed(1)}px`);
    s.setProperty("--scan-h", `${this.box.h.toFixed(1)}px`);
    s.setProperty("--scan-px", `${(this.screen.x - this.box.x).toFixed(1)}px`);
    s.setProperty("--scan-py", `${(this.screen.y - this.box.y).toFixed(1)}px`);
  }
}
