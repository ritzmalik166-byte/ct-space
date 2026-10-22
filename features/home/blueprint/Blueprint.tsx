"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { FLOW_STOPS } from "@/features/home/lib/store";
import { flowNodeScreen } from "@/features/home/scene/journeyPath";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Milestone = { title: string; body: string; when: string; details: string; outputs: string[] };

const MILESTONES: Milestone[] = [
  {
    title: "Brief & Target",
    body: "Goals, users and success metrics, agreed up front.",
    when: "Week 1",
    details: "Workshops with your team to pin down the problem, the users and the numbers that define success.",
    outputs: ["Goals", "KPIs", "Scope"],
  },
  {
    title: "Design Schema",
    body: "Architecture, data flows and clickable prototypes.",
    when: "Week 2",
    details: "System architecture, data flows and clickable prototypes, signed off before production code.",
    outputs: ["Architecture", "UX flows", "Data model"],
  },
  {
    title: "Engineering",
    body: "Weekly releases of models, APIs and front end.",
    when: "Weeks 3–6",
    details: "Parallel sprints across models, APIs and front end, with a release you can click every Friday.",
    outputs: ["Sprints", "CI/CD", "Evals"],
  },
  {
    title: "Refinement",
    body: "Tuning, load testing and polish from real feedback.",
    when: "Weeks 7–8",
    details: "Load tests, model tuning and interface polish driven by feedback from real users.",
    outputs: ["QA", "Performance", "Feedback"],
  },
  {
    title: "Handover",
    body: "Code, docs, training and 30 days of support.",
    when: "Week 9+",
    details: "Your code, documentation and team training, plus a 30-day support window after launch.",
    outputs: ["Docs", "Training", "Support"],
  },
];

/** Progress where the sticky panel locks: the trigger starts when the section enters (100svh of its 640svh). */
const STUCK_AT = 100 / 640;
/** The next section starts entering here; the energy line carries on past Handover and the camera follows. */
const EXIT_START = 540 / 640;
const LAST = MILESTONES.length - 1;
const POINTS = MILESTONES.map((_, i) => flowNodeScreen(i));
const EXIT_POINT = { left: 118, top: POINTS[LAST].top - 14 };
const CYAN = "#22d3ee";
const ORANGE = "#ff6b3d";

const isHandover = (i: number) => i === LAST;
const countdown = (i: number) => `T-${LAST - i}`;
const pad = (i: number) => String(i + 1).padStart(2, "0");

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 15c-1.6-1.6-2.6-3.6-2.4-6.4C9.9 5.4 12 3 15.5 2.5 16 6 13.6 8.1 15.4 8.4c-2.8.2-4.8-.8-6.4-2.4" />
      <path d="M14.5 2.5C18.5 2 21.5 5 21 9c-.4 3.3-3 5.4-6.4 6l-2.6-2.6c.6-3.4 2.7-6 6-6.4" strokeLinejoin="round" />
      <path d="M9.4 14.6 6 18M7.5 11.5 5 11l3-3h3M12.5 16.5l.5 2.5 3-3v-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NodeBadge({ index }: { index: number }) {
  if (isHandover(index)) {
    return (
      <span className="relative grid size-9 place-items-center rounded-full bg-[#ff6b3d] text-white shadow-[0_0_40px_-4px_rgb(255_107_61/0.8)] lg:size-12">
        <RocketIcon className="size-4 lg:size-5" />
      </span>
    );
  }
  return (
    <span className="relative grid size-7 place-items-center rounded-full border-[1.5px] border-cyan-400 bg-[#05060b] text-[10px] font-medium text-cyan-200 lg:size-9 lg:text-[11px]">
      {pad(index)}
    </span>
  );
}

/** Popups open towards the centre of the screen so outer nodes don't push them off the edge on phones. */
const POPUP_ALIGN = {
  start: { box: "left-1/2 -translate-x-7 origin-bottom-left", arrow: "left-7 -translate-x-1/2" },
  center: { box: "left-1/2 -translate-x-1/2 origin-bottom", arrow: "left-1/2 -translate-x-1/2" },
  end: { box: "right-1/2 translate-x-7 origin-bottom-right", arrow: "right-7 translate-x-1/2" },
};

