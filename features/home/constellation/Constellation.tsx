"use client";

import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";
import { ALL_PARTNERS, ORBITS } from "./data";
import { ORBIT_TILT, orbitPath, STAGE_SIZE, VIEW } from "./geometry";
import { OrbitRider } from "./OrbitRider";
import { PartnerMark } from "./PartnerMark";
import { PORTAL_RIM_SIZE, portalExit } from "./portal";
import { startRiders } from "./riders";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function Constellation() {
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const rim = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section || !panel.current || !stage.current || !rim.current) return;
      const reduced = prefersReducedMotion();

      gsap
        .timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: { trigger: section, start: "top 75%", end: "top 5%", scrub: 0.8 },
        })
        .fromTo(".js-cn-head > *", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.1, duration: 0.4 }, 0)
        .fromTo(".js-cn-orbit", { scale: 0.7, autoAlpha: 0, svgOrigin: "500 310" }, { scale: 1, autoAlpha: 1, stagger: 0.12, duration: 0.6 }, 0.1)
        .fromTo(".js-cn-core", { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5 }, 0.2)
        .fromTo(".js-cn-badge", { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, stagger: 0.05, duration: 0.4 }, 0.45);

      // Arrival from the hero: the section tilts up out of the depth.
      if (!reduced) {
        gsap.fromTo(
          section,
          { rotateX: -16, scale: 0.94, transformPerspective: 1400, transformOrigin: "50% 0%" },
          {
            rotateX: 0,
            scale: 1,
            ease: "power2.out",
            scrollTrigger: { trigger: section, start: "top bottom", end: "top 25%", scrub: 0.5 },
          },
        );
      }

      const parts = { section, panel: panel.current, stage: stage.current, rim: rim.current };
      const mm = gsap.matchMedia();
      mm.add("(min-width: 640px)", () => portalExit(parts));
      const stopRiders = startRiders(section, parts.stage, reduced);

      return () => {
        mm.revert();
        stopRiders();
      };
    },
    { scope: root },
  );

  return (
    <section
      id="partners-constellation"
      ref={root}
      data-paused
      aria-labelledby="constellation-title"
      className="group/cn relative z-10 sm:h-[260svh]"
    >
      <div
        ref={panel}
        className="relative overflow-hidden rounded-t-[32px] bg-space py-20 shadow-[0_-30px_80px_-20px_rgb(0_0_0/0.8)] sm:sticky sm:top-0 sm:flex sm:h-svh sm:flex-col sm:items-center sm:justify-center sm:rounded-t-[48px] sm:py-6"
      >
        <div
          aria-hidden
          className="js-cn-glow pointer-events-none absolute left-1/2 top-[55%] size-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(124_58_237/0.22),rgb(76_29_149/0.08)_45%,transparent_70%)]"
        />

        <div className="js-cn-head relative mx-auto max-w-3xl px-6 text-center">
          <h2
            id="constellation-title"
            className="bg-[linear-gradient(180deg,#FFFFFF_0%,#F1F5F9_50%,#94A3B8_100%)] bg-clip-text align-middle font-heading text-[28px] font-extrabold uppercase leading-[32px] tracking-[-0.6px] text-transparent sm:text-[38px]"
          >
            Our constellation of partners
          </h2>
          <p className="mx-auto mt-3 max-w-md align-middle font-sans text-[16px] font-normal leading-[19.5px] tracking-normal text-[#94A3B8] sm:text-[18px]">
            Empowering high-velocity enterprises across dynamic orbits of scale and industry.
          </p>
        </div>

        <div className="mt-10 w-full [perspective:1300px] sm:mt-4">
          <div
            ref={stage}
            style={STAGE_SIZE}
            className="relative mx-auto will-change-transform [transform-style:preserve-3d] [transform:rotateX(var(--cn-tilt,0deg))_scale(var(--cn-zoom,1))]"
          >
            <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} aria-hidden className="absolute inset-0 size-full overflow-visible">
              <g transform={`rotate(${ORBIT_TILT} 500 310)`}>
                {ORBITS.map((orbit, i) => (
                  <g key={i} className="js-cn-orbit">
                    <path
                      d={orbitPath(orbit.w, orbit.h)}
                      fill="none"
                      stroke="#a78bfa"
                      strokeOpacity={orbit.opacity}
                      strokeWidth="1.4"
                      strokeDasharray="6 14"
                      vectorEffect="non-scaling-stroke"
                      className="animate-[orbit-flow_linear_infinite] group-data-[paused]/cn:[animation-play-state:paused]"
                      style={{ animationDuration: `${orbit.dash}s`, animationDirection: orbit.reverse ? "reverse" : "normal" }}
                    />
                  </g>
                ))}
              </g>
            </svg>

            {/* Counter-rotated like the logos, so the core faces the viewer as the disc tilts. */}
            <div className="absolute left-1/2 top-1/2 aspect-square w-[24%] max-w-[15rem] -translate-x-1/2 -translate-y-1/2 [transform:rotateX(calc(var(--cn-tilt,0deg)*-1))]">
              <div className="js-cn-core relative grid size-full place-items-center">
                <span aria-hidden className="absolute inset-0 rounded-full ring-1 ring-violet-300/30" />
                <span aria-hidden className="absolute inset-[8%] animate-breathe rounded-full shadow-[0_0_60px_10px_rgb(168_85_247/0.45),inset_0_0_30px_rgb(168_85_247/0.4)] ring-[3px] ring-violet-500" />
                <span aria-hidden className="absolute inset-[16%] rounded-full bg-[radial-gradient(circle,rgb(76_29_149/0.6),rgb(30_10_60/0.9))] ring-1 ring-violet-300/25" />
                <Image src="/images/contenaissance-logo.webp" width={274} height={133} alt="Contenaissance" className="relative w-[42%] max-w-[6.5rem]" />
              </div>
            </div>

            <ul className="pointer-events-none absolute inset-0 hidden [transform-style:preserve-3d] sm:block">
              {ALL_PARTNERS.map((partner, i) => (
                <OrbitRider key={partner.name} partner={partner} index={i} />
              ))}
            </ul>
          </div>
        </div>

        <ul className="relative mx-auto mt-10 grid max-w-md grid-cols-2 gap-4 px-6 sm:hidden">
          {ALL_PARTNERS.map((partner) => (
            <li key={partner.name} className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.03] p-4 text-center ring-1 ring-white/[0.06]">
              <PartnerMark partner={partner} />
              {partner.description && <span className="font-sans text-xs leading-snug text-slate-400">{partner.description}</span>}
            </li>
          ))}
        </ul>

        {/* Glowing edge of the portal; `portal.ts` centres it on the core and scales it with the hole. */}
        <div
          ref={rim}
          aria-hidden
          className="pointer-events-none invisible absolute z-20 will-change-transform"
          style={{ width: PORTAL_RIM_SIZE, height: PORTAL_RIM_SIZE }}
        >
          <svg viewBox="0 0 200 200" className="size-full overflow-visible">
            <circle cx="100" cy="100" r="100" fill="none" stroke="#a855f7" strokeOpacity="0.35" strokeWidth="18" vectorEffect="non-scaling-stroke" />
            <circle cx="100" cy="100" r="100" fill="none" stroke="#e9d5ff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      </div>
    </section>
  );
}
