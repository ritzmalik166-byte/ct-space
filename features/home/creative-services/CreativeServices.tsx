"use client";

import { useRef, useState, type PointerEvent, type SyntheticEvent } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { motion } from "@/features/home/lib/store";
import type { Service } from "@/features/contact/lib/validation";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Slide = { service: Service; title: string; body: string; bg: string; figure: string; tint: string };

const SLIDES: Slide[] = [
  {
    service: "AI Brand Films",
    title: "AI Brand Films",
    body: "Discover how to turn your brand story into a cinematic experience via AI-driven 3D technology. We use generative AI to make brand films with dynamic live action in a synthetic environment that boosts your brand and captures imagination!",
    bg: "/images/services/brand-films-bg.webp",
    figure: "/images/services/brand-films-figure.webp",
    tint: "from-slate-700 to-slate-950",
  },
  {
    service: "Digital-First Content",
    title: "Digital-First Content",
    body: "Reels, shorts and social stories built for the feed. We pair generative visuals with sharp editing so every post stops the scroll and stays on brand, at the pace your channels demand.",
    bg: "/images/services/digital-content-bg.webp",
    figure: "/images/services/digital-content-figure1.webp",
    tint: "from-indigo-900 to-slate-950",
  },
  {
    service: "AI-Powered Campaigns",
    title: "AI-Powered Campaigns",
    body: "Campaigns that learn, test and optimise themselves. We generate creative variations at scale, measure what lands and keep refining, so your budget follows the ideas that actually work.",
    figure: "/images/services/campaigns-bg.webp",
    bg: "/images/services/campaigns-figure.webp",
    tint: "from-cyan-900 to-slate-950",
  },
  {
    service: "Visual Identity System",
    title: "Visual Identity System",
    body: "Logos, type and design systems that scale. We explore hundreds of directions with AI, then craft the one that fits into a complete identity your team can use everywhere.",
    bg: "/images/services/identity-bg.webp",
    figure: "/images/services/identity-figure.webp",
    tint: "from-amber-900 to-slate-950",
  },
];

const HIDDEN_RIGHT = "inset(0% 0% 0% 100%)";
const HIDDEN_LEFT = "inset(0% 100% 0% 0%)";
const SHOWN = "inset(0% 0% 0% 0%)";
const SWIPE_PX = 50;

/** Missing artwork falls back to the slide's gradient instead of a broken image icon. */
const hideOnError = (e: SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = "hidden";
};

const pad = (n: number) => String(n).padStart(2, "0");

