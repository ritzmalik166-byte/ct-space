"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";
import { scrollToY } from "@/lib/scroll";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const REVIEWS = [
  {
    quote:
      "The architectural fidelity and discreet acquisition process was second to none. Contenaissance secured our flagship penthouse launch with flawless execution and uncompromising precision.",
    role: "Managing Partner",
    company: "Sovereign Horizon Capital Group",
  },
  {
    quote:
      "Buyers walked our towers months before the first slab was poured. The realtime tour did more for pre-sales than any show flat we have ever built.",
    role: "Director of Sales",
    company: "Meridian Crest Developments",
  },
  {
    quote:
      "From the first sketch to handover film, every frame felt considered. They tell the story of a building the way its architect imagined it.",
    role: "Principal Architect",
    company: "Atelier Nouvelle Studio",
  },
];

/** Progress where the sticky panel locks: the trigger starts when the section enters (100svh of its 460svh). */
const STUCK_AT = 100 / 460;
/** Progress where the lift-off section starts entering below. */
const EXIT_START = 360 / 460;
/** Progress at which each review takes over the stage. */
const REVIEW_STOPS = [STUCK_AT + 0.03, 0.42, 0.6];
const INK = 0.1;
const SWAP = 0.04;

function SlideArrow({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 1 ? "Next review" : "Previous review"}
      className="grid size-10 place-items-center rounded-full text-slate-400 ring-1 ring-white/10 transition-[color,box-shadow,background-color] duration-300 hover:bg-white/[0.04] hover:text-white hover:ring-cyan-400/40 focus-visible:outline-none focus-visible:ring-cyan-400/70"
    >
      <svg viewBox="0 0 16 16" className={`size-3.5 ${dir === -1 ? "rotate-180" : ""}`} aria-hidden>
        <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** Section progress where a review is fully inked, used by the slider controls. */
const READ_AT = (i: number) => REVIEW_STOPS[i] + INK + 0.02;

export function Reviews() {
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);

  // The slider is the scroll position: controls glide to the point where a review is fully read.
  const goTo = (i: number) => {
    const st = trigger.current;
    if (!st) return;
    const index = Math.min(REVIEWS.length - 1, Math.max(0, i));
    scrollToY(st.start + (st.end - st.start) * READ_AT(index));
  };
  const step = (dir: 1 | -1) => {
    const st = trigger.current;
    if (!st) return;
    let current = 0;
    REVIEW_STOPS.forEach((stop, i) => {
      if (st.progress >= stop - SWAP) current = i;
    });
    goTo(current + dir);
  };

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: 0.6 },
      });
      trigger.current = tl.scrollTrigger ?? null;

      tl.fromTo(".js-rv-panel", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT)
        .fromTo(".js-rv-veil", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, STUCK_AT)
        .fromTo(".js-rv-signal", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.04 }, STUCK_AT);

      gsap.utils.toArray<HTMLElement>(".js-rv-item").forEach((item, i) => {
        const at = REVIEW_STOPS[i];
        const words = item.querySelectorAll(".js-rv-word");

        tl.fromTo(item, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: SWAP, ease: "power2.out" }, at);
        if (!reduced) tl.fromTo(words, { opacity: 0.12 }, { opacity: 1, duration: INK / words.length, stagger: INK / words.length }, at + 0.01);
        tl.fromTo(item.querySelectorAll(".js-rv-by"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.03, stagger: 0.01 }, at + 0.03 + INK * 0.6)
          .fromTo(`.js-rv-dash-${i}`, { scaleX: 0 }, { scaleX: 1, duration: SWAP, ease: "power2.out" }, at);

        const next = REVIEW_STOPS[i + 1];
        if (next !== undefined) {
          tl.to(item, { autoAlpha: 0, y: -30, duration: SWAP, ease: "power2.in" }, next - SWAP)
            .to(`.js-rv-dash-${i}`, { scaleX: 0, duration: SWAP }, next - SWAP);
        }
      });

      tl.to(".js-rv-stage", { autoAlpha: 0, y: -50, scale: 0.96, duration: 0.08, ease: "power2.in" }, EXIT_START)
        .to(".js-rv-veil", { autoAlpha: 0.3, duration: 0.12 }, EXIT_START + 0.04)
        .set({}, {}, 1);
    },
    { scope: root },
  );

  return (
    <section
      id="reviews"
      ref={root}
      aria-labelledby="reviews-title"
      className="pointer-events-none relative -mt-[100svh] h-[460svh]"
    >
      <div className="js-rv-panel invisible sticky top-0 h-svh overflow-hidden">
        <div
          aria-hidden
          className="js-rv-veil absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgb(6_10_20/0.55)_0%,rgb(5_7_14/0.82)_60%,rgb(5_6_11/0.94)_100%)]"
        />

        <div className="js-rv-stage relative mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-6 text-center">
          <h2 id="reviews-title" className="sr-only">
            Client reviews
          </h2>
          <p className="js-rv-signal flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400 sm:text-[11px]">
            <span aria-hidden className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/70" />
              <span className="relative size-1.5 rounded-full bg-cyan-400" />
            </span>
            Incoming transmission · Client verified
          </p>

          <ul className="mt-8 grid w-full [grid-template-areas:'stack'] sm:mt-10">
            {REVIEWS.map((review) => (
              <li key={review.company} className="js-rv-item invisible [grid-area:stack]">
                <figure>
                  <blockquote className="text-balance text-[clamp(1.35rem,2.9vw,2.35rem)] font-heading font-semibold leading-[1.22] tracking-[-0.02em] text-white">
                    <p>
                      {`“${review.quote}”`.split(" ").map((word, w) => (
                        <span key={w} className="js-rv-word">
                          {word}{" "}
                        </span>
                      ))}
                    </p>
                  </blockquote>
                  <figcaption className="mt-7 text-sm sm:mt-8">
                    <span className="js-rv-by block font-semibold text-white">{review.role}</span>
                    <span className="js-rv-by mt-1 block text-orange-400">{review.company}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>

          <div className="pointer-events-auto mt-5 flex items-center gap-1">
            <SlideArrow dir={-1} onClick={() => step(-1)} />
            {REVIEWS.map((review, i) => (
              <button
                key={review.company}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show review ${i + 1} of ${REVIEWS.length}`}
                className="group/dash grid h-10 w-8 place-items-center"
              >
                <span className="relative h-[3px] w-6 overflow-hidden rounded-full">
                  <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-white/20 transition-[width] duration-300 group-hover/dash:w-full" />
                  <span className={`js-rv-dash-${i} absolute inset-0 origin-left scale-x-0 rounded-full bg-cyan-400`} />
                </span>
              </button>
            ))}
            <SlideArrow dir={1} onClick={() => step(1)} />
          </div>
        </div>
      </div>
    </section>
  );
}
