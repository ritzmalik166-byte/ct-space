import { useId } from "react";

const WORDMARK =
  "bg-gradient-to-b from-[#f7d27a] to-[#b98318] bg-clip-text font-heading font-semibold uppercase tracking-[0.06em] text-transparent";

/** Gold Contenaissance mark. `stacked` is the full footer lockup; `inline` fits the navbar. */
export function BrandLogo({ variant = "stacked" }: { variant?: "stacked" | "inline" }) {
  // Navbar and footer render on the same page, so each gradient needs its own id.
  const gradient = `brand-gold-${useId().replace(/[^\w-]/g, "")}`;
  const stacked = variant === "stacked";

  const mark = (
    <svg viewBox="0 0 100 50" className={stacked ? "h-11 w-auto" : "h-6 w-auto"} aria-hidden>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7d27a" />
          <stop offset="0.5" stopColor="#c8901f" />
          <stop offset="1" stopColor="#f3c55c" />
        </linearGradient>
      </defs>
      <path
        d="M50 25C38 9 10 9 10 25s28 16 40 0 40-16 40 0-28 16-40 0z"
        fill="none"
        stroke={`url(#${gradient})`}
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );

  if (!stacked) {
    return (
      <span className="flex items-center gap-2">
        {mark}
        <span className="flex flex-col leading-none">
          <span className={`${WORDMARK} text-[1.05rem]`}>Contenaissance</span>
          <span className="mt-0.5 hidden text-[6px] uppercase tracking-[0.22em] text-[#c8a24d] sm:block">
            AI Storytelling Studios
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className="flex flex-col items-center">
      {mark}
      <span className={`${WORDMARK} mt-1 text-lg`}>Contenaissance</span>
      <span className="text-[7px] uppercase tracking-[0.22em] text-[#c8a24d]">AI Storytelling Studios</span>
    </span>
  );
}
