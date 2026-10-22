"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { canHover, prefersReducedMotion } from "@/lib/media";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Progress where the sticky panel locks: the trigger starts when the section enters (100svh of its 420svh). */
const STUCK_AT = 100 / 420;
/** Progress where the Impact section starts entering below. */
const EXIT_START = 320 / 420;
const DRIFT = [-14, -30, -20];

/** Preview animations idle until the card is hovered or focused; touch screens just run them. */
const RUN_ON_HOVER =
  "[animation-play-state:paused] group-hover:[animation-play-state:running] group-focus-within:[animation-play-state:running] [@media(hover:none)]:[animation-play-state:running]";


function Box({ w, h, d, x = 0, z = 0 }: { w: number; h: number; d: number; x?: number; z?: number }) {
  const face = "absolute left-1/2 top-1/2 border border-cyan-300/55 bg-cyan-300/[0.05]";
  const faces: CSSProperties[] = [
    { width: `${w}cqw`, height: `${h}cqw`, transform: `translate(-50%,-50%) translateZ(${d / 2}cqw)` },
    { width: `${w}cqw`, height: `${h}cqw`, transform: `translate(-50%,-50%) rotateY(180deg) translateZ(${d / 2}cqw)` },
    { width: `${d}cqw`, height: `${h}cqw`, transform: `translate(-50%,-50%) rotateY(90deg) translateZ(${w / 2}cqw)` },
    { width: `${d}cqw`, height: `${h}cqw`, transform: `translate(-50%,-50%) rotateY(-90deg) translateZ(${w / 2}cqw)` },
    { width: `${w}cqw`, height: `${d}cqw`, transform: `translate(-50%,-50%) rotateX(90deg) translateZ(${h / 2}cqw)` },
  ];
  return (
    <div
      className="absolute left-0 top-0 [transform-style:preserve-3d]"
      style={{ transform: `translate3d(${x}cqw, ${-h / 2}cqw, ${z}cqw)` }}
    >
      {faces.map((style, i) => (
        <div key={i} className={face} style={style} />
      ))}
    </div>
  );
}

function TourPreview() {
  return (
    <div className="@container absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_70%,#0d2a3d_0%,#07101c_70%)]">
      <div className="absolute inset-0 transition-transform duration-700 ease-out [perspective:700px] group-hover:scale-110">
        <div className="absolute -inset-x-1/4 bottom-[-30%] h-[80%] bg-[linear-gradient(rgb(34_211_238/0.16)_1px,transparent_1px),linear-gradient(90deg,rgb(34_211_238/0.16)_1px,transparent_1px)] bg-[size:26px_26px] [mask-image:linear-gradient(to_top,black,transparent)] [transform:rotateX(70deg)]" />
        <div className={`absolute left-1/2 top-[58%] [transform-style:preserve-3d] animate-spin-y ${RUN_ON_HOVER}`}>
          <Box w={26} h={18} d={22} x={-4} />
          <Box w={14} h={30} d={14} x={10} z={-4} />
          <Box w={12} h={8} d={12} x={-14} z={10} />
        </div>
      </div>
      <span aria-hidden className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute inset-x-0 top-1/2 h-px bg-cyan-200/50" />
        <span className="absolute inset-y-0 left-1/2 w-px bg-cyan-200/50" />
      </span>
      <span className="absolute left-3 top-3 font-mono text-[9px] tracking-[0.14em] text-cyan-200/70">POS 12.4 · 3.1 · 0.0</span>
      <span className="absolute bottom-3 left-3 font-mono text-[9px] tracking-[0.14em] text-slate-400">DRAG TO ORBIT · WASD</span>
      <span className="absolute bottom-3 right-3 font-mono text-[9px] tracking-[0.14em] text-cyan-300">60 FPS</span>
    </div>
  );
}