export function CreativeServices() {
  const root = useRef<HTMLElement>(null);
  const current = useRef(0);
  const busy = useRef(false);
  const swipeX = useRef<number | null>(null);
  const [active, setActive] = useState(0);

  const { contextSafe } = useGSAP(
    () => {
      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: root.current, start: "top 85%", end: "top 15%", scrub: 0.8 },
        })
        .fromTo(".js-cs-head", { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0)
        .fromTo(
          ".js-cs-stage",
          { clipPath: "inset(12% 0% 12% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "power2.out" },
          0,
        );
    },
    { scope: root },
  );

  const go = (dir: 1 | -1) => contextSafe(() => animateTo(dir))();

  const animateTo = (dir: 1 | -1) => {
    const scope = root.current;
    if (busy.current || !scope) return;
    const from = current.current;
    const to = (from + dir + SLIDES.length) % SLIDES.length;
    current.current = to;
    setActive(to);

    const q = gsap.utils.selector(scope);
    const bgs = q(".js-cs-bg");
    const bgImgs = q(".js-cs-bg-img");
    const figs = q(".js-cs-figure");
    const copies = q(".js-cs-copy");
    const oldLines = copies[from].querySelectorAll(".js-cs-line");
    const newLines = copies[to].querySelectorAll(".js-cs-line");

    busy.current = true;
    const done = () => {
      gsap.set(bgs[from], { clipPath: HIDDEN_RIGHT, zIndex: 0 });
      gsap.set(bgs[to], { zIndex: 1 });
      gsap.set([copies[from], figs[from]], { autoAlpha: 0 });
      busy.current = false;
    };

    if (motion.reduced) {
      gsap
        .timeline({ onComplete: done })
        .set(bgs[to], { zIndex: 2, clipPath: SHOWN })
        .fromTo(bgs[to], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0)
        .to([figs[from], copies[from]], { autoAlpha: 0, duration: 0.3 }, 0)
        .set(newLines, { y: 0, autoAlpha: 1 })
        .to([figs[to], copies[to]], { autoAlpha: 1, duration: 0.4 }, 0.15);
      return;
    }

    gsap
      .timeline({ defaults: { ease: "power3.inOut" }, onComplete: done })
      // Background: the next image wipes in from the arrow's side while both layers drift for parallax.
      .set(bgs[to], { zIndex: 2, autoAlpha: 1 }, 0)
      .fromTo(bgs[to], { clipPath: dir === 1 ? HIDDEN_RIGHT : HIDDEN_LEFT }, { clipPath: SHOWN, duration: 1.2 }, 0)
      .fromTo(bgImgs[to], { xPercent: dir * 18, scale: 1.12 }, { xPercent: 0, scale: 1, duration: 1.4 }, 0)
      .to(bgImgs[from], { xPercent: -dir * 18, duration: 1.2 }, 0)
      // Figure: the current one slides out ahead of the wipe, the next follows it in from the same side.
      .to(figs[from], { xPercent: -dir * 45, rotate: -dir * 4, autoAlpha: 0, duration: 0.7, ease: "power2.in" }, 0)
      .fromTo(
        figs[to],
        { xPercent: dir * 55, rotate: dir * 5, autoAlpha: 0 },
        { xPercent: 0, rotate: 0, autoAlpha: 1, duration: 1.1, ease: "power3.out" },
        0.45,
      )
      // Copy: lines leave upwards, then the new ones rise in one after another.
      .to(oldLines, { y: -24, autoAlpha: 0, duration: 0.4, stagger: 0.05, ease: "power2.in" }, 0)
      .set(copies[from], { autoAlpha: 0 }, 0.6)
      .set(copies[to], { autoAlpha: 1 }, 0.6)
      .fromTo(newLines, { y: 32, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.08, ease: "power3.out" }, 0.6)
      .set(bgImgs[from], { xPercent: 0 });
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") swipeX.current = e.clientX;
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (swipeX.current === null) return;
    const dx = e.clientX - swipeX.current;
    swipeX.current = null;
    if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
  };

  return (
    <section id="creative-services" ref={root} aria-labelledby="creative-services-title" className="relative py-20 sm:py-28">
      <div className="js-cs-head mx-auto flex max-w-[506px] flex-col items-center gap-2.5 px-5 text-center">
        <h2
          id="creative-services-title"
          className="bg-[linear-gradient(0deg,#94AEB8_0%,#F1F5F9_50%,#FFFFFF_100%)] bg-clip-text font-heading text-[30px] font-bold uppercase leading-none tracking-[-0.6px] text-transparent sm:text-[38px]"
        >
          AI creative services
        </h2>
        <p className="font-sans text-base font-normal leading-tight tracking-[-0.6px] text-[#94A3B8] sm:text-lg">
          AI-powered creative solutions for campaigns, content, branding, &amp; digital experiences.
        </p>
      </div>

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="AI creative services"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeX.current = null)}
        className="js-cs-stage relative mt-10 h-[620px] w-full touch-pan-y overflow-hidden bg-space sm:mt-14"
      >
        {/* Layer 1: background images, stacked; GSAP wipes between them. */}
        {SLIDES.map((slide, i) => (
          <div
            key={slide.bg}
            className={`js-cs-bg absolute inset-0 overflow-hidden bg-gradient-to-br ${slide.tint}`}
            style={{ clipPath: i === 0 ? SHOWN : HIDDEN_RIGHT, zIndex: i === 0 ? 1 : 0 }}
          >
            <div className="js-cs-bg-img absolute inset-0 will-change-transform">
              <Image src={slide.bg} alt="" fill sizes="100vw" className="object-cover" onError={hideOnError} />
            </div>
          </div>
        ))}

        {/* Layer 2: first shadow, under the figure. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[3] bg-black/55 [clip-path:polygon(0_0,100%_0,100%_38%,0_62%)] lg:[clip-path:polygon(0_0,72%_0,44%_100%,0_100%)]"
        />

        {/* Layer 3: figures. */}
        <div className="pointer-events-none absolute inset-y-0 right-[-6%] z-[4] w-[78%] sm:right-0 sm:w-[55%] lg:left-[44%] lg:right-auto lg:w-[42%]">
          {SLIDES.map((slide, i) => (
            <div
              key={slide.figure}
              className={`js-cs-figure absolute inset-x-0 bottom-0 top-[6%] origin-bottom will-change-transform ${i === 0 ? "" : "invisible opacity-0"}`}
            >
              <Image
                src={slide.figure}
                alt=""
                fill
                sizes="(min-width: 1024px) 42vw, 78vw"
                className="object-contain object-bottom"
                onError={hideOnError}
              />
            </div>
          ))}
        </div>

        {/* Layer 4: second shadow, over the figure, plus a soft fade behind the copy. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[5] bg-black/40 [clip-path:polygon(100%_55%,100%_100%,0_100%,0_85%)] lg:[clip-path:polygon(93%_0,100%_0,100%_100%,63%_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-black/85 via-black/30 to-transparent lg:bg-gradient-to-r lg:from-black/55 lg:via-black/10"
        />

        {/* Layer 5: copy and controls. */}
        <div className="absolute inset-0 z-[6] flex items-end px-5 pb-10 sm:px-10 lg:items-center lg:px-[99px] lg:pb-0">
          <div className="flex w-full max-w-[479px] flex-col gap-[30px]">
            <div aria-live="polite" className="grid">
              {SLIDES.map((slide, i) => (
                <div
                  key={slide.title}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${SLIDES.length}`}
                  className={`js-cs-copy flex flex-col items-start gap-[30px] [grid-area:1/1] ${i === 0 ? "" : "invisible opacity-0"}`}
                >
                  <h3 className="js-cs-line font-heading text-[30px] font-bold leading-none tracking-normal text-white-700 sm:text-[38px]">
                    {slide.title}
                  </h3>
                  <p className="js-cs-line font-sans text-base leading-none text-white-400 sm:text-[18px]">
                    {slide.body}
                  </p>
                  <div className="js-cs-line">
                    <button
                      type="button"
                      data-open-contact={slide.service}
                      tabIndex={i === active ? 0 : -1}
                      className="group/explore flex h-[46px] w-[180px] items-center justify-between gap-2.5 rounded-[100px] bg-white px-[19px] py-[9px] font-sans text-base font-semibold text-black transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                      Explore
                      <span className="grid size-7 place-items-center rounded-full bg-black text-white">
                        <svg viewBox="0 0 24 24" className="size-4 transition-transform duration-500 group-hover/explore:rotate-45" aria-hidden>
                          <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <ArrowButton dir={-1} onClick={() => go(-1)} />
              <ArrowButton dir={1} onClick={() => go(1)} />
              <span className="ml-2 font-sans text-sm tabular-nums tracking-wide text-white/70">
                <span className="text-white">{pad(active + 1)}</span> / {pad(SLIDES.length)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArrowButton({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 1 ? "Next service" : "Previous service"}
      className="grid size-10 place-items-center rounded-full bg-white text-black transition-transform duration-300 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path
          d={dir === 1 ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
