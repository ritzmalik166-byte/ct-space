import type { Ref } from "react";

const CORNER = "absolute h-2.5 w-2.5 border-violet-200/60";

/**
 * Scan highlight for the character's eye laser. Sits between the canvas and the text,
 * so it tints behind the glyphs without covering them. Position and opacity
 * are written per frame as CSS variables by the scene (no React state).
 */
export default function RobotScanOverlay({ ref }: { ref: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-[5]" style={{ opacity: 0 }}>
      <div className="absolute left-0 top-0 h-[var(--scan-h,0px)] w-[var(--scan-w,0px)] translate-x-[var(--scan-x,0px)] translate-y-[var(--scan-y,0px)]">
        <div className="absolute -inset-x-3 -inset-y-2 rounded-md bg-linear-to-r from-violet-300/[0.035] via-indigo-400/[0.05] to-violet-300/[0.02]" />
        <span className={`${CORNER} -left-3 -top-2 border-l border-t`} />
        <span className={`${CORNER} -right-3 -top-2 border-r border-t`} />
        <span className={`${CORNER} -bottom-2 -left-3 border-b border-l`} />
        <span className={`${CORNER} -bottom-2 -right-3 border-b border-r`} />
        <div className="absolute inset-y-0 left-0 w-24 translate-x-[calc(var(--scan-px,0px)-100%)] bg-linear-to-r from-transparent to-violet-300/[0.07]" />
        <div className="absolute -inset-y-2 left-0 w-px translate-x-[var(--scan-px,0px)] bg-linear-to-b from-transparent via-violet-100/80 to-transparent shadow-[0_0_12px_2px_rgba(160,130,255,0.35)]" />
        <div className="absolute left-0 top-0 h-1.5 w-1.5 translate-x-[calc(var(--scan-px,0px)-50%)] translate-y-[calc(var(--scan-py,0px)-50%)] rounded-full bg-white shadow-[0_0_10px_3px_rgba(185,160,255,0.6)]" />
      </div>
    </div>
  );
}
