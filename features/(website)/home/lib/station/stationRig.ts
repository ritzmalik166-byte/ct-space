import { CatmullRomCurve3, MathUtils, Matrix4, Quaternion, Vector3 } from "three";
import type { StationSceneState } from "./stationState";

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
const { smoothstep, lerp } = MathUtils;
const smoother = (x: number) => {
  const t = MathUtils.clamp(x, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/**
 * Station dimensions in world units. The bay faces +Z; the hall runs to -Z.
 * The ship model is ~4.9 units nose to tail before `shipScale`.
 */
export const STATION = {
  opening: { halfW: 4.6, bottom: -1.4, top: 3.8 },
  hall: { halfW: 8.4, floor: -2.4, ceiling: 7, back: -35 },
  hull: { halfW: 10.2, bottom: -4.8, top: 9.4, chamfer: 2.6, back: -35.6 },
  /** Front bulkhead (holds the doors) spans z 0 → frontZ; the collar continues to collarZ. */
  frontZ: 0.8,
  collarZ: 2.4,
  hold: v(0, 1.2, 14),
  pad: v(0, -1.5, -9),
  shipScale: 0.78,
} as const;

const SHIP_PATH = new CatmullRomCurve3(
  [v(-78, 26, 210), v(-40, 14, 112), v(-13, 5, 46), STATION.hold.clone()],
  false,
  "centripetal",
);
const CAMERA_PATH = new CatmullRomCurve3(
  [v(36, 13, 92), v(24, 8.5, 62), v(13, 5, 40), v(7.6, 3.4, 29.5)],
  false,
  "centripetal",
);
const STATION_FOCUS = v(0, 3, -14);
const GATE_FOCUS = v(0, 1.6, 2);
const GATE_CAM = v(3.6, 2.6, 23.5);
const BAY_FOCUS = v(0, 1.5, -1);
const LANDED_CAM = v(0, 3.1, -3);
const LANDED_FOCUS = v(0, -0.6, -14);
const DECK_CAM = v(0, 3.0, -12.5);
const DECK_FOCUS = v(0, 2.7, -28);
const BAY_AXIS = v(0, 0, -1);

export interface ScreenSlot {
  position: Vector3;
  quaternion: Quaternion;
  width: number;
  height: number;
  /** Where the support cables run: up to the ceiling or down to the floor. */
  mount: "ceiling" | "floor";
}

const _a = new Vector3();
const _b = new Vector3();
const _f = new Vector3();
const _r = new Vector3();
const _u = new Vector3();
const _m = new Matrix4();
const _up = new Vector3(0, 1, 0);

function noseQuaternion(direction: Vector3, bank: number, out: Quaternion) {
  const nose = _a.copy(direction).normalize();
  const side = _b.crossVectors(nose, _up).normalize();
  const up = _u.crossVectors(side, nose).normalize();
  if (bank !== 0) {
    up.applyAxisAngle(nose, bank);
    side.crossVectors(nose, up).normalize();
  }
  _m.makeBasis(nose, up, side);
  return out.setFromRotationMatrix(_m);
}

/**
 * Turns the scrubbed scene state into camera, ship, screen and hologram poses.
 * Everything is a pure function of state and viewport, so any scroll position
 * (including a refresh mid-section) produces the same frame.
 */
export class StationRig {
  readonly camPos = new Vector3();
  readonly camTarget = new Vector3();
  fov = 40;
  readonly shipPos = new Vector3();
  readonly shipQuat = new Quaternion();
  readonly screens: ScreenSlot[] = Array.from({ length: 5 }, (_, i) => ({
    position: new Vector3(),
    quaternion: new Quaternion(),
    width: 3.6,
    height: 2.025,
    mount: i === 4 ? "floor" : "ceiling",
  }));
  readonly hologram = new Vector3();
  hologramScale = 1;
  readonly consoles: Vector3[] = [new Vector3(), new Vector3()];
  showConsoles = true;
  /** Final deck camera basis, used to place the projector and its surface. */
  readonly deckCam = DECK_CAM.clone();
  readonly deckForward = new Vector3();
  readonly deckUp = new Vector3();
  portrait = false;
  private width = 0;
  private height = 0;

  layout(width: number, height: number) {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    const aspect = width / Math.max(height, 1);
    this.portrait = aspect < 1;
    this.fov = aspect >= 1.3 ? 40 : aspect >= 1 ? 46 : 56;

    _f.copy(DECK_FOCUS).sub(DECK_CAM).normalize();
    _r.crossVectors(_f, _up).normalize();
    _u.crossVectors(_r, _f).normalize();
    this.deckForward.copy(_f);
    this.deckUp.copy(_u);

    const tanV = Math.tan(MathUtils.degToRad(this.fov / 2));
    const distance = this.portrait ? 8.5 : 10.5;
    const hHalf = distance * tanV * aspect * (this.portrait ? 0.94 : 0.92);
    const vHalf = distance * tanV * 0.9;

    const place = (slot: ScreenSlot, x: number, y: number, w: number) => {
      slot.width = w;
      slot.height = w * 0.5625;
      slot.position.copy(DECK_CAM).addScaledVector(_f, distance).addScaledVector(_r, x).addScaledVector(_u, y);
      _m.lookAt(DECK_CAM, slot.position, _up);
      slot.quaternion.setFromRotationMatrix(_m);
    };

    if (this.portrait) {
      const gap = 0.16;
      const w = Math.min(3.0, (hHalf * 2 - gap) / 2);
      const h = w * 0.5625;
      const cy = -vHalf * 0.2;
      place(this.screens[0], -(w + gap) / 2, cy + (h + gap) / 2, w);
      place(this.screens[1], (w + gap) / 2, cy + (h + gap) / 2, w);
      place(this.screens[2], -(w + gap) / 2, cy - (h + gap) / 2, w);
      place(this.screens[3], (w + gap) / 2, cy - (h + gap) / 2, w);
      place(this.screens[4], 0, cy - (h + gap) * 1.5, w);
      this.hologram.copy(DECK_CAM).addScaledVector(_f, distance + 4).addScaledVector(_u, vHalf * 0.75);
      this.hologramScale = 0.7;
      this.showConsoles = false;
    } else {
      const w = Math.min(3.0, hHalf * 0.5);
      const h = w * 0.5625;
      const x = hHalf * 0.36 + w / 2;
      const cy = vHalf * 0.04;
      place(this.screens[0], -x, cy + h / 2 + 0.25, w);
      place(this.screens[1], x, cy + h / 2 + 0.25, w);
      place(this.screens[2], -x, cy - h / 2 - 0.25, w);
      place(this.screens[3], x, cy - h / 2 - 0.25, w);
      place(this.screens[4], 0, -vHalf + h / 2 + 0.05, w);
      this.hologram.copy(DECK_CAM).addScaledVector(_f, distance + 3.5);
      this.hologramScale = 1;
      this.showConsoles = true;
    }
    this.hologram.y = Math.max(this.hologram.y, STATION.hall.floor + 2.6);
    for (const [i, side] of [-1, 1].entries()) {
      this.consoles[i].copy(DECK_CAM).addScaledVector(_f, 6.4).addScaledVector(_r, side * 3.3);
      this.consoles[i].y = STATION.hall.floor;
    }
  }

  update(state: StationSceneState, reduceMotion: boolean) {
    const { approach, align, gate, entry, interior } = state;
    const pull = this.portrait ? 1.45 : 1;

    if (entry <= 0) {
      const a = MathUtils.clamp(approach, 0, 1);
      SHIP_PATH.getPointAt(a, this.shipPos);
      SHIP_PATH.getTangentAt(Math.min(a, 0.999), _f);
      const settle = smoothstep(align, 0, 1);
      _f.lerp(BAY_AXIS, settle).normalize();
      const bank = reduceMotion ? 0 : -0.5 * Math.sin(Math.PI * a) * (1 - settle);
      noseQuaternion(_f, bank, this.shipQuat);

      // Establishing shot that converges on the bay, then a slow push-in while the doors open.
      CAMERA_PATH.getPointAt(a, this.camPos);
      this.camTarget.copy(STATION_FOCUS).lerp(this.shipPos, 0.45).lerp(GATE_FOCUS, smoothstep(a, 0.6, 1));
      const s = smoothstep(align * 0.35 + gate * 0.65, 0, 1);
      this.camPos.lerp(GATE_CAM, s);
      this.camTarget.lerp(BAY_FOCUS, s);
      const p = lerp(pull, 1 + (pull - 1) * 0.6, s);
      this.camPos.sub(this.camTarget).multiplyScalar(p).add(this.camTarget);
    } else if (interior <= 0) {
      const e = MathUtils.clamp(entry, 0, 1);
      // Doors are fully open before entry starts; this guard keeps the craft outside if they are not.
      const minZ = gate < 0.98 ? STATION.collarZ + 2.6 : -Infinity;
      const shipZ = Math.max(lerp(STATION.hold.z, STATION.pad.z, smoother(e)), minZ);
      const shipY = lerp(STATION.hold.y, STATION.pad.y, smoothstep(e, 0.72, 1));
      this.shipPos.set(0, shipY, shipZ);
      noseQuaternion(BAY_AXIS, 0, this.shipQuat);

      // Chase camera that stays centred in the opening while it crosses the bulkhead.
      const ramp = smoothstep(e, 0, 0.35);
      const p = lerp(1 + (pull - 1) * 0.6, 1, ramp);
      this.camPos.set(
        GATE_CAM.x * (1 - smoothstep(e, 0, 0.55)),
        lerp(GATE_CAM.y, LANDED_CAM.y, smoothstep(e, 0.8, 1)),
        shipZ + lerp(9.5, LANDED_CAM.z - STATION.pad.z, smoothstep(e, 0, 1)),
      );
      this.camTarget
        .copy(BAY_FOCUS)
        .lerp(_a.set(0, shipY + 0.6, shipZ - 12), ramp)
        .lerp(LANDED_FOCUS, smoothstep(e, 0.7, 1));
      if (p !== 1) this.camPos.sub(this.camTarget).multiplyScalar(p).add(this.camTarget);
    } else {
      const i = smoothstep(interior, 0, 1);
      this.shipPos.copy(STATION.pad);
      noseQuaternion(BAY_AXIS, 0, this.shipQuat);
      this.camPos.copy(LANDED_CAM).lerp(DECK_CAM, i);
      this.camPos.y += 0.6 * Math.sin(Math.PI * i);
      this.camTarget.copy(LANDED_FOCUS).lerp(DECK_FOCUS, i);
    }
  }
}
