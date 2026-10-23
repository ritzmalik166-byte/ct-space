"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Partner = {
  name: string;
  /** Wordmark shown when there is no logo, or while the logo file is missing. */
  mark: string;
  logo?: { src: string; width: number; height: number };
  description?: string;
  tone: string;
};

const CDN = "https://contenaissance.blob.core.windows.net/ct-assets";

const AI_TOOLS: Partner[] = [
  {
    name: "Pika",
    mark: "Pika",
    logo: { src: `${CDN}/pika.png`, width: 164, height: 57 },
    description: "AI-powered video generation platform that creates stunning videos from text and images.",
    tone: "#f8f9fa",
  },
  {
    name: "Claude",
    mark: "Claude",
    logo: { src: "/assets/claude.png", width: 160, height: 56 },
    description: "Anthropic's AI assistant focused on being helpful, harmless, and honest.",
    tone: "#d97757",
  },
  {
    name: "ChatGPT",
    mark: "ChatGPT",
    logo: { src: "/assets/chatgpt.png", width: 160, height: 56 },
    description: "OpenAI's conversational AI that understands context and generates human-like responses.",
    tone: "#10a37f",
  },
  {
    name: "Copilot",
    mark: "Copilot",
    logo: { src: `${CDN}/copilot.png`, width: 181, height: 50 },
    description: "Microsoft's AI coding assistant that helps developers write better code faster.",
    tone: "#60a5fa",
  },
  {
    name: "Grok",
    mark: "Grok",
    logo: { src: `${CDN}/grok.png`, width: 156, height: 57 },
    description: "xAI's witty AI assistant with real-time knowledge and a rebellious streak.",
    tone: "#f8f9fa",
  },
  {
    name: "Gemini",
    mark: "Gemini",
    logo: { src: `${CDN}/gemini.png`, width: 194, height: 87 },
    description: "Google's multimodal AI model capable of understanding text, images, and code.",
    tone: "#8ab4f8",
  },
];

/** Tilted stadium orbits in a 1000×620 viewBox around (500, 310); partners ride each one, evenly spaced. */
const ORBITS: { w: number; h: number; opacity: number; lap: number; dash: number; reverse: boolean; partners: Partner[] }[] = [
  {
    w: 560,
    h: 330,
    opacity: 0.55,
    lap: 70,
    dash: 18,
    reverse: false,
    partners: AI_TOOLS.slice(0, 2),
  },
  {
    w: 780,
    h: 460,
    opacity: 0.4,
    lap: 95,
    dash: 26,
    reverse: true,
    partners: AI_TOOLS.slice(2, 4),
  },
  {
    w: 960,
    h: 580,
    opacity: 0.28,
    lap: 120,
    dash: 34,
    reverse: false,
    partners: AI_TOOLS.slice(4, 6),
  },
];
const ORBIT_TILT = -24;
const VIEW_W = 1000;

function orbitPath(w: number, h: number) {
  const r = h / 2;
  const x0 = 500 - w / 2 + r;
  const x1 = 500 + w / 2 - r;
  return `M ${x0} ${310 - r} H ${x1} A ${r} ${r} 0 0 1 ${x1} ${310 + r} H ${x0} A ${r} ${r} 0 0 1 ${x0} ${310 - r} Z`;
}

/** Point at fraction `t` (0..1) along a stadium, following the same clockwise route as `orbitPath`, then tilted. */
function orbitPoint(w: number, h: number, t: number) {
  const r = h / 2;
  const straight = w - h;
  const total = 2 * straight + Math.PI * h;
  let s = (((t % 1) + 1) % 1) * total;
  let x: number;
  let y: number;
  if (s < straight) {
    x = 500 - straight / 2 + s;
    y = 310 - r;
  } else if ((s -= straight) < Math.PI * r) {
    const a = -Math.PI / 2 + s / r;
    x = 500 + straight / 2 + Math.cos(a) * r;
    y = 310 + Math.sin(a) * r;
  } else if ((s -= Math.PI * r) < straight) {
    x = 500 + straight / 2 - s;
    y = 310 + r;
  } else {
    s -= straight;
    const a = Math.PI / 2 + s / r;
    x = 500 - straight / 2 + Math.cos(a) * r;
    y = 310 + Math.sin(a) * r;
  }
  const tilt = (ORBIT_TILT * Math.PI) / 180;
  const dx = x - 500;
  const dy = y - 310;
  return { x: 500 + dx * Math.cos(tilt) - dy * Math.sin(tilt), y: 310 + dx * Math.sin(tilt) + dy * Math.cos(tilt) };
}

