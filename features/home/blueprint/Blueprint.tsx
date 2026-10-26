"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { EnergyLine } from "./EnergyLine";
import { countdown, isHandover, MILESTONES, pad, POINTS } from "./milestones";
import { NodeBadge, NodePopup } from "./NodeParts";
import { blueprintTimeline } from "./timeline";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function Blueprint() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;
      const mm = gsap.matchMedia();
      mm.add({ desktop: "(min-width: 1024px)", mobile: "(max-width: 1023.98px)" }, (ctx) => {
        blueprintTimeline(section, Boolean(ctx.conditions?.desktop));
      });
      return () => mm.revert();
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
          <EnergyLine />

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
                    <span
                      aria-hidden
                      className={`js-bp-ring pointer-events-none absolute inset-0 rounded-full border opacity-0 ${
                        handover ? "border-[#ff8a5c]" : "border-cyan-300"
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
