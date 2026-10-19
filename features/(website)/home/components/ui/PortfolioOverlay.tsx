"use client";

import type { Ref } from "react";
import Image from "next/image";
import { INITIAL_PARTNER_INDEX, PORTFOLIO_PARTNERS } from "../../lib/portfolioPartners";
import { PLANET_PRESETS } from "../../lib/voyage/planetPresets";

interface PortfolioOverlayProps {
  ref?: Ref<HTMLElement>;
  onSelect?: (index: number) => void;
  onStep?: (direction: 1 | -1) => void;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4d675] focus-visible:ring-offset-2 focus-visible:ring-offset-[#03040b]";

function Arrow({ direction }: { direction: 1 | -1 }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d={direction === 1 ? "M6 3l5 5-5 5" : "M10 3L5 8l5 5"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExpertiseIcon({ index }: { index: number }) {
  const paths = [
    "M8 2v2M8 12v2M2 8h2M12 8h2M4.2 4.2l1.4 1.4M10.4 10.4l1.4 1.4M4.2 11.8l1.4-1.4M10.4 5.6l1.4-1.4M8 6a2 2 0 100 4 2 2 0 000-4z",
    "M5 5L2 8l3 3M11 5l3 3-3 3M9.5 3l-3 10",
    "M2 13l4-4 3 3 5-6M10 6h4v4",
  ];
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0 text-[#e2bf74]" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d={paths[index % paths.length]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * HTML layer for the solar-system section. The 3D planets are the backdrop;
 * copy, selector and labels stay selectable, focusable and readable. Scroll
 * sync writes `data-active` and layer opacity directly (see heroAnimations).
 */
export default function PortfolioOverlay({ ref, onSelect, onStep }: PortfolioOverlayProps) {
  const total = String(PORTFOLIO_PARTNERS.length).padStart(2, "0");

  return (
    <section
      ref={ref}
      aria-label="Portfolio partners"
      className="pointer-events-none absolute inset-0 z-20 text-white"
      style={{ opacity: 0, visibility: "hidden" }}
    >
      {/* Planet labels, positioned every frame over their 3D planets. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {PORTFOLIO_PARTNERS.map((partner, index) => (
          <div
            key={partner.id}
            data-planet-label
            data-active={index === INITIAL_PARTNER_INDEX}
            className="group absolute left-0 top-0 flex flex-col items-center opacity-0 will-change-transform"
          >
            <span className="font-mono text-[11px] text-white/45 group-data-[active=true]:text-[15px] group-data-[active=true]:text-[#f4d675] md:text-[12px]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="whitespace-nowrap font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-white/70 transition-colors duration-300 group-data-[active=true]:text-[#f4d675] md:text-[11px]">
              {partner.name}
            </span>
            <span className="mt-1.5 h-4 w-px bg-linear-to-b from-white/40 to-transparent group-data-[active=true]:from-[#f4d675]/80" />
          </div>
        ))}
      </div>

      {/* Section header. */}
      <header className="absolute left-6 top-6 max-w-[20rem] md:left-10 md:top-[7%] md:max-w-none lg:left-14">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.34em] text-[#e2bf74]">Section 02</p>
        <h2 className="mt-2 text-[clamp(1.35rem,2.9vw,2.6rem)] font-medium uppercase leading-[1.05] tracking-[0.01em] text-white">
          Our <span className="brand-gold-text">portfolio</span> partners
        </h2>
        <p className="mt-3 hidden max-w-[19rem] text-[14px] leading-relaxed text-slate-300/75 md:block">
          Exploring partnerships that drive innovation across the digital universe.
        </p>
        <span aria-hidden className="mt-5 hidden h-px w-10 bg-white/25 md:block" />
        <p className="mt-4 hidden items-center gap-3 font-mono text-[10px] uppercase leading-[1.6] tracking-[0.2em] md:flex">
          <svg aria-hidden viewBox="0 0 16 24" className="h-6 w-4 shrink-0 text-[#e2bf74]" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1" y="1" width="14" height="22" rx="7" />
            <path d="M8 5v4" strokeLinecap="round" />
          </svg>
          <span>
            <span className="block text-white/70">Scroll to rotate</span>
            <span className="block text-[#e2bf74]">the solar system</span>
          </span>
        </p>
      </header>

      {/* Progress dots and active name. */}
      <div className="absolute left-1/2 top-6 hidden -translate-x-1/2 flex-col items-center md:flex">
        <div className="flex items-center gap-2.5">
          {PORTFOLIO_PARTNERS.map((partner, index) => (
            <span
              key={partner.id}
              data-partner-dot
              data-active={index === INITIAL_PARTNER_INDEX}
              className="h-1.5 w-1.5 rotate-45 border border-white/35 transition-all duration-300 data-[active=true]:w-6 data-[active=true]:rotate-0 data-[active=true]:border-[#f4d675] data-[active=true]:bg-[#f4d675]"
            />
          ))}
        </div>
        <div className="mt-3 grid text-center">
          {PORTFOLIO_PARTNERS.map((partner, index) => (
            <span
              key={partner.id}
              data-partner-name
              data-active={index === INITIAL_PARTNER_INDEX}
              className="col-start-1 row-start-1 font-mono text-[11px] uppercase tracking-[0.3em] text-[#e2bf74] opacity-0 transition-opacity duration-300 data-[active=true]:opacity-100"
            >
              {partner.name}
            </span>
          ))}
        </div>
      </div>

      {/* Active partner panel. */}
      <div className="absolute inset-x-4 bottom-[7.5rem] md:inset-x-auto md:bottom-auto md:right-10 md:top-1/2 md:w-[21rem] md:-translate-y-1/2 lg:right-16 lg:w-[23rem]">
        <div className="relative overflow-hidden rounded-2xl border border-[#e2bf74]/25 bg-[#05070f]/70 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-md md:p-7">
          <span aria-hidden className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-[#f4d675]/70 to-transparent" />
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.34em] text-[#e2bf74]">Active partner</p>
          <div className="mt-4 grid">
            {PORTFOLIO_PARTNERS.map((partner, index) => (
              <article
                key={partner.id}
                data-partner-layer
                aria-hidden={index !== INITIAL_PARTNER_INDEX}
                className="col-start-1 row-start-1"
                style={index === INITIAL_PARTNER_INDEX ? undefined : { opacity: 0, visibility: "hidden" }}
              >
                <div className="flex items-center gap-4">
                  {partner.logo ? (
                    <Image src={partner.logo} alt="" width={119} height={64} className="h-9 w-auto md:h-11" />
                  ) : (
                    <span
                      aria-hidden
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e2bf74]/40 font-mono text-sm text-[#e2bf74] md:h-11 md:w-11"
                    >
                      {partner.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate text-[1.35rem] font-semibold leading-tight tracking-[-0.01em] md:text-[1.6rem]">
                      {partner.name}
                    </h3>
                    <p className="brand-gold-text text-[13px] font-medium md:text-[14px]">{partner.tagline}</p>
                  </div>
                </div>
                <p className="mt-4 line-clamp-3 text-[13px] leading-relaxed text-slate-300/80 md:line-clamp-none md:text-[14px]">
                  {partner.description}
                </p>
                {partner.expertise.length ? (
                  <div className="mt-5 hidden md:block">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Expertise</p>
                    <ul className="mt-3 space-y-2.5">
                      {partner.expertise.map((item, i) => (
                        <li key={item} className="flex items-center gap-3 text-[14px] text-white/85">
                          <ExpertiseIcon index={i} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {partner.placeholder ? (
                  <p className="mt-4 inline-block rounded border border-dashed border-white/25 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
                    Placeholder content
                  </p>
                ) : null}
                <a
                  href={partner.href}
                  tabIndex={index === INITIAL_PARTNER_INDEX ? 0 : -1}
                  className={`group mt-5 flex items-center justify-between rounded-full border border-[#e2bf74]/45 px-5 py-2.5 text-[13px] font-medium text-[#f4d675] transition-colors hover:bg-[#e2bf74]/10 md:mt-6 ${focusRing}`}
                >
                  {partner.ctaLabel}
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Planet selector. */}
      <nav
        aria-label="Choose a partner planet"
        className="pointer-events-auto absolute inset-x-0 bottom-4 flex items-center justify-center gap-3 px-3 md:bottom-6 md:px-10"
      >
        <button
          type="button"
          aria-label="Previous partner"
          onClick={() => onStep?.(-1)}
          className={`hidden size-10 shrink-0 items-center justify-center rounded-full border border-[#e2bf74]/40 bg-[#05070f]/70 text-[#f4d675] backdrop-blur-md transition-colors hover:border-[#e2bf74] md:flex ${focusRing}`}
        >
          <Arrow direction={-1} />
        </button>
        <ul className="flex snap-x gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#05070f]/60 p-1.5 backdrop-blur-md [scrollbar-width:none]">
          {PORTFOLIO_PARTNERS.map((partner, index) => (
            <li key={partner.id} className="snap-center">
              <button
                type="button"
                data-partner-thumb
                data-active={index === INITIAL_PARTNER_INDEX}
                aria-current={index === INITIAL_PARTNER_INDEX ? "true" : undefined}
                aria-label={`Show ${partner.name}`}
                onClick={() => onSelect?.(index)}
                className={`group flex w-[4.4rem] flex-col items-center gap-1 rounded-xl border border-transparent px-1 py-1.5 transition-colors hover:bg-white/5 data-[active=true]:border-[#e2bf74]/50 data-[active=true]:bg-[#e2bf74]/8 md:w-[6.4rem] md:py-2 ${focusRing}`}
              >
                <Image
                  src={PLANET_PRESETS[partner.planet].thumb}
                  alt=""
                  width={200}
                  height={200}
                  className="size-9 opacity-75 transition-opacity group-hover:opacity-100 group-data-[active=true]:opacity-100 md:size-12"
                />
                <span className="hidden font-mono text-[9px] text-white/40 group-data-[active=true]:text-[#f4d675] md:block">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="w-full truncate text-center font-mono text-[9px] uppercase tracking-[0.12em] text-white/55 group-data-[active=true]:text-[#f4d675] md:text-[10px]">
                  {partner.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-label="Next partner"
          onClick={() => onStep?.(1)}
          className={`hidden size-10 shrink-0 items-center justify-center rounded-full border border-[#e2bf74]/40 bg-[#05070f]/70 text-[#f4d675] backdrop-blur-md transition-colors hover:border-[#e2bf74] md:flex ${focusRing}`}
        >
          <Arrow direction={1} />
        </button>
      </nav>

      <p className="sr-only" aria-live="polite" data-partner-live>
        Active partner: {PORTFOLIO_PARTNERS[INITIAL_PARTNER_INDEX].name}, {String(INITIAL_PARTNER_INDEX + 1).padStart(2, "0")} of {total}
      </p>
    </section>
  );
}