function popupAlign(index: number) {
  if (index * 2 < LAST) return POPUP_ALIGN.start;
  if (index * 2 > LAST) return POPUP_ALIGN.end;
  return POPUP_ALIGN.center;
}

function NodePopup({ item, index }: { item: Milestone; index: number }) {
  const handover = isHandover(index);
  const align = popupAlign(index);
  return (
    <div
      role="tooltip"
      id={`bp-tip-${index}`}
      className={`pointer-events-none absolute bottom-full mb-5 w-[min(15rem,calc(100vw-2.5rem))] ${align.box} translate-y-2 scale-90 opacity-0 transition-[opacity,translate,scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/node:translate-y-0 group-hover/node:scale-100 group-hover/node:opacity-100 group-focus-within/node:translate-y-0 group-focus-within/node:scale-100 group-focus-within/node:opacity-100`}
    >
      <div
        className={`relative rounded-2xl border bg-[#0b1626]/95 p-4 text-left ${
          handover
            ? "border-[#ff6b3d]/35 shadow-[0_18px_50px_-18px_rgb(255_107_61/0.6)]"
            : "border-cyan-400/25 shadow-[0_18px_50px_-18px_rgb(34_211_238/0.55)]"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] ${
              handover ? "bg-[#ff6b3d]/15 text-[#ffa27f]" : "bg-cyan-400/10 text-cyan-300"
            }`}
          >
            <span className={`size-1.5 rounded-full ${handover ? "bg-[#ff6b3d]" : "bg-cyan-400"}`} />
            {item.when}
          </span>
          <span className="font-mono text-[10px] tracking-[0.16em] text-slate-500">
            {pad(index)} / {pad(LAST)}
          </span>
        </div>
        <p className="mt-3 text-[15px] font-semibold tracking-tight">{item.title}</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">{item.details}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {item.outputs.map((o) => (
            <li key={o} className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-300">
              {o}
            </li>
          ))}
        </ul>
        <span
          aria-hidden
          className={`absolute -bottom-[7px] ${align.arrow} size-3 rotate-45 border-b border-r bg-[#0b1626] ${
            handover ? "border-[#ff6b3d]/35" : "border-cyan-400/25"
          }`}
        />
      </div>
    </div>
  );
}

