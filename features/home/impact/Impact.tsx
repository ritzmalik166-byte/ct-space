"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Metric = {
  from: number;
  to: number;
  decimals: number;
  grouping: boolean;
  prefix?: string;
  suffix?: string;
  label: string;
  note: string;
};

const METRICS: Metric[] = [
  {
    from: 0,
    to: 4.8,
    decimals: 1,
    grouping: true,
    prefix: "$",
    suffix: "B+",
    label: "Transacted portfolio value",
    note: "Across residential, commercial and mixed-use launches we helped sell.",
  },
  {
    from: 0,
    to: 1200,
    decimals: 0,
    grouping: true,
    suffix: "+",
    label: "Sanctuaries delivered",
    note: "Homes, villas and estates visualised, filmed and brought to market.",
  },
  {
    from: 1990,
    to: 2012,
    decimals: 0,
    grouping: false,
    label: "Architectural heritage",
    note: "More than a decade of design craft behind every frame we make.",
  },
];

/** Progress where the sticky panel locks: the trigger starts when the section enters (100svh of its 380svh). */
const STUCK_AT = 100 / 380;
/** Progress where the client reviews start entering below. */
const EXIT_START = 280 / 380;
const TRAIL_START = STUCK_AT + 0.05;
const TRAIL_DURATION = 0.24;
const TRAIL = "M 20 160 C 180 30, 360 20, 500 80 S 800 170, 980 36";
/** The trail's viewBox size. */
const TRAIL_BOX = { w: 1000, h: 200 };

function format(metric: Metric, value: number) {
  const n = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: metric.decimals,
    maximumFractionDigits: metric.decimals,
    useGrouping: metric.grouping,
  }).format(value);
  return `${metric.prefix ?? ""}${n}${metric.suffix ?? ""}`;
}

function Rocket() {
  return (
    <svg viewBox="0 0 32 20" className="h-5 w-8" aria-hidden>
      <ellipse cx="5" cy="10" rx="5" ry="2.6" fill="#ff6b3d" className="animate-pulse" />
      <path d="M8 6.5 4.5 2h4.5l4 4.5zM8 13.5 4.5 18h4.5l4-4.5z" fill="#0e7490" />
      <path d="M7 10c3-4.2 9-5.6 17-4.5 2.6 1 4.6 2.6 6 4.5-1.4 1.9-3.4 3.5-6 4.5-8 1.1-14-.3-17-4.5z" fill="#e0f7ff" />
      <circle cx="22" cy="10" r="2" fill="#0b1626" stroke="#22d3ee" strokeWidth="0.8" />
    </svg>
  );
}

