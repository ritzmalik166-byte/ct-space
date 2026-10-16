import { HERO_STATE_STOPS } from "../../lib/heroAnimations";

/**
 * Scroll guidance. Holds no scroll logic: the master hero timeline scrubs the
 * gold fill and lights each state node, so it reverses with the timeline.
 */
export default function HeroScrollProgress() {
  return (
    <div className="mt-7 flex items-center gap-4 md:mt-14">
      <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.32em] text-white/50">
        Scroll to explore
      </span>
      <div aria-hidden className="relative h-px w-24 bg-white/15 md:w-36">
        <div
          data-hero-progress-fill
          className="brand-gold-fill absolute inset-0 origin-left"
          style={{ transform: "scaleX(0)" }}
        />
        {HERO_STATE_STOPS.map((stop, i) => (
          <span
            key={stop}
            className="absolute top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-[#03040b]"
            style={{ left: `${stop * 100}%` }}
          >
            <span
              data-hero-progress-node
              className="absolute inset-px rounded-full bg-[#f4d675] shadow-[0_0_8px_rgba(244,214,117,0.65)]"
              style={i === 0 ? undefined : { opacity: 0 }}
            />
          </span>
        ))}
      </div>
      <span
        aria-hidden
        className="text-[13px] leading-none text-[#e8c45e]/80 motion-safe:animate-[hero-scroll-cue_2.4s_ease-in-out_infinite]"
      >
        ↓
      </span>
    </div>
  );
}
