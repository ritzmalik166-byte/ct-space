"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { canHover, prefersReducedMotion } from "@/lib/media";
import { assetUrl } from "@/features/home/lib/assets";
import { DISC_STOPS } from "@/features/home/lib/store";
import { ExpandVideoModal, previewRatio, type ExpandVideo } from "@/features/home/components/ExpandVideoModal";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Discipline = { code: string; title: string; body: string; tags: string[]; video: string };

const DISCIPLINES: Discipline[] = [
  {
    code: "AI-ENG",
    title: "AI Product Engineering",
    body: "LLM copilots, autonomous agents and retrieval systems wired into the tools your team already uses.",
    tags: ["LLMs", "Agents", "RAG"],
    video: assetUrl("05.MP4"),
  },
  {
    code: "VISION",
    title: "Computer Vision",
    body: "Models that see: inspection, recognition and video analytics running on the edge or in the cloud.",
    tags: ["Detection", "OCR", "Edge"],
    video: assetUrl("03.mp4"),
  },
  {
    code: "WEB-APP",
    title: "Web & App Development",
    body: "Fast, accessible web and mobile products that put your AI in front of the people who need it.",
    tags: ["Next.js", "React Native", "APIs"],
    video: assetUrl("02.MP4"),
  },
  {
    code: "IMMERSIVE",
    title: "3D & Immersive",
    body: "Real-time 3D, WebGL and interactive storytelling, like the experience you're scrolling through.",
    tags: ["WebGL", "R3F", "Motion"],
    video: assetUrl("01.mp4"),
  },
];

/** Progress where the sticky panel locks: the trigger starts when the section enters (100svh of its 400svh). */
const STUCK_AT = 100 / 400;
/** Previews only play between these points: cards are hidden before, flying out after. */
const PAUSE_BELOW = DISC_STOPS[0] - 0.05;
const EXIT_START = 0.78;
const CORNERS = ["left-2 top-2", "right-2 top-2", "left-2 bottom-2", "right-2 bottom-2"];


function disciplineVideo(index: number): ExpandVideo {
  const item = DISCIPLINES[index];
  return {
    id: item.code,
    src: item.video,
    eyebrow: `Mod ${String(index + 1).padStart(2, "0")} · ${item.code}`,
    title: item.title,
    summary: item.body,
    tags: item.tags,
  };
}

function play(video: HTMLVideoElement | null) {
  video?.play().catch(() => {});
}