export function Blueprint() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add({ desktop: "(min-width: 1024px)", mobile: "(max-width: 1023.98px)" }, (ctx) => {
        const desktop = Boolean(ctx.conditions?.desktop);
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: 0.6 },
        });

        tl.fromTo(".js-bp-panel", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT)
          .fromTo(".js-bp-veil", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, STUCK_AT)
          .fromTo(".js-bp-title", { yPercent: 110 }, { yPercent: 0, duration: 0.06, ease: "power3.out" }, STUCK_AT + 0.01)
          .fromTo(".js-bp-fade", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.05 }, STUCK_AT + 0.04)
          .fromTo(".js-bp-ghost", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, STUCK_AT + 0.06);

        const nodes = gsap.utils.toArray<HTMLElement>(".js-bp-node");
        const texts = gsap.utils.toArray<HTMLElement>(".js-bp-text");
        const cards = gsap.utils.toArray<HTMLElement>(".js-bp-card");

        // The energy pulse rides each segment as it draws, then merges into the Handover node.
        tl.fromTo(".js-bp-pulse", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, FLOW_STOPS[0])
          .to(".js-bp-pulse", { autoAlpha: 0, duration: 0.015 }, FLOW_STOPS[LAST] - 0.01)
          .fromTo(".js-bp-pulse-dot", { backgroundColor: CYAN }, { backgroundColor: ORANGE, duration: 0.08 }, FLOW_STOPS[LAST - 1]);

        FLOW_STOPS.forEach((stop, i) => {
          const next = FLOW_STOPS[i + 1];
          const node = nodes[i];
          const glow = node.querySelector(".js-bp-glow");

          tl.fromTo(
            node.querySelector(".js-bp-badge"),
            { autoAlpha: 0, scale: 0.3 },
            { autoAlpha: 1, scale: 1, duration: 0.03, ease: "back.out(2.4)" },
            stop - 0.015,
          ).fromTo(glow, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.025 }, stop);

          if (next !== undefined) {
            const a = POINTS[i];
            const b = POINTS[i + 1];
            tl.to(glow, { autoAlpha: 0, duration: 0.02 }, next - 0.01)
              .fromTo(
                `.js-bp-seg-${i}`,
                { attr: { x2: a.left, y2: a.top } },
                { attr: { x2: b.left, y2: b.top }, duration: next - stop, ease: "power1.inOut" },
                stop,
              )
              .fromTo(
                ".js-bp-pulse",
                { xPercent: a.left, yPercent: a.top },
                { xPercent: b.left, yPercent: b.top, duration: next - stop, ease: "power1.inOut", immediateRender: i === 0 },
                stop,
              );
          }

          if (desktop) {
            tl.fromTo(
              texts[i].children,
              { autoAlpha: 0, y: 14 },
              { autoAlpha: 1, y: 0, duration: 0.03, stagger: 0.01, ease: "power2.out" },
              stop - 0.005,
            );
          } else {
            tl.fromTo(cards[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.03, ease: "power3.out" }, stop - 0.01);
            if (next !== undefined) tl.to(cards[i], { autoAlpha: 0, y: -20, duration: 0.025 }, next - 0.03);
          }
        });

        const handover = POINTS[LAST];
        tl.to(".js-bp-head", { y: -50, autoAlpha: 0, duration: 0.04, ease: "power2.in" }, EXIT_START)
          .to(cards[LAST], { autoAlpha: 0, y: -20, duration: 0.03 }, EXIT_START)
          .fromTo(
            ".js-bp-ext",
            { attr: { x2: handover.left, y2: handover.top } },
            { attr: { x2: EXIT_POINT.left, y2: EXIT_POINT.top }, duration: 0.09, ease: "power2.in" },
            EXIT_START + 0.01,
          )
          .to(".js-bp-pulse", { autoAlpha: 1, duration: 0.005 }, EXIT_START + 0.01)
          .fromTo(
            ".js-bp-pulse",
            { xPercent: handover.left, yPercent: handover.top },
            {
              xPercent: EXIT_POINT.left,
              yPercent: EXIT_POINT.top,
              duration: 0.09,
              ease: "power2.in",
              immediateRender: false,
            },
            EXIT_START + 0.01,
          )
          .to(
            ".js-bp-stage",
            { xPercent: -28, yPercent: 8, scale: 1.35, autoAlpha: 0, duration: 0.12, ease: "power2.in" },
            EXIT_START + 0.03,
          )
          .to(".js-bp-veil", { autoAlpha: 0, duration: 0.1 }, EXIT_START + 0.05)
          .set({}, {}, 1);
      });
    },
    { scope: root },
  );

  return (
    <section
      id="blueprint"
      ref={root}
      aria-labelledby="blueprint-title"
      className="pointer-events-none relative -mt-[100svh] h-[640svh]"
    >
      <div className="js-bp-panel invisible sticky top-0 h-svh overflow-hidden">
        <div aria-hidden className="js-bp-veil absolute inset-0 bg-[#05060b]/55">
          <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[#05060b]/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#05060b]/80 to-transparent" />
        </div>

        <header className="js-bp-head relative mx-auto max-w-7xl px-5 pt-[14svh] sm:px-8 lg:px-10 lg:pt-[16svh]">
          <p className="js-bp-fade font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400/80 sm:text-[11px]">
            Process · 05 milestones
          </p>
          <h2 id="blueprint-title" className="mt-3 overflow-hidden pb-[0.08em]">
            <span className="js-bp-title inline-block text-[clamp(1.9rem,3.6vw,3rem)] font-bold leading-tight tracking-[-0.03em]">
              From blueprint to <span className="italic text-cyan-200">handover</span>
            </span>
          </h2>
        </header>

        <div className="js-bp-stage absolute inset-0 origin-[83%_40%]">
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient
              id="bp-handover-line"
              gradientUnits="userSpaceOnUse"
              x1={POINTS[LAST - 1].left}
              y1={POINTS[LAST - 1].top}
              x2={POINTS[LAST].left}
              y2={POINTS[LAST].top}
            >
              <stop offset="0" stopColor={CYAN} />
              <stop offset="1" stopColor={ORANGE} />
            </linearGradient>
          </defs>
          <polyline
            className="js-bp-ghost invisible"
            points={POINTS.map((p) => `${p.left},${p.top}`).join(" ")}
            fill="none"
            stroke="rgb(255 255 255 / 0.1)"
            strokeWidth="1"
            strokeDasharray="4 6"
            vectorEffect="non-scaling-stroke"
          />
          {POINTS.slice(0, LAST).map((p, i) => {
            const stroke = i === LAST - 1 ? "url(#bp-handover-line)" : CYAN;
            return (
              <g key={i}>
                <line
                  className={`js-bp-seg-${i}`}
                  x1={p.left}
                  y1={p.top}
                  x2={p.left}
                  y2={p.top}
                  stroke={stroke}
                  strokeOpacity="0.18"
                  strokeWidth="7"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  className={`js-bp-seg-${i}`}
                  x1={p.left}
                  y1={p.top}
                  x2={p.left}
                  y2={p.top}
                  stroke={stroke}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
          {[7, 1.6].map((width) => (
            <line
              key={width}
              className="js-bp-ext"
              x1={POINTS[LAST].left}
              y1={POINTS[LAST].top}
              x2={POINTS[LAST].left}
              y2={POINTS[LAST].top}
              stroke={ORANGE}
              strokeOpacity={width > 2 ? 0.18 : 1}
              strokeWidth={width}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <div aria-hidden className="js-bp-pulse invisible absolute inset-0">
          <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
            <span className="absolute -inset-3 rounded-full bg-cyan-300/20" />
            <span className="js-bp-pulse-dot block size-2.5 rounded-full bg-cyan-400 shadow-[0_0_14px_3px_rgb(165_243_252/0.8)]" />
          </span>
        </div>

        <ol aria-label="Project milestones">
          {MILESTONES.map((item, i) => {
            const { left, top } = POINTS[i];
            const handover = isHandover(i);
            return (
              <li
                key={item.title}
                className="js-bp-node absolute hover:z-20 focus-within:z-20"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <div className="group/node pointer-events-auto absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
                  <span
                    aria-hidden
                    className={`js-bp-glow invisible absolute -inset-2.5 rounded-full border ${
                      handover
                        ? "border-[#ff6b3d]/50 shadow-[0_0_30px_rgb(255_107_61/0.5)]"
                        : "border-cyan-400/40 shadow-[0_0_30px_rgb(34_211_238/0.45)]"
                    }`}
                  />
                  <button
                    type="button"
                    aria-label={`${item.title}, ${item.when}`}
                    aria-describedby={`bp-tip-${i}`}
                    className="js-bp-badge invisible block cursor-pointer rounded-full transition-[scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 focus-visible:scale-110 focus-visible:outline-none"
                  >
                    <NodeBadge index={i} />
                  </button>
                  <NodePopup item={item} index={i} />
                </div>

                <div
                  className={`js-bp-text absolute top-0 hidden w-[min(12.5rem,15vw)] lg:block ${
                    handover ? "-left-6 mt-10" : "-left-[1.125rem] mt-8"
                  }`}
                >
                  <p className={`invisible font-mono text-[10px] tracking-[0.18em] ${handover ? "text-[#ff8a5c]" : "text-cyan-400"}`}>
                    {countdown(i)}
                  </p>
                  <h3 className="invisible mt-1.5 text-base font-semibold tracking-tight xl:text-[17px]">{item.title}</h3>
                  <p className="invisible mt-1.5 text-[13px] leading-relaxed text-slate-400">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
        </div>

        <div className="absolute inset-x-0 top-[68%] mx-auto grid max-w-sm px-5 lg:hidden">
          {MILESTONES.map((item, i) => (
            <div key={item.title} className="js-bp-card invisible [grid-area:1/1]">
              <p className={`font-mono text-[10px] tracking-[0.18em] ${isHandover(i) ? "text-[#ff8a5c]" : "text-cyan-400"}`}>
                {pad(i)} • {countdown(i)}
              </p>
              <h3 className="mt-1.5 text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
