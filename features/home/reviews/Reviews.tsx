"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SectionHeading } from "@/features/home/components/SectionHeading";
import { prefersReducedMotion } from "@/lib/media";
import { scrollToY } from "@/lib/scroll";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const REVIEWS = [
  {
    variant: "quote",
    quote:
      "Fast, creative, and incredibly consistent their AI content workflow completely changed how we scale campaigns.",
    name: "FAIRFOX IT INFRA",
    role: "Marketing Head",
    company: "Ritz Media World",
    initials: "AS",
  },
  {
    variant: "quote",
    quote:
      "The quality felt premium from day one. Their AI-powered creatives gave our brand a much stronger digital identity.",
    name: "ELDECO GROUP",
    role: "Managing Director",
    company: "Creative Thinks Media",
    initials: "AV",
  },
  {
    variant: "quote",
    quote:
      "What impressed us most was how quickly they turned ideas into high-performing digital campaigns.",
    name: "MADHUSUDHAN GHEE",
    role: "Managing Director",
    company: "Northline AI",
    initials: "RM",
  },
  {
    variant: "quote",
    quote:
      "Their AI-driven approach helped us create engaging content for social media, ads, and brand launches effortlessly.",
    name: "ESCORTS TRACTOR",
    role: "Chief Communication Officer ",
    company: "BrightForge",
    initials: "IK",
  },
  {
    variant: "quote",
    quote:
      "The team understood both creativity and performance marketing, which made every campaign more effective.",
    name: "SAYA GROUP",
    role: "Director",
    company: "GreenByte",
    initials: "VM",
  },
];

/** Must match the section's `h-[640svh]` class. */
const SECTION_SVH = 640;
/** Progress where the sticky panel locks: the trigger starts when the section enters (its first 100svh). */
const STUCK_AT = 100 / SECTION_SVH;
/** Progress where the footer starts rising over the panel (its last 100svh, see globals.css). */
const EXIT_START = (SECTION_SVH - 100) / SECTION_SVH;
/** Each review owns an equal slice of the sticky range, so adding reviews never overlaps them. */
const FIRST_STOP = STUCK_AT + 0.02;
const SLOT = (EXIT_START - FIRST_STOP) / REVIEWS.length;
/** Progress at which each review takes over the stage. */
const REVIEW_STOPS = REVIEWS.map((_, i) => FIRST_STOP + i * SLOT);
const SWAP = 0.03;
/** Scroll share a card spends rising from below the screen onto the pile. */
const RISE = SLOT * 0.45;
const INK_AT = RISE * 0.6;
const INK = SLOT * 0.4;
const BYLINE_AT = SLOT * 0.6;
/** Resting pose by depth in the pile: 0 is the card on top. Anything deeper than the last entry is hidden. */
const DECK = [
  { rotate: 0, y: 0, scale: 1, shade: 0 },
  { rotate: 4, y: -16, scale: 0.95, shade: 0.35 },
  { rotate: -6, y: -30, scale: 0.9, shade: 0.6 },
];