function DisciplineCard({
  item,
  index,
  load,
  onOpen,
}: {
  item: Discipline;
  index: number;
  load: boolean;
  onOpen: (index: number, media: HTMLElement) => void;
}) {
  const card = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = card.current;
    if (!el || !load) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (canHover() || prefersReducedMotion()) return;
        if (entry.isIntersecting) play(video.current);
        else video.current?.pause();
      },
      { threshold: 0.75 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  const onEnter = () => {
    if (canHover() && !prefersReducedMotion()) play(video.current);
  };
  const onLeave = () => {
    if (canHover()) video.current?.pause();
  };
  const open = (e: MouseEvent<HTMLButtonElement>) => {
    video.current?.pause();
    onOpen(index, e.currentTarget);
  };

  const number = String(index + 1).padStart(2, "0");

  return (
    <article
      ref={card}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      className="js-disc-card group relative w-[80%] shrink-0 snap-center sm:w-[46%] lg:w-auto"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-cyan-400/45 via-cyan-400/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="relative flex h-full flex-col rounded-2xl border border-white/[0.08] bg-[#0a1322]/90 p-3 transition-[translate,border-color] duration-500 ease-out group-hover:-translate-y-1.5 group-hover:border-cyan-400/25">
        <div className="flex items-center justify-between px-1 pb-3 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
          <span className="text-cyan-400">Mod {number}</span>
          <span>{item.code}</span>
        </div>

        <button
          type="button"
          onClick={open}
          aria-haspopup="dialog"
          aria-label={`Watch ${item.title} video`}
          className="js-disc-media relative aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-xl border border-white/[0.06] bg-[#0d2233] transition-shadow duration-500 group-hover:shadow-[0_0_48px_-12px_rgb(34_211_238/0.55)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60"
        >
          <video
            ref={video}
            src={load ? `${item.video}#t=0.5` : undefined}
            preload={load ? "metadata" : "none"}
            muted
            loop
            playsInline
            disablePictureInPicture
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="absolute inset-0 size-full scale-[1.02] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
          />
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${playing ? "opacity-25" : "opacity-100"}`}
          >
            <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(20_70_100/0.25)_0%,rgb(8_16_30/0.55)_60%,rgb(5_9_18/0.9)_100%)]" />
            <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.018)_0_1px,transparent_1px_7px)]" />
          </span>
          {CORNERS.map((pos) => (
            <span
              key={pos}
              aria-hidden
              className={`pointer-events-none absolute ${pos} font-mono text-[9px] leading-none text-cyan-400/60`}
            >
              +
            </span>
          ))}
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 scale-90 items-center gap-2 rounded-full border border-cyan-400/30 bg-[#0a1424]/85 py-2 pl-2.5 pr-3.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300 opacity-0 shadow-[0_0_30px_-6px_rgb(34_211_238/0.5)] transition-[opacity,scale] duration-300 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
              <path d="M4.5 2.8v10.4L13 8z" fill="currentColor" />
            </svg>
            Watch
          </span>
          <span className="absolute bottom-2.5 left-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-300/80">
            <span className={`size-1.5 rounded-full ${playing ? "animate-pulse bg-[#ff6b3d]" : "bg-cyan-400/70"}`} />
            {playing ? "Live" : "Preview"}
          </span>
        </button>

        <div className="js-card-fade flex flex-1 flex-col px-1 pt-4">
          <p className="font-mono text-[10px] tracking-[0.2em] text-slate-500">
            {number} / {String(DISCIPLINES.length).padStart(2, "0")}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400 [@media(max-height:760px)]:hidden">{item.body}</p>
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-4">
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
        <div
          aria-hidden
          className="js-card-flash pointer-events-none invisible absolute inset-0 rounded-2xl bg-cyan-100"
        />
      </div>
    </article>
  );
}

export function Disciplines() {
  const root = useRef<HTMLElement>(null);
  const [load, setLoad] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [ratio, setRatio] = useState(16 / 9);
  const activeMedia = useRef<HTMLElement | null>(null);

  const open = (index: number, media: HTMLElement) => {
    activeMedia.current = media;
    setRatio(previewRatio(media));
    setActive(index);
  };

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setLoad(true);
        io.disconnect();
      },
      { rootMargin: "50% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top bottom",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: (self) => {
            if (self.progress >= PAUSE_BELOW && self.progress < EXIT_START) return;
            root.current?.querySelectorAll("video").forEach((v) => v.pause());
          },
        },
      });

      tl.fromTo(".js-disc-panel", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT)
        .fromTo(".js-disc-veil", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, STUCK_AT)
        .fromTo(
          ".js-disc-line",
          { yPercent: 110 },
          { yPercent: 0, duration: 0.07, stagger: 0.03, ease: "power3.out" },
          STUCK_AT + 0.01,
        )
        .fromTo(".js-disc-fade", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.05, stagger: 0.02 }, STUCK_AT + 0.05);

      // Each card powers on like the channels that just switched off: a bright line that opens into the card.
      gsap.utils.toArray<HTMLElement>(".js-disc-card").forEach((card, i) => {
        const at = DISC_STOPS[i];
        tl.fromTo(
          card,
          { autoAlpha: 0, y: 70, scaleX: 0.35, scaleY: 0.012 },
          { autoAlpha: 1, y: 0, scaleX: 1, duration: 0.035, ease: "power3.out" },
          at - 0.05,
        )
          .to(card, { scaleY: 1, duration: 0.05, ease: "expo.out" }, at - 0.02)
          .fromTo(card.querySelector(".js-card-flash"), { autoAlpha: 0.9 }, { autoAlpha: 0, duration: 0.06 }, at - 0.02)
          .fromTo(
            card.querySelector(".js-disc-media"),
            { clipPath: "inset(50% 0% 50% 0% round 12px)" },
            { clipPath: "inset(0% 0% 0% 0% round 12px)", duration: 0.06, ease: "power2.out" },
            at,
          )
          .fromTo(card.querySelector(".js-card-fade"), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.05 }, at + 0.02);
      });

      // Exit: the camera flies on toward the timeline, so cards rush past it from the centre outwards.
      tl.to(".js-disc-head", { y: -50, autoAlpha: 0, duration: 0.06, ease: "power2.in" }, EXIT_START)
        .to(
          ".js-disc-card",
          { y: -30, scale: 1.3, autoAlpha: 0, duration: 0.1, ease: "power2.in", stagger: { each: 0.02, from: "center" } },
          EXIT_START + 0.03,
        )
        .to(".js-disc-veil", { autoAlpha: 0, duration: 0.12 }, EXIT_START + 0.04)
        .set({}, {}, 1);
    },
    { scope: root },
  );

  return (
    <section
      id="disciplines"
      ref={root}
      aria-labelledby="disciplines-title"
      className="pointer-events-none relative -mt-[100svh] h-[400svh]"
    >
      <div className="js-disc-panel invisible sticky top-0 flex h-svh items-center overflow-hidden">
        <div
          aria-hidden
          className="js-disc-veil absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgb(8_15_28/0.3)_0%,rgb(6_11_22/0.78)_65%,rgb(5_6_11/0.95)_100%)]"
        />

        <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="js-disc-head flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="js-disc-fade font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400/80 sm:text-[11px]">
                Capabilities · 04 modules
              </p>
              <h2
                id="disciplines-title"
                className="mt-4 text-[clamp(2.2rem,4.6vw,4rem)] font-bold leading-[0.98] tracking-[-0.035em]"
              >
                <span className="block overflow-hidden pb-[0.06em]">
                  <span className="js-disc-line inline-block">Four disciplines.</span>
                </span>
                <span className="block overflow-hidden pb-[0.08em]">
                  <span className="js-disc-line inline-block italic text-cyan-200">One vision.</span>
                </span>
              </h2>
            </div>
            <div className="js-disc-fade max-w-sm lg:text-right">
              <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
                Every engagement draws on all four. One senior team, one codebase, one point of contact.
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                SYS / Capability matrix • Click to watch
              </p>
            </div>
          </div>

          <div className="pointer-events-auto -mx-5 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [perspective:1400px] [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:mt-10 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
            {DISCIPLINES.map((item, i) => (
              <DisciplineCard key={item.code} item={item} index={i} load={load} onOpen={open} />
            ))}
          </div>
        </div>
      </div>

      <ExpandVideoModal
        video={active === null ? null : disciplineVideo(active)}
        ratio={ratio}
        origin={() => activeMedia.current}
        onRatio={setRatio}
        onClosed={() => setActive(null)}
      />
    </section>
  );
}