function SolarPreview() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#0c2236] via-[#0a1828] to-[#07101c]">
      <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
        <svg aria-hidden viewBox="0 0 400 300" className="absolute inset-0 size-full">
          <path
            d="M 5.3 167.3 A 210 210 0 0 1 394.7 167.3"
            fill="none"
            stroke="rgb(251 191 36 / 0.45)"
            strokeWidth="1.2"
            strokeDasharray="3 5"
          />
          <line x1="0" y1="246" x2="400" y2="246" stroke="rgb(34 211 238 / 0.35)" strokeWidth="1" />
          {[60, 110, 160, 240, 290, 340].map((x) => (
            <line key={x} x1={x} y1="246" x2={x} y2="252" stroke="rgb(34 211 238 / 0.3)" strokeWidth="1" />
          ))}
        </svg>
        <div className={`absolute left-1/2 top-[12%] h-[70%] w-0 origin-bottom animate-sun-arc ${RUN_ON_HOVER}`}>
          <span className="absolute -left-2.5 -top-2.5 size-5 rounded-full bg-amber-300 shadow-[0_0_24px_6px_rgb(252_211_77/0.55)]" />
        </div>
        <div
          className={`absolute left-1/2 top-[82%] h-[11%] w-[34%] bg-gradient-to-r from-[#020409]/80 to-transparent animate-shadow-sweep ${RUN_ON_HOVER}`}
        />
        <div className="absolute bottom-[18%] left-1/2 h-[30%] w-[12%] -translate-x-1/2 border border-cyan-300/60 bg-[#0b1a2a] bg-[linear-gradient(rgb(34_211_238/0.18)_1px,transparent_1px)] bg-[size:100%_18%]" />
      </div>
      <span className="absolute left-3 top-3 font-mono text-[9px] tracking-[0.14em] text-amber-200/80">SUN PATH · JUN 21</span>
      <span className="absolute bottom-3 left-3 font-mono text-[9px] tracking-[0.14em] text-slate-400">06:12 — 18:47</span>
      <span className="absolute bottom-3 right-3 font-mono text-[9px] tracking-[0.14em] text-cyan-300">SHADOW STUDY</span>
    </div>
  );
}

const PLOTS: [number, number, number, number, boolean][] = [
  [30, 30, 90, 60, true],
  [140, 24, 60, 70, false],
  [220, 30, 70, 50, true],
  [310, 26, 64, 80, true],
  [30, 130, 70, 90, false],
  [120, 140, 80, 50, true],
  [220, 128, 50, 60, true],
  [290, 150, 84, 60, false],
  [120, 210, 60, 60, true],
  [220, 214, 90, 56, true],
];

function DronePreview() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#06101b]">
      <div className="absolute -inset-[6%] transition-transform duration-[1200ms] ease-out group-hover:scale-[1.18]">
        <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
          <path d="M0 110 H400 M0 196 H400 M106 0 V300 M208 0 V300 M300 110 V300" stroke="rgb(148 163 184 / 0.18)" strokeWidth="9" />
          <path d="M0 110 H400 M0 196 H400 M106 0 V300 M208 0 V300 M300 110 V300" stroke="rgb(148 163 184 / 0.3)" strokeWidth="0.6" strokeDasharray="6 6" />
          {PLOTS.map(([x, y, w, h, built]) => (
            <g key={`${x}-${y}`}>
              <rect x={x} y={y} width={w} height={h} fill="none" stroke="rgb(34 211 238 / 0.35)" strokeWidth="0.8" />
              {built && (
                <rect x={x + 8} y={y + 8} width={w - 16} height={h - 16} fill="rgb(34 211 238 / 0.1)" stroke="rgb(34 211 238 / 0.55)" strokeWidth="0.8" />
              )}
            </g>
          ))}
          {[
            [60, 240],
            [80, 258],
            [180, 92],
            [350, 230],
            [270, 92],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" fill="rgb(16 185 129 / 0.25)" stroke="rgb(16 185 129 / 0.5)" strokeWidth="0.6" />
          ))}
        </svg>
      </div>
      <div className={`absolute inset-x-0 top-0 h-[10%] bg-gradient-to-b from-transparent via-cyan-300/25 to-transparent animate-scan-y ${RUN_ON_HOVER}`} />
      <div className={`absolute left-[24%] top-[18%] aspect-square w-[20%] animate-drone ${RUN_ON_HOVER}`}>
        {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((pos) => (
          <span key={pos} className={`absolute size-3 border-cyan-200 ${pos}`} />
        ))}
        <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200" />
      </div>
      <span className="absolute left-3 top-3 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] text-slate-300">
        <span className="size-1.5 animate-pulse rounded-full bg-[#ff6b3d]" />
        REC · ALT 120 M
      </span>
      <span className="absolute bottom-3 left-3 font-mono text-[9px] tracking-[0.14em] text-slate-400">GSD 2.1 CM / PX</span>
      <span className="absolute bottom-3 right-3 font-mono text-[9px] tracking-[0.14em] text-cyan-300">SCANNING</span>
    </div>
  );
}

