"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SectionHeading } from "@/features/home/components/SectionHeading";
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
};

const METRICS: Metric[] = [
  { from: 0, to: 250, decimals: 0, grouping: true, suffix: "+", label: "Projects created" },
  { from: 0, to: 40, decimals: 0, grouping: true, suffix: "+", label: "Creative partners" },
  { from: 0, to: 98, decimals: 0, grouping: true, suffix: "%", label: "Brand recall lift" },
  { from: 0, to: 15, decimals: 0, grouping: true, suffix: "+", label: "Global industries" },
];

/** Progress where the sticky panel locks: the trigger starts when the section enters (100svh of its 380svh). */
const STUCK_AT = 100 / 380;
/** The exit (about 62svh long) ends exactly when the reviews panel appears, so no blank scroll is left between them. */
const EXIT_START = 318 / 380;
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
      <path d="M8 6.5 4.5 2h4.5l4 4.5zM8 13.5 4.5 18h4.5l4-4.5z" fill="#a8841a" />
      <path d="M7 10c3-4.2 9-5.6 17-4.5 2.6 1 4.6 2.6 6 4.5-1.4 1.9-3.4 3.5-6 4.5-8 1.1-14-.3-17-4.5z" fill="#fff6dc" />
      <circle cx="22" cy="10" r="2" fill="#0b1626" stroke="#DAAF25" strokeWidth="0.8" />
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
        .fromTo(".js-im-veil", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, STUCK_AT);

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
        const at = TRAIL_START + 0.02 + i * 0.05;

        tl.fromTo(el, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.07, ease: "power3.out" }, at);
        const rules = el.querySelectorAll(".js-im-rule");
        if (rules.length) tl.fromTo(rules, { scaleY: 0 }, { scaleY: 1, duration: 0.06, ease: "power2.out" }, at + 0.02);
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
        tl.fromTo(el.querySelector(".js-im-copy"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.05 }, at + 0.06);
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
          <SectionHeading
            id="impact-title"
            title="Our impact"
            subtitle="Fourteen years of turning ideas into films, campaigns and brands that people remember."
            start="top top"
            className="js-im-head"
          />

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
                stroke="#DAAF25"
                strokeWidth="2.2"
                strokeDasharray="1 9"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ filter: "drop-shadow(0 0 4px rgb(218 175 37 / 0.7))" }}
              />
            </svg>
            <div className="js-im-rocket invisible absolute left-0 top-0 drop-shadow-[0_0_10px_rgb(218_175_37/0.6)]">
              <Rocket />
            </div>
          </div>

          <dl className="mx-auto mt-6 grid w-full max-w-[880px] grid-cols-2 gap-y-8 sm:mt-10 sm:grid-cols-4">
            {METRICS.map((metric, i) => (
              <div key={metric.label} className="js-im-metric invisible relative flex flex-col pl-5 sm:pl-[18px]">
                {i % 2 === 1 && <span aria-hidden className="js-im-rule absolute inset-y-0 left-0 w-px origin-top bg-white/20" />}
                {i === 2 && <span aria-hidden className="js-im-rule absolute inset-y-0 left-0 hidden w-px origin-top bg-white/20 sm:block" />}
                <dt className="js-im-copy order-2 mt-2.5 font-sans text-[10px] uppercase tracking-[0.12em] text-white/85 sm:text-[11px]">{metric.label}</dt>
                <dd className="order-1">
                  <span className="js-im-value block font-heading text-[32px] font-bold leading-none tracking-[-0.02em] tabular-nums text-white sm:text-[40px]">
                    {format(metric, metric.to)}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