function SlideArrow({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 1 ? "Next review" : "Previous review"}
      className="grid size-10 place-items-center rounded-full text-slate-400 ring-1 ring-white/10 transition-[color,box-shadow,background-color] duration-300 hover:bg-white/[0.04] hover:text-white hover:ring-[#DAAF25]/50 focus-visible:outline-none focus-visible:ring-[#DAAF25]/80"
    >
      <svg viewBox="0 0 16 16" className={`size-3.5 ${dir === -1 ? "rotate-180" : ""}`} aria-hidden>
        <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** Section progress where a review is fully inked, used by the slider controls. */
const READ_AT = (i: number) => REVIEW_STOPS[i] + SLOT * 0.8;

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
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true },
      });
      trigger.current = tl.scrollTrigger ?? null;

      tl.fromTo(".js-rv-panel", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT)
        .fromTo(".js-rv-veil", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, STUCK_AT);

      // Each review rises from below the screen onto the pile; earlier ones stay underneath, tilting back and dimming
      // one level per new arrival until they drop out of sight.
      const items = gsap.utils.toArray<HTMLElement>(".js-rv-item");
      items.forEach((item, i) => {
        const at = REVIEW_STOPS[i];
        const words = item.querySelectorAll(".js-rv-word");

        tl.fromTo(
          item,
          reduced ? { autoAlpha: 0 } : { autoAlpha: 0, y: () => window.innerHeight * 0.75, rotate: 8 },
          { autoAlpha: 1, y: 0, rotate: 0, duration: reduced ? SWAP : RISE, ease: "power3.out" },
          at,
        );
        if (!reduced) tl.fromTo(words, { opacity: 0.12 }, { opacity: 1, duration: INK / words.length, stagger: INK / words.length }, at + INK_AT);
        tl.fromTo(item.querySelectorAll(".js-rv-by"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.03, stagger: 0.01 }, at + BYLINE_AT)
          .fromTo(`.js-rv-dash-${i}`, { scaleX: 0 }, { scaleX: 1, duration: SWAP, ease: "power2.out" }, at);

        const next = REVIEW_STOPS[i + 1];
        if (next !== undefined) tl.to(`.js-rv-dash-${i}`, { scaleX: 0, duration: SWAP }, next - SWAP);

        for (let j = i + 1; j < items.length; j++) {
          const depth = j - i;
          // Settle back as the newcomer nears, so the pile shifts in the same motion as the landing.
          const when = REVIEW_STOPS[j] + RISE * 0.3;
          const span = RISE * 0.7;
          const pose = DECK[depth];
          if (!pose) {
            tl.to(item, { autoAlpha: 0, duration: span }, when);
            break;
          }
          tl.to(item.querySelector(".js-rv-shade"), { opacity: pose.shade, duration: span }, when);
          if (depth === 1) tl.to(item.querySelectorAll(".js-rv-content"), { opacity: 0, duration: span * 0.6 }, when);
          if (!reduced) tl.to(item, { rotate: pose.rotate, y: pose.y, scale: pose.scale, duration: span, ease: "power2.out" }, when);
        }
      });

      // The footer slides up over the pinned panel across this last stretch; the stage recedes beneath it.
      if (!reduced) tl.to(".js-rv-stage", { y: -60, scale: 0.92, opacity: 0.35, duration: 1 - EXIT_START, ease: "power1.in" }, EXIT_START);
      tl.set({}, {}, 1);
    },
    { scope: root },
  );

  return (
    <section
      id="reviews"
      ref={root}
      aria-labelledby="reviews-title"
      className="pointer-events-none relative -mt-[100svh] h-[640svh]"
    >
      <div className="js-rv-panel invisible sticky top-0 h-svh overflow-hidden">
        <div
          aria-hidden
          className="js-rv-veil absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgb(6_10_20/0.55)_0%,rgb(5_7_14/0.82)_60%,rgb(5_6_11/0.94)_100%)]"
        />

        <div className="js-rv-stage relative mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-6 text-center">
          <SectionHeading id="reviews-title" title="AI creative excellence" subtitle="Trusted by Leaders from various Industries" start="top top" />

          <div className="mt-12 w-full max-w-[600px] sm:mt-16">
            <ul className="grid w-full [grid-template-areas:'stack']">
              {REVIEWS.map((review) => (
                <li key={review.company} className="js-rv-item invisible [grid-area:stack]">
                  <figure className="relative flex h-full flex-col justify-center rounded-[24px] bg-white px-6 py-7 text-left shadow-[0_30px_80px_-30px_rgb(0_0_0/0.7)] sm:px-10 sm:py-9">
                    <blockquote className="js-rv-content font-sans text-[clamp(1.05rem,1.9vw,1.4rem)] font-medium leading-[1.45] tracking-[-0.01em] text-[#111111]">
                      <p>
                        {`“${review.quote}”`.split(" ").map((word, w) => (
                          <span key={w} className="js-rv-word">
                            {word}{" "}
                          </span>
                        ))}
                      </p>
                    </blockquote>
                    <figcaption className="js-rv-content mt-6 flex items-center gap-5 sm:mt-8">
                      <span
                        aria-hidden
                        className="js-rv-by grid size-11 shrink-0 place-items-center rounded-full bg-[#A3A3A3] font-serif text-[15px] text-[#262626]"
                      >
                        {review.initials}
                      </span>
                      <span className="js-rv-by flex flex-col">
                        <span className="font-sans text-[15px] font-semibold uppercase tracking-[0.02em] text-black">{review.name}</span>
                        <span className="mt-0.5 font-sans text-xs text-[#6B7280]">{review.role}</span>
                      </span>
                    </figcaption>
                    <span aria-hidden className="js-rv-shade pointer-events-none absolute inset-0 rounded-[24px] bg-[#0b0d12] opacity-0" />
                  </figure>
                </li>
              ))}
            </ul>
          </div>

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
                  <span className={`js-rv-dash-${i} absolute inset-0 origin-left scale-x-0 rounded-full bg-[#DAAF25]`} />
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