type Experience = { file: string; title: string; body: string; tags: string[]; preview: ReactNode };

const EXPERIENCES: Experience[] = [
  {
    file: "realtime-tour — villa_04.glb",
    title: "3D Realtime Tour",
    body: "Walk buyers through unbuilt spaces in the browser, at full frame rate, on any device.",
    tags: ["WebGL", "Walkthrough", "VR ready"],
    preview: <TourPreview />,
  },
  {
    file: "solar-path — site_12.sim",
    title: "Solar Path Analysis",
    body: "Sun and shadow studies for every hour of the year, so light shapes the design early.",
    tags: ["Daylight", "Shadows", "Energy"],
    preview: <SolarPreview />,
  },
  {
    file: "drone-scan — plot_07.map",
    title: "Drone Perspective Scan",
    body: "Survey-grade aerial capture stitched into a live site model your team can measure.",
    tags: ["Photogrammetry", "Survey", "Site model"],
    preview: <DronePreview />,
  },
];

const DOTS = [
  "group-hover:bg-[#ff5f57] [transition-delay:0ms]",
  "group-hover:bg-[#febc2e] [transition-delay:70ms]",
  "group-hover:bg-[#28c840] [transition-delay:140ms]",
];

function ExperienceCard({ item, index }: { item: Experience; index: number }) {
  const tilt = useRef<HTMLDivElement>(null);
  const tiltTo = useRef<((x: number, y: number) => void) | null>(null);

  useEffect(() => {
    const el = tilt.current;
    if (!el) return;
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3" });
    tiltTo.current = (x, y) => {
      rx(x);
      ry(y);
    };
    return () => {
      tiltTo.current = null;
      gsap.killTweensOf(el);
    };
  }, []);

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (!canHover() || prefersReducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    tiltTo.current?.(-((e.clientY - r.top) / r.height - 0.5) * 6, ((e.clientX - r.left) / r.width - 0.5) * 8);
  };

  return (
    <article
      tabIndex={0}
      aria-label={item.title}
      onPointerMove={onMove}
      onPointerLeave={() => tiltTo.current?.(0, 0)}
      className="js-sp-card group relative w-[82%] shrink-0 snap-center rounded-2xl outline-none [perspective:1200px] sm:w-[60%] md:w-auto"
    >
      <div ref={tilt} className="relative rounded-2xl [transform-style:preserve-3d]">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1322]/90 transition-[border-color,box-shadow] duration-500 group-hover:border-cyan-400/40 group-hover:shadow-[0_0_60px_-14px_rgb(34_211_238/0.55)] group-focus-visible:border-cyan-400/60">
          <div className="flex h-10 items-center gap-3 border-b border-white/[0.06] px-4">
            <span className="flex gap-1.5">
              {DOTS.map((color, i) => (
                <span
                  key={i}
                  className={`js-sp-dot size-2.5 rounded-full bg-slate-600/70 transition-[background-color,scale] duration-300 group-hover:scale-110 ${color}`}
                />
              ))}
            </span>
            <span className="truncate font-mono text-[10px] tracking-[0.08em] text-slate-500 transition-colors duration-300 group-hover:text-slate-300">
              {item.file}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500 transition-colors group-hover:text-cyan-300">
              <span className="size-1.5 rounded-full bg-cyan-400/40 transition-colors group-hover:animate-pulse group-hover:bg-cyan-400" />
              Live
            </span>
          </div>

          <div className="js-sp-preview relative aspect-[4/3] overflow-hidden">{item.preview}</div>

          <div className="js-sp-body border-t border-white/[0.06] px-5 pb-5 pt-4">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-slate-500">
              <span className="text-cyan-400">{String(index + 1).padStart(2, "0")}</span>
              <span className="uppercase">
                <span className="group-hover:hidden">Hover to interact</span>
                <span className="hidden text-cyan-300 group-hover:inline">Interacting</span>
              </span>
            </div>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400 [@media(max-height:780px)]:hidden">{item.body}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-400 transition-colors duration-500 group-hover:border-cyan-400/30 group-hover:text-cyan-200"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      </div>
    </article>
  );
}

