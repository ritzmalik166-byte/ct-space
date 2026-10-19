/** Scrubbed by the Section 3 timeline; every value is 0–1 and reverses with scroll. */
export interface StationSceneState {
  /** Phase A: ship travels from deep space to the hold point in front of the bay. */
  approach: number;
  /** Phase B: nose lines up with the bay axis, guidance lights come on. */
  align: number;
  /** Phase B: hangar doors retract. The entry tween only starts once this reaches 1. */
  gate: number;
  /** Phase C: ship flies through the opening and lands; the camera follows inside. */
  entry: number;
  /** Phase D: camera glides over the ship to the research deck. */
  interior: number;
  /** Engine output for plumes and exhaust. */
  thrust: number;
}

export const createStationSceneState = (): StationSceneState => ({
  approach: 0,
  align: 0,
  gate: 0,
  entry: 0,
  interior: 0,
  thrust: 0.85,
});

/** Below this the screens are still settling and cannot be selected. */
export const INTERIOR_READY = 0.97;

/**
 * Click-driven projector state, shared by the DOM layer and the scene. The DOM owns
 * `selected`; the scene reads it every frame and eases the projector toward it.
 */
export class StationInteraction {
  hovered = -1;
  selected = -1;
  /** Eased by GSAP on open/close/switch, read per frame by the projector rig. */
  readonly projector = { deploy: 0, beam: 0, surface: 0 };
  /** The HTML projection panel; the 3D surface is fitted behind its rect. */
  panel: HTMLElement | null = null;
  /** One focusable button per screen, positioned over the 3D screen every frame. */
  readonly hotspots: Array<HTMLElement | null> = [];
  /** Section element whose `data-interior-ready` enables the hotspots. */
  root: HTMLElement | null = null;

  setRoot(el: HTMLElement | null) {
    this.root = el;
  }

  /** Called every rendered frame so the hotspots always match what is on screen. */
  syncReady(interior: number) {
    const ready = String(interior >= INTERIOR_READY);
    if (this.root && this.root.dataset.interiorReady !== ready) this.root.dataset.interiorReady = ready;
  }

  hover(index: number) {
    this.hovered = index;
  }

  unhover(index: number) {
    if (this.hovered === index) this.hovered = -1;
  }

  select(index: number) {
    this.selected = index;
  }

  setHotspot(index: number, el: HTMLElement | null) {
    this.hotspots[index] = el;
  }

  setPanel(el: HTMLElement | null) {
    this.panel = el;
    this.syncPanel();
  }

  /** Mirrors the projector surface reveal onto the HTML panel (fade + vertical unfold). */
  syncPanel() {
    if (!this.panel) return;
    const s = this.projector.surface;
    const inset = ((1 - s) * 50).toFixed(2);
    this.panel.style.opacity = String(Math.min(1, s * 1.2));
    this.panel.style.clipPath = `inset(${inset}% 0 ${inset}% 0)`;
  }
}
