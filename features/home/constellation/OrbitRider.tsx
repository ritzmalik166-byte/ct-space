import type { Partner } from "./data";
import { PartnerMark } from "./PartnerMark";

/** A logo riding an orbit; `riders.ts` moves it every frame. Hover or focus shows its description. */
export function OrbitRider({ partner, index }: { partner: Partner; index: number }) {
  const tipId = `cn-tip-${index}`;
  return (
    <li className="js-cn-rider group/rider pointer-events-auto absolute left-0 top-0 will-change-transform [transform-style:preserve-3d] hover:z-20 focus-within:z-20">
      {/* Counter-rotates the disc tilt so logos stand upright on their orbits. */}
      <div className="origin-bottom -translate-x-1/2 -translate-y-1/2 [transform:rotateX(calc(var(--cn-tilt,0deg)*-1))]">
        <div
          tabIndex={partner.description ? 0 : -1}
          aria-describedby={partner.description ? tipId : undefined}
          className="js-cn-badge relative flex cursor-default flex-col items-center gap-1.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <span className="block transition-transform duration-300 group-hover/rider:scale-110">
            <PartnerMark partner={partner} />
          </span>
          {partner.description && (
            <span
              id={tipId}
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 mb-3 w-60 -translate-x-1/2 translate-y-1 rounded-xl bg-[#140f24]/95 p-3.5 text-left opacity-0 shadow-[0_20px_50px_-15px_rgb(0_0_0/0.9)] ring-1 ring-violet-400/30 transition-[opacity,transform] duration-200 group-hover/rider:translate-y-0 group-hover/rider:opacity-100 group-focus-within/rider:translate-y-0 group-focus-within/rider:opacity-100"
            >
              <span className="block font-heading text-sm font-bold text-white">{partner.name}</span>
              <span className="mt-1 block font-sans text-xs leading-relaxed text-slate-300">{partner.description}</span>
              <span
                aria-hidden
                className="absolute left-1/2 top-full size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#140f24] ring-1 ring-violet-400/30 [clip-path:polygon(100%_0,100%_100%,0_100%)]"
              />
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
