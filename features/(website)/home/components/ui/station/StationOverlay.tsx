"use client";

import { forwardRef, type RefObject } from "react";
import type { StationInteraction } from "../../../lib/station/stationState";
import type { StationScreenContent } from "../../../lib/station/stationContent";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4d675] focus-visible:ring-offset-2 focus-visible:ring-offset-[#03040b]";

const CAPTIONS = [
  { phase: "Phase A · Approach", line: "Inbound to Contenaissance Station" },
  { phase: "Phase B · Docking", line: "Guidance lock acquired. Bay doors opening." },
  { phase: "Phase C · Entry", line: "Crossing into the hangar." },
  { phase: "Phase D · Research Deck", line: "Explore the work on each display." },
];

const RAIL_LABELS = ["Approach", "Dock", "Entry", "Deck"];

export const StationHeader = forwardRef<HTMLDivElement>(function StationHeader(_, ref) {
  return (
    <div ref={ref} className="pointer-events-none absolute inset-x-0 top-0 z-10 px-6 pt-24 md:px-12 md:pt-28 lg:px-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#e2bf74]">Section 03</p>
      <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
        The <span className="brand-gold-text">Contenaissance</span> Station
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65 md:text-base">
        Scroll to dock with our orbital research deck, then open a display to see the work inside.
      </p>
    </div>
  );
});

export function StationCaptions({ captionRefs }: { captionRefs: RefObject<HTMLElement[]> }) {
  return (
    <div className="pointer-events-none absolute bottom-10 left-6 z-10 h-16 w-[min(80vw,420px)] md:bottom-14 md:left-12 lg:left-20">
      {CAPTIONS.map((caption, i) => (
        <div
          key={caption.phase}
          ref={(el) => {
            if (el) captionRefs.current[i] = el;
          }}
          className="invisible absolute inset-x-0 bottom-0"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#7fe3ff]/80">{caption.phase}</p>
          <p className="mt-1.5 text-base text-white/85 md:text-lg">{caption.line}</p>
        </div>
      ))}
    </div>
  );
}

export const StationRail = forwardRef<HTMLDivElement>(function StationRail(_, ref) {
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute right-8 top-1/2 z-10 hidden -translate-y-1/2 md:block lg:right-12">
      <div className="relative h-56 w-px bg-white/12">
        <div data-station-rail-fill className="absolute inset-0 origin-top bg-linear-to-b from-[#7fe3ff] to-[#f4d675]" />
        {RAIL_LABELS.map((label, i) => (
          <div
            key={label}
            data-station-rail-node
            data-active={i === 0 ? "true" : "false"}
            className="group absolute -left-[3.5px] flex items-center"
            style={{ top: `${(i / (RAIL_LABELS.length - 1)) * 100}%`, transform: "translateY(-50%)" }}
          >
            <span className="size-2 rounded-full border border-white/40 bg-[#03040b] transition-colors duration-300 group-data-[active=true]:border-[#f4d675] group-data-[active=true]:bg-[#f4d675]" />
            <span className="absolute right-5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.24em] text-white/35 transition-colors duration-300 group-data-[active=true]:text-white/80">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

export const StationHint = forwardRef<HTMLParagraphElement>(function StationHint(_, ref) {
  return (
    <p
      ref={ref}
      className="pointer-events-none invisible absolute inset-x-0 top-6 z-10 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-[#7fe3ff]/85 md:top-8"
    >
      <span className="hidden md:inline">Select a display to project it</span>
      <span className="md:hidden">Tap a display to project it</span>
    </p>
  );
});

export function StationLoader({ ready }: { ready: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}
    >
      {ready ? null : (
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
          <span className="size-1.5 animate-pulse rounded-full bg-[#7fe3ff]" />
          Station systems loading
        </div>
      )}
    </div>
  );
}

interface StationHotspotsProps {
  screens: readonly StationScreenContent[];
  interaction: StationInteraction;
  active: number;
  onSelect: (index: number) => void;
}

/**
 * Real buttons laid over the 3D displays (the scene writes their rect every frame).
 * They only become visible, focusable and clickable once the deck has settled.
 */
export function StationHotspots({ screens, interaction, active, onSelect }: StationHotspotsProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {screens.map((screen, i) => (
        <button
          key={screen.id}
          type="button"
          ref={(el) => interaction.setHotspot(i, el)}
          aria-label={`Project ${screen.category}`}
          aria-pressed={active === i}
          onClick={() => onSelect(i)}
          onPointerEnter={(e) => e.pointerType === "mouse" && interaction.hover(i)}
          onPointerLeave={() => interaction.unhover(i)}
          onFocus={() => interaction.hover(i)}
          onBlur={() => interaction.unhover(i)}
          className={`group/hotspot invisible absolute left-0 top-0 size-0 cursor-pointer rounded-[3px] group-data-[interior-ready=true]/station:pointer-events-auto group-data-[interior-ready=true]/station:visible ${FOCUS_RING}`}
        >
          {(["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"] as const).map(
            (corner) => (
              <span
                key={corner}
                aria-hidden
                className={`absolute size-3 border-[#f4d675]/0 transition-colors duration-300 group-hover/hotspot:border-[#f4d675] group-focus-visible/hotspot:border-[#f4d675] ${corner} ${active === i ? "border-[#f4d675]!" : ""}`}
              />
            ),
          )}
          <span
            aria-hidden
            className={`absolute right-2 top-2 whitespace-nowrap rounded-full border border-[#f4d675]/70 bg-[#03040b]/80 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.24em] text-[#f4d675] transition-opacity duration-300 group-hover/hotspot:opacity-100 group-focus-visible/hotspot:opacity-100 md:text-[10px] ${active === i ? "opacity-100" : "opacity-0"}`}
          >
            {active === i ? "Projecting" : "Open ▸"}
          </span>
        </button>
      ))}
    </div>
  );
}