export function Spaces() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: 0.6 },
      });

      tl.fromTo(".js-sp-panel", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT)
        .fromTo(".js-sp-veil", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, STUCK_AT)
        .fromTo(".js-sp-title", { yPercent: 110 }, { yPercent: 0, duration: 0.06, stagger: 0.025, ease: "power3.out" }, STUCK_AT + 0.01)
        .fromTo(".js-sp-fade", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.05, stagger: 0.02 }, STUCK_AT + 0.05);

      gsap.utils.toArray<HTMLElement>(".js-sp-card").forEach((card, i) => {
        const at = STUCK_AT + 0.06 + i * 0.035;
        tl.fromTo(
          card,
          { autoAlpha: 0, y: 90, rotateX: 16, z: -140 },
          { autoAlpha: 1, y: 0, rotateX: 0, z: 0, duration: 0.09, ease: "power3.out" },
          at,
        )
          .fromTo(
            card.querySelectorAll(".js-sp-dot"),
            { scale: 0 },
            { scale: 1, duration: 0.025, stagger: 0.008, ease: "back.out(3)" },
            at + 0.04,
          )
          .fromTo(
            card.querySelector(".js-sp-preview"),
            { clipPath: "inset(0% 0% 100% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 0.07, ease: "power2.out" },
            at + 0.03,
          )
          .fromTo(card.querySelector(".js-sp-body"), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.05 }, at + 0.06)
          .to(card, { y: DRIFT[i], duration: EXIT_START - (STUCK_AT + 0.3) }, STUCK_AT + 0.3);
      });

      tl.to(".js-sp-head", { autoAlpha: 0, y: -40, duration: 0.06, ease: "power2.in" }, EXIT_START)
        .to(
          ".js-sp-card",
          { autoAlpha: 0, y: "+=80", rotateX: -12, z: -160, duration: 0.1, stagger: 0.025, ease: "power2.in" },
          EXIT_START + 0.02,
        )
        .to(".js-sp-veil", { autoAlpha: 0.4, duration: 0.12 }, EXIT_START + 0.04)
        .set({}, {}, 1);
    },
    { scope: root },
  );

  return (
    <section
      id="spaces"
      ref={root}
      aria-labelledby="spaces-title"
      className="pointer-events-none relative -mt-[100svh] h-[420svh]"
    >
      <div className="js-sp-panel invisible sticky top-0 h-svh overflow-hidden">
        <div
          aria-hidden
          className="js-sp-veil absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgb(8_15_28/0.35)_0%,rgb(6_11_22/0.78)_60%,rgb(5_6_11/0.94)_100%)]"
        />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-5 sm:px-8 lg:px-10">
          <header className="js-sp-head flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="js-sp-fade font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400/80 sm:text-[11px]">
                Experiences · 03 tools
              </p>
              <h2 id="spaces-title" className="mt-3 text-[clamp(1.9rem,3.6vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em]">
                <span className="block overflow-hidden pb-[0.06em]">
                  <span className="js-sp-title inline-block">
                    Spaces that <span className="italic text-cyan-200">inspire</span>
                  </span>
                </span>
              </h2>
            </div>
            <p className="js-sp-fade max-w-sm text-sm leading-relaxed text-slate-400 lg:text-right">
              Interactive tools that let clients feel a building long before it exists.
            </p>
          </header>

          <div className="pointer-events-auto -mx-5 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 lg:mt-10">
            {EXPERIENCES.map((item, i) => (
              <ExperienceCard key={item.title} item={item} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
