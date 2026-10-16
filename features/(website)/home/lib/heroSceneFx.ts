import { smoothstep } from "./particles/shapeUtils";

const BLINK_CLOSE = 0.075;
const BLINK_HOLD = 0.035;
const BLINK_OPEN = 0.17;
const BLINK_DURATION = BLINK_CLOSE + BLINK_HOLD + BLINK_OPEN;
const RIGHT_EYE_LAG = 0.016;
const SCAN_DURATION = 1.9;
const SCAN_TOP = 2.5;
const SCAN_BOTTOM = -2.4;
export const SCAN_IDLE = -99;

/** 0 = open, 1 = closed. Fast ease-in close, softer ease-out reopen. */
function blinkCurve(t: number): number {
  if (t <= 0 || t >= BLINK_DURATION) return 0;
  if (t < BLINK_CLOSE) {
    const k = t / BLINK_CLOSE;
    return k * k;
  }
  if (t < BLINK_CLOSE + BLINK_HOLD) return 1;
  const k = (t - BLINK_CLOSE - BLINK_HOLD) / BLINK_OPEN;
  return Math.pow(1 - k, 3);
}

/**
 * State-aware secondary effects shared by the particle shader, the eye
 * overlay and the rig. Updated once per frame from the scroll progress; it
 * never touches the morph positions themselves.
 */
export class HeroFxController {
  robotWeight = 0;
  /** Wider window than robotWeight: the character's planets fade in as the face forms. */
  robotPresence = 0;
  shipWeight = 0;
  /** Iris offset in robot-local units, written by the gaze controller. */
  gazeX = 0;
  gazeY = 0;
  /** 0–1 laser scan intensity, written by the laser; brightens the eyes. */
  scanLevel = 0;
  /** True while a text scan is active: the rig turns the head towards (lookX, lookY). */
  lookActive = false;
  /** Smoothed centre of the scanned element, in client pixels. */
  lookX = 0;
  lookY = 0;
  blinkLeft = 0;
  blinkRight = 0;
  scanY = SCAN_IDLE;
  eyeGlow = 1;

  private nextBlink = 1.2;
  private blinkClock = -1;
  private pendingDouble = false;
  private nextScan = 2.2;
  private scanClock = -1;

  update(progress: number, time: number, delta: number, reduceMotion: boolean) {
    const dt = Math.min(delta, 0.1);
    this.robotWeight = 1 - smoothstep(0.02, 0.07, Math.abs(progress - 0.5));
    this.robotPresence = 1 - smoothstep(0.03, 0.11, Math.abs(progress - 0.5));
    this.shipWeight = smoothstep(0.9, 0.995, progress);

    const active = this.robotWeight > 0.98 && !reduceMotion;
    if (!active) {
      this.blinkClock = -1;
      this.blinkLeft = 0;
      this.blinkRight = 0;
      this.pendingDouble = false;
      this.nextBlink = 0.9 + Math.random() * 1.4;
      this.scanClock = -1;
      this.scanY = SCAN_IDLE;
      this.nextScan = 1.8 + Math.random() * 1.6;
      this.eyeGlow = 1;
      return;
    }

    // Natural blinking with varied intervals and occasional double blinks.
    if (this.blinkClock < 0) {
      this.nextBlink -= dt;
      if (this.nextBlink <= 0) this.blinkClock = 0;
    } else {
      this.blinkClock += dt;
      this.blinkLeft = blinkCurve(this.blinkClock);
      this.blinkRight = blinkCurve(this.blinkClock - RIGHT_EYE_LAG);
      if (this.blinkClock > BLINK_DURATION + RIGHT_EYE_LAG) {
        this.blinkClock = -1;
        this.blinkLeft = 0;
        this.blinkRight = 0;
        if (!this.pendingDouble && Math.random() < 0.2) {
          this.pendingDouble = true;
          this.nextBlink = 0.14;
        } else {
          this.pendingDouble = false;
          this.nextBlink = 2.6 + Math.random() * 3.8;
        }
      }
    }

    // Occasional top-to-bottom scanning band.
    if (this.scanClock < 0) {
      this.nextScan -= dt;
      if (this.nextScan <= 0) this.scanClock = 0;
    } else {
      this.scanClock += dt;
      const k = this.scanClock / SCAN_DURATION;
      const eased = k * k * (3 - 2 * k);
      this.scanY = SCAN_TOP + (SCAN_BOTTOM - SCAN_TOP) * eased;
      if (k >= 1) {
        this.scanClock = -1;
        this.scanY = SCAN_IDLE;
        this.nextScan = 5.5 + Math.random() * 4.5;
      }
    }

    this.eyeGlow = (0.9 + 0.1 * Math.sin(time * 0.8) + 0.04 * Math.sin(time * 2.3)) * (1 + 0.4 * this.scanLevel);
  }
}
