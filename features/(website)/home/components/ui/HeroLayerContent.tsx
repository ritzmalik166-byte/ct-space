import Link from "next/link";
import type { HeroStateContent } from "../../lib/heroContent";

interface HeroLayerContentProps {
  content: HeroStateContent;
  index: number;
}

/** Splits the heading into masked words for the line-reveal animation. */
function MaskedWords({ text }: { text: string }) {
  const parts = text.split(" ");
  return (
    <>
      {parts.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.14em] -mb-[0.14em] align-top">
          <span data-hero-word className="inline-block will-change-transform">
            {word}
          </span>
          {i < parts.length - 1 ? "\u00A0" : null}
        </span>
      ))}
    </>
  );
}

export default function HeroLayerContent({ content, index }: HeroLayerContentProps) {
  const Heading = index === 0 ? "h1" : "h2";

  return (
    <div
      data-hero-layer
      className="col-start-1 row-start-1 flex flex-col items-start"
      style={index === 0 ? undefined : { visibility: "hidden", opacity: 0 }}
    >
      <p
        data-hero-item
        className="mb-6 flex items-center gap-3 font-mono text-[12px] font-medium uppercase tracking-[0.32em] text-cyan-200/80"
      >
        <span aria-hidden className="h-px w-8 bg-linear-to-r from-cyan-300/0 to-cyan-300/80" />
        <span className="sr-only">{`${index + 1} of 3: `}</span>
        {content.eyebrow}
      </p>

      <Heading className="max-w-[13ch] text-balance text-[clamp(2.4rem,4.6vw,4.6rem)] font-medium leading-[1.02] tracking-[-0.035em] text-white">
        <MaskedWords text={content.heading} />
      </Heading>

      <p
        data-hero-item
        className="mt-6 max-w-[34rem] text-[15px] leading-relaxed text-slate-300/75 md:text-[17px]"
      >
        {content.description}
      </p>

      <div data-hero-item className="mt-9 flex flex-wrap items-center gap-3">
        <Link
          href={content.primaryCta.href}
          className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-slate-950 shadow-[0_0_40px_-8px_rgba(95,230,255,0.55)] transition-colors duration-300 hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#03040b]"
        >
          {content.primaryCta.label}
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
            →
          </span>
        </Link>
        <Link
          href={content.secondaryCta.href}
          className="inline-flex h-12 items-center rounded-full border border-white/20 bg-white/[0.03] px-6 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors duration-300 hover:border-cyan-200/60 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#03040b]"
        >
          {content.secondaryCta.label}
        </Link>
      </div>
    </div>
  );
}