export function Impact() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: 0.6 },
      });

      tl.fromTo(".js-im-panel", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT)
        .fromTo(".js-im-veil", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, STUCK_AT)
        .fromTo(".js-im-title", { yPercent: 110 }, { yPercent: 0, duration: 0.06, ease: "power3.out" }, STUCK_AT + 0.01)
        .fromTo(".js-im-fade", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.05, stagger: 0.02 }, STUCK_AT + 0.04);

      // The rocket flies the dotted curve while the bright trail fills in behind it.
      tl.fromTo(".js-im-ghost", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04 }, TRAIL_START - 0.02)
        .fromTo(
          ".js-im-trail",
          { clipPath: "inset(0% 100% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: TRAIL_DURATION },
          TRAIL_START,
        );

      // The curve's viewBox is stretched to the sky box, so the rocket is placed from path coordinates
      // scaled by the box's live size rather than a position measured once at setup.
      const sky = root.current?.querySelector<HTMLElement>(".js-im-sky");
      const path = root.current?.querySelector<SVGPathElement>("#impact-trail");
      const rocket = root.current?.querySelector<HTMLElement>(".js-im-rocket");
      let observer: ResizeObserver | undefined;

      if (!reduced && sky && path && rocket) {
        const length = path.getTotalLength();
        const flight = { p: 0 };
        let sx = 1;
        let sy = 1;

        const place = () => {
          const at = flight.p * length;
          const pt = path.getPointAtLength(at);
          const back = path.getPointAtLength(Math.max(0, at - 1));
          const ahead = path.getPointAtLength(Math.min(length, at + 1));
          gsap.set(rocket, {
            x: pt.x * sx,
            y: pt.y * sy,
            rotation: (Math.atan2((ahead.y - back.y) * sy, (ahead.x - back.x) * sx) * 180) / Math.PI,
          });
        };

        const measure = () => {
          sx = sky.clientWidth / TRAIL_BOX.w;
          sy = sky.clientHeight / TRAIL_BOX.h;
          place();
        };

        gsap.set(rocket, { xPercent: -50, yPercent: -50 });
        measure();
        observer = new ResizeObserver(measure);
        observer.observe(sky);

        tl.fromTo(rocket, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, TRAIL_START).to(
          flight,
          { p: 1, duration: TRAIL_DURATION, onUpdate: place },
          TRAIL_START,
        );
      }

      gsap.utils.toArray<HTMLElement>(".js-im-metric").forEach((el, i) => {
        const metric = METRICS[i];
        const value = el.querySelector<HTMLElement>(".js-im-value");
        const counter = { v: metric.from };
        const at = TRAIL_START + 0.02 + i * 0.07;

        tl.fromTo(el, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.07, ease: "power3.out" }, at);
        if (!reduced) {
          tl.fromTo(
            counter,
            { v: metric.from },
            {
              v: metric.to,
              duration: 0.14,
              ease: "power2.out",
              onUpdate: () => {
                if (value) value.textContent = format(metric, counter.v);
              },
            },
            at + 0.01,
          );
        }
        tl.fromTo(el.querySelector(".js-im-glow"), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.1 }, at + 0.04)
          .fromTo(
            el.querySelector(".js-im-bar"),
            { scaleX: 0 },
            { scaleX: 1, duration: 0.06, ease: "power2.out" },
            at + 0.12,
          )
          .fromTo(el.querySelectorAll(".js-im-copy"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.05, stagger: 0.015 }, at + 0.08);
      });

      tl.to(".js-im-head", { autoAlpha: 0, y: -40, duration: 0.06, ease: "power2.in" }, EXIT_START)
        .to(".js-im-sky", { autoAlpha: 0, y: -30, duration: 0.06, ease: "power2.in" }, EXIT_START + 0.01)
        .to(".js-im-metric", { autoAlpha: 0, y: -24, scale: 0.94, duration: 0.08, stagger: 0.02, ease: "power2.in" }, EXIT_START + 0.02)
        .to(".js-im-veil", { autoAlpha: 0.4, duration: 0.12 }, EXIT_START + 0.04)
        .set({}, {}, 1);

      return () => observer?.disconnect();
    },
    { scope: root },
  );

  return (
    <section
      id="impact"
      ref={root}
      aria-labelledby="impact-title"
      className="pointer-events-none relative -mt-[100svh] h-[380svh]"
    >
      <div className="js-im-panel invisible sticky top-0 h-svh overflow-hidden">
        <div
          aria-hidden
          className="js-im-veil absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgb(8_15_28/0.3)_0%,rgb(6_11_22/0.72)_60%,rgb(5_6_11/0.92)_100%)]"
        />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-5 sm:px-8 lg:px-10">
          <header className="js-im-head flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="js-im-fade font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400/80 sm:text-[11px]">
                Track record · Since 2012
              </p>
              <h2 id="impact-title" className="mt-3 overflow-hidden pb-[0.08em]">
                <span className="js-im-title inline-block text-[clamp(1.9rem,3.6vw,3rem)] font-bold leading-tight tracking-[-0.03em]">
                  Our <span className="italic text-cyan-200">impact</span>
                </span>
              </h2>
            </div>
            <p className="js-im-fade max-w-sm text-sm leading-relaxed text-slate-400 lg:text-right">
              Fourteen years of turning drawings into places people want to live, work and invest in.
            </p>
          </header>

          <div aria-hidden className="js-im-sky relative mt-6 h-[14svh] sm:mt-8 sm:h-[16svh]">
            <svg viewBox={`0 0 ${TRAIL_BOX.w} ${TRAIL_BOX.h}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              <path
                className="js-im-ghost invisible"
                d={TRAIL}
                fill="none"
                stroke="rgb(255 255 255 / 0.14)"
                strokeWidth="1.5"
                strokeDasharray="1 9"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                id="impact-trail"
                className="js-im-trail"
                d={TRAIL}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2.2"
                strokeDasharray="1 9"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ filter: "drop-shadow(0 0 4px rgb(34 211 238 / 0.7))" }}
              />
            </svg>
            <div className="js-im-rocket invisible absolute left-0 top-0 drop-shadow-[0_0_10px_rgb(34_211_238/0.6)]">
              <Rocket />
            </div>
          </div>

          <dl className="grid gap-8 border-t border-white/10 pt-6 sm:grid-cols-3 sm:gap-0 sm:pt-8">
            {METRICS.map((metric, i) => (
              <div
                key={metric.label}
                className={`js-im-metric invisible relative flex flex-col sm:px-6 lg:px-10 ${i > 0 ? "sm:border-l sm:border-white/10" : "sm:pl-0 lg:pl-0"}`}
              >
                <span
                  aria-hidden
                  className="js-im-glow pointer-events-none absolute -left-6 -top-10 size-48 rounded-full bg-[radial-gradient(circle,rgb(34_211_238/0.18),transparent_70%)]"
                />
                <dt className="js-im-copy relative order-2 mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300 sm:text-[11px]">
                  {metric.label}
                </dt>
                <dd className="relative order-1">
                  <span className="js-im-value block text-[clamp(2.8rem,6.4vw,5.6rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums text-white [text-shadow:0_0_40px_rgb(34_211_238/0.35)]">
                    {format(metric, metric.to)}
                  </span>
                  <span aria-hidden className="js-im-bar mt-4 block h-px w-16 origin-left bg-gradient-to-r from-cyan-300 to-transparent" />
                </dd>
                <dd className="js-im-copy relative order-3 mt-2 max-w-xs text-sm leading-relaxed text-slate-400 [@media(max-height:760px)]:hidden">
                  {metric.note}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