function PartnerMark({ partner }: { partner: Partner }) {
  const [missing, setMissing] = useState(false);
  if (partner.logo && !missing) {
    return (
      <span className="grid h-10 place-items-center rounded-lg bg-white px-3 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.6)]">
        <Image
          src={partner.logo.src}
          width={partner.logo.width}
          height={partner.logo.height}
          alt={partner.name}
          onError={() => setMissing(true)}
          className="h-6 w-auto"
        />
      </span>
    );
  }
  return (
    <span
      className="rounded-md bg-[#0d0a1a]/90 px-3 py-1.5 font-heading text-sm font-extrabold tracking-[0.12em] ring-1 ring-white/10"
      style={{ color: partner.tone }}
    >
      {partner.mark}
    </span>
  );
}

export function Constellation() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: root.current, start: "top 75%", end: "center 60%", scrub: 0.8 },
      });
      tl.fromTo(".js-cn-head > *", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.1, duration: 0.4 }, 0)
        .fromTo(".js-cn-orbit", { scale: 0.7, autoAlpha: 0, svgOrigin: "500 310" }, { scale: 1, autoAlpha: 1, stagger: 0.12, duration: 0.6 }, 0.1)
        .fromTo(".js-cn-core", { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5 }, 0.2)
        .fromTo(".js-cn-badge", { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, stagger: 0.05, duration: 0.4 }, 0.45);

      // Partners ride their orbits; the stage's live width maps viewBox units to pixels.
      const box = stage.current;
      const riders = gsap.utils.toArray<HTMLElement>(".js-cn-rider");
      if (!box || !riders.length) return;
      const reduced = prefersReducedMotion();
      const slots = ORBITS.flatMap((orbit) =>
        orbit.partners.map((_, i) => ({ orbit, offset: i / orbit.partners.length })),
      );
      let scale = box.clientWidth / VIEW_W;
      // Each rider keeps its own clock so a hovered logo can stop while the rest keep orbiting.
      const elapsed = riders.map(() => 0);
      const held = riders.map(() => false);

      const place = () => {
        riders.forEach((el, i) => {
          const { orbit, offset } = slots[i];
          const t = offset + ((orbit.reverse ? -1 : 1) * elapsed[i]) / orbit.lap;
          const p = orbitPoint(orbit.w, orbit.h, t);
          el.style.transform = `translate3d(${p.x * scale}px, ${p.y * scale}px, 0)`;
        });
      };

      const tick = (_: number, deltaMs: number) => {
        const step = Math.min(deltaMs, 100) / 1000;
        held.forEach((stopped, i) => {
          if (!stopped) elapsed[i] += step;
        });
        place();
      };

      const cleanups = riders.map((el, i) => {
        const hold = () => (held[i] = true);
        const release = () => (held[i] = false);
        el.addEventListener("pointerenter", hold);
        el.addEventListener("pointerleave", release);
        el.addEventListener("focusin", hold);
        el.addEventListener("focusout", release);
        return () => {
          el.removeEventListener("pointerenter", hold);
          el.removeEventListener("pointerleave", release);
          el.removeEventListener("focusin", hold);
          el.removeEventListener("focusout", release);
        };
      });

      const observer = new ResizeObserver(() => {
        scale = box.clientWidth / VIEW_W;
        place();
      });
      observer.observe(box);
      place();

      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          root.current?.toggleAttribute("data-paused", !self.isActive);
          if (reduced) return;
          if (self.isActive) gsap.ticker.add(tick);
          else gsap.ticker.remove(tick);
        },
      });

      return () => {
        gsap.ticker.remove(tick);
        observer.disconnect();
        cleanups.forEach((off) => off());
      };
    },
    { scope: root },
  );

  const all = ORBITS.flatMap((orbit) => orbit.partners);

  return (
    <section
      id="partners-constellation"
      ref={root}
      data-paused
      aria-labelledby="constellation-title"
      className="group/cn relative z-10 overflow-hidden bg-space py-24 sm:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[55%] size-[56rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(124_58_237/0.22),rgb(76_29_149/0.08)_45%,transparent_70%)]"
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

      <div ref={stage} className="relative mx-auto mt-12 aspect-[1000/620] w-[calc(100%-2rem)] max-w-5xl sm:mt-16">
        <svg viewBox="0 0 1000 620" aria-hidden className="absolute inset-0 size-full overflow-visible">
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

        <div className="js-cn-core absolute left-1/2 top-1/2 grid aspect-square w-[30%] max-w-[14rem] -translate-x-1/2 -translate-y-1/2 place-items-center">
          <span aria-hidden className="absolute inset-0 rounded-full ring-1 ring-violet-300/30" />
          <span aria-hidden className="absolute inset-[8%] animate-breathe rounded-full shadow-[0_0_60px_10px_rgb(168_85_247/0.45),inset_0_0_30px_rgb(168_85_247/0.4)] ring-[3px] ring-violet-500" />
          <span aria-hidden className="absolute inset-[16%] rounded-full bg-[radial-gradient(circle,rgb(76_29_149/0.6),rgb(30_10_60/0.9))] ring-1 ring-violet-300/25" />
          <Image src="/images/contenaissance-logo.webp" width={274} height={133} alt="Contenaissance" className="relative w-[42%] max-w-[6.5rem]" />
        </div>

        <ul className="pointer-events-none absolute inset-0 hidden sm:block">
          {all.map((partner, i) => (
            <li key={partner.name} className="js-cn-rider group/rider pointer-events-auto absolute left-0 top-0 will-change-transform hover:z-20 focus-within:z-20">
              <div className="-translate-x-1/2 -translate-y-1/2">
                <div
                  tabIndex={partner.description ? 0 : -1}
                  aria-describedby={partner.description ? `cn-tip-${i}` : undefined}
                  className="js-cn-badge relative flex cursor-default flex-col items-center gap-1.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  <span className="block transition-transform duration-300 group-hover/rider:scale-110">
                    <PartnerMark partner={partner} />
                  </span>
                  {partner.description && (
                    <span
                      id={`cn-tip-${i}`}
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 mb-3 w-60 -translate-x-1/2 translate-y-1 rounded-xl bg-[#140f24]/95 p-3.5 text-left opacity-0 shadow-[0_20px_50px_-15px_rgb(0_0_0/0.9)] ring-1 ring-violet-400/30 transition-[opacity,transform] duration-200 group-hover/rider:translate-y-0 group-hover/rider:opacity-100 group-focus-within/rider:translate-y-0 group-focus-within/rider:opacity-100"
                    >
                      <span className="block font-heading text-sm font-bold text-white">{partner.name}</span>
                      <span className="mt-1 block font-sans text-xs leading-relaxed text-slate-300">{partner.description}</span>
                      <span aria-hidden className="absolute left-1/2 top-full size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#140f24] ring-1 ring-violet-400/30 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ul className="relative mx-auto mt-10 grid max-w-md grid-cols-2 gap-4 px-6 sm:hidden">
        {all.map((partner) => (
          <li key={partner.name} className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.03] p-4 text-center ring-1 ring-white/[0.06]">
            <PartnerMark partner={partner} />            {partner.description && <span className="font-sans text-xs leading-snug text-slate-400">{partner.description}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
