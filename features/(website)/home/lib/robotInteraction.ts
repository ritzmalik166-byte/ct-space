/** Leaving one scan target keeps it alive briefly, so heading → paragraph glides instead of resetting. */
const RELEASE_GRACE_MS = 180;
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

/**
 * Pointer and hover state for the robot's gaze and laser scan. Listeners are
 * attached to the hero section only while the robot state is on screen, and
 * touch pointers are ignored so scrolling on mobile is never affected.
 */
export class RobotInteraction {
  /** Last pointer position in client pixels; valid while `hasPointer`. */
  pointerX = 0;
  pointerY = 0;
  hasPointer = false;
  /** Element currently being scanned (`[data-hero-scan]`), or null. */
  target: HTMLElement | null = null;

  private root: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private hovered: HTMLElement | null = null;
  private releasedAt = 0;
  private listening = false;
  private finePointer: MediaQueryList | null = null;

  attach(root: HTMLElement, overlay: HTMLElement | null) {
    this.root = root;
    this.overlay = overlay;
    this.finePointer = window.matchMedia(FINE_POINTER_QUERY);
  }

  getOverlay() {
    return this.overlay;
  }

  /** Called every frame; only adds/removes listeners when the state flips. */
  setActive(active: boolean) {
    const root = this.root;
    const want = active && root !== null && this.finePointer?.matches === true;
    if (want === this.listening || !root) return;
    this.listening = want;
    if (want) {
      root.addEventListener("pointermove", this.onMove, { passive: true });
      root.addEventListener("pointerleave", this.onLeave, { passive: true });
    } else {
      root.removeEventListener("pointermove", this.onMove);
      root.removeEventListener("pointerleave", this.onLeave);
      this.reset();
    }
  }

  /** Resolves the release grace period once per frame. */
  tick(now: number) {
    if (!this.hovered && this.target && now - this.releasedAt > RELEASE_GRACE_MS) this.target = null;
  }

  dispose() {
    this.setActive(false);
    this.root = null;
    this.overlay = null;
  }

  private reset() {
    this.hasPointer = false;
    this.hovered = null;
    this.target = null;
  }

  private setHovered(el: HTMLElement | null) {
    if (el === this.hovered) return;
    if (!el) this.releasedAt = performance.now();
    this.hovered = el;
    if (el) this.target = el;
  }

  private onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
    this.hasPointer = true;
    const el = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-hero-scan]") : null;
    this.setHovered(el);
  };

  private onLeave = () => {
    this.hasPointer = false;
    this.setHovered(null);
  };
}
