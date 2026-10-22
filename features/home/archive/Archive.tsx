"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { canHover, prefersReducedMotion } from "@/lib/media";
import { assetUrl } from "@/features/home/lib/assets";
import { ExpandVideoModal, previewRatio, type ExpandVideo } from "@/features/home/components/ExpandVideoModal";
import { TiltGlow, useTilt } from "@/features/home/lib/useTilt";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Project = {
  code: string;
  title: string;
  place: string;
  type: string;
  year: string;
  summary: string;
  preview: string;
  film?: string;
  stats?: [string, string][];
};

const PROJECTS: Project[] = [
  {
    code: "ARC-01",
    title: "Azure Heights Residences",
    place: "Dubai, UAE",
    type: "Residential tower",
    year: "2026",
    summary: "A 42-storey waterfront tower, taken from massing studies to a full cinematic launch film.",
    preview: assetUrl("14.mp4"),
    film: assetUrl("auto.mp4"),
    stats: [
      ["Floors", "42"],
      ["Residences", "380"],
      ["Film", "4K"],
    ],
  },
  {
    code: "ARC-02",
    title: "Marina Crest Villas",
    place: "Abu Dhabi, UAE",
    type: "Villas",
    year: "2025",
    summary: "Beachfront villas walked through room by room, from dawn light to evening interiors.",
    preview: assetUrl("09.mp4"),
  },
  {
    code: "ARC-03",
    title: "The Foundry Lofts",
    place: "London, UK",
    type: "Mixed-use",
    year: "2025",
    summary: "A Victorian foundry reborn as lofts and studios, with heritage brick meeting new steel.",
    preview: assetUrl("10.mp4"),
  },
  {
    code: "ARC-04",
    title: "Cedar Grove Estate",
    place: "Bengaluru, IN",
    type: "Gated community",
    year: "2024",
    summary: "Masterplan flythrough of a green, low-rise community built around shared courtyards.",
    preview: assetUrl("12.mp4"),
  },
  {
    code: "ARC-05",
    title: "Lumen Office Park",
    place: "Pune, IN",
    type: "Commercial",
    year: "2024",
    summary: "A daylight-first office campus, presented for leasing with interactive floor plates.",
    preview: assetUrl("13.mp4"),
  },
];

/** Progress where the sticky panel locks: the trigger starts when the section enters (100svh of its 600svh). */
const STUCK_AT = 100 / 600;
/** Scroll-driven focus moves across the projects at these points, then releases at FOCUS_END. */
const FOCUS_STOPS = [0.34, 0.42, 0.5, 0.58, 0.66];
const FOCUS_END = 0.74;
/** The next section starts entering here; the gallery drops away as the camera rises. */
const EXIT_START = 500 / 600;
const CORNERS = [
  "left-3 top-3 border-l border-t",
  "right-3 top-3 border-r border-t",
  "left-3 bottom-3 border-l border-b",
  "right-3 bottom-3 border-r border-b",
];

const pad = (i: number) => String(i + 1).padStart(2, "0");

const projectVideo = (project: Project): ExpandVideo => ({
  id: project.code,
  src: project.film ?? project.preview,
  eyebrow: `${project.code} · ${project.place} · ${project.year}`,
  title: project.title,
  summary: project.summary,
});

function play(video: HTMLVideoElement | null | undefined) {
  video?.play().catch(() => {});
}

function focusIndex(progress: number) {
  if (progress < FOCUS_STOPS[0] || progress >= FOCUS_END) return -1;
  let index = 0;
  FOCUS_STOPS.forEach((stop, i) => {
    if (progress >= stop) index = i;
  });
  return index;
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5 9 7M2.5 13.5 7 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProjectTile({
  project,
  index,
  load,
  onOpen,
}: {
  project: Project;
  index: number;
  load: boolean;
  onOpen: (index: number, media: HTMLElement) => void;
}) {
  const featured = index === 0;
  const video = useRef<HTMLVideoElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const { onPointerMove, onPointerLeave } = useTilt(tiltRef, glowRef, featured ? { x: 4, y: 5 } : { x: 7, y: 9 });

  const onEnter = () => {
    if (canHover() && !prefersReducedMotion()) play(video.current);
  };
  const onLeave = (e: PointerEvent<HTMLElement>) => {
    onPointerLeave();
    if (canHover() && e.currentTarget.dataset.focused !== "true") video.current?.pause();
  };

  return (
    <article
      onPointerEnter={onEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onLeave}
      className={`js-arch-tile group relative [perspective:1200px] ${
        featured
          ? "aspect-[16/10] lg:col-span-6 lg:row-span-2 lg:aspect-auto"
          : "aspect-[4/3] w-[72%] shrink-0 snap-start sm:w-[42%] lg:col-span-3 lg:aspect-auto lg:w-auto"
      }`}
    >
      <div ref={tiltRef} className="relative size-full rounded-2xl [transform-style:preserve-3d]">
        <button
          type="button"
          onClick={(e) => onOpen(index, e.currentTarget)}
          aria-haspopup="dialog"
          aria-label={`Expand ${project.title}`}
          className="js-arch-media relative block size-full cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1220] text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/70"
        >
          <video
            ref={video}
            className="js-arch-preview absolute inset-0 size-full scale-[1.03] object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.08]"
            src={load ? `${project.preview}#t=0.5` : undefined}
            preload={load ? "metadata" : "none"}
            muted
            loop
            playsInline
            disablePictureInPicture
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(rgb(34_211_238/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(34_211_238/0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-60 transition-opacity duration-500 group-hover:opacity-0"
          />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#04070d] via-[#04070d]/35 to-[#04070d]/10" />
          <TiltGlow glow={glowRef} />
          {CORNERS.map((pos) => (
            <span key={pos} aria-hidden className={`absolute size-3 border-cyan-300/50 ${pos}`} />
          ))}

          <span className="absolute inset-x-4 top-4 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 sm:inset-x-5 sm:top-5 sm:text-[10px]">
            <span className="text-cyan-300">{project.code}</span>
            <span>{project.year}</span>
          </span>

          <span className={`absolute inset-x-4 bottom-4 block sm:inset-x-5 sm:bottom-5 ${featured ? "lg:bottom-7 lg:inset-x-7" : ""}`}>
            <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300/90 sm:text-[10px]">
              {project.place} · {project.type}
            </span>
            <span
              className={`mt-1.5 block font-semibold tracking-tight text-white ${
                featured ? "text-xl sm:text-2xl lg:text-[2rem] lg:leading-tight" : "text-[15px] sm:text-base"
              }`}
            >
              {project.title}
            </span>
            {featured && (
              <>
                <span className="mt-2 hidden max-w-md text-sm leading-relaxed text-slate-400 sm:block">{project.summary}</span>
                {project.stats && (
                  <span className="mt-4 hidden gap-6 sm:flex">
                    {project.stats.map(([label, value]) => (
                      <span key={label} className="block">
                        <span className="block text-lg font-semibold text-white">{value}</span>
                        <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{label}</span>
                      </span>
                    ))}
                  </span>
                )}
              </>
            )}
          </span>

          <span className="absolute bottom-4 right-4 flex translate-y-1 items-center gap-1.5 rounded-full border border-cyan-400/30 bg-[#0a1424]/85 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-200 opacity-0 transition-[opacity,translate] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100 sm:bottom-5 sm:right-5">
            <ExpandIcon className="size-3" />
            Expand
          </span>

          <span aria-hidden className="js-arch-dim invisible absolute inset-0 bg-[#04070d]/60" />
        </button>

        <span
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-2xl border border-cyan-400/0 transition-[border-color,box-shadow] duration-500 group-hover:border-cyan-400/45 group-hover:shadow-[0_0_44px_-10px_rgb(34_211_238/0.55)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
        <span
          aria-hidden
          className="js-arch-ring pointer-events-none invisible absolute -inset-px rounded-2xl border border-cyan-400/60 shadow-[0_0_50px_-10px_rgb(34_211_238/0.6)]"
        />
      </div>
    </article>
  );
}

export function Archive() {
  const root = useRef<HTMLElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const [load, setLoad] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [ratio, setRatio] = useState(16 / 9);
  const activeMedia = useRef<HTMLElement | null>(null);

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

  const open = (index: number, media: HTMLElement) => {
    root.current?.querySelectorAll<HTMLVideoElement>(".js-arch-preview").forEach((v) => v.pause());
    activeMedia.current = media;
    setRatio(previewRatio(media));
    setActive(index);
  };

  useGSAP(
    () => {
      const tiles = gsap.utils.toArray<HTMLElement>(".js-arch-tile");
      const previews = gsap.utils.toArray<HTMLVideoElement>(".js-arch-preview");
      let focused = -2;

      const setFocus = (index: number) => {
        if (index === focused) return;
        focused = index;
        tiles.forEach((t, i) => (t.dataset.focused = String(i === index)));
        previews.forEach((v, i) => {
          if (i !== index) v.pause();
        });
        if (counter.current) counter.current.textContent = index < 0 ? "--" : pad(index);
        if (index < 0) return;
        if (!prefersReducedMotion()) play(previews[index]);
        if (window.matchMedia("(max-width: 1023.98px)").matches && index > 0) {
          const row = tiles[index].parentElement;
          row?.scrollTo({ left: tiles[index].offsetLeft - row.offsetLeft, behavior: "smooth" });
        }
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top bottom",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: (self) => setFocus(focusIndex(self.progress)),
        },
      });

      // Arrival: the camera pulls back out of the energy line and the gallery zooms out into place.
      tl.fromTo(".js-arch-panel", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT)
        .fromTo(".js-arch-veil", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, STUCK_AT)
        .fromTo(
          ".js-arch-gallery",
          { scale: 1.45, xPercent: 16, yPercent: -6 },
          { scale: 1, xPercent: 0, yPercent: 0, duration: 0.16, ease: "power2.out" },
          STUCK_AT,
        )
        .fromTo(
          ".js-arch-tile",
          { autoAlpha: 0, y: 60, rotateX: 14, z: -140 },
          { autoAlpha: 1, y: 0, rotateX: 0, z: 0, duration: 0.09, stagger: 0.025, ease: "power3.out" },
          STUCK_AT + 0.01,
        )
        .fromTo(
          ".js-arch-media",
          { clipPath: "inset(0% 0% 100% 0% round 16px)" },
          { clipPath: "inset(0% 0% 0% 0% round 16px)", duration: 0.08, stagger: 0.025, ease: "power2.out" },
          STUCK_AT + 0.02,
        )
        .fromTo(".js-arch-title", { yPercent: 110 }, { yPercent: 0, duration: 0.06, ease: "power3.out" }, STUCK_AT + 0.05)
        .fromTo(".js-arch-fade", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.05, stagger: 0.02 }, STUCK_AT + 0.08);

      // Focus: one project at a time is lit and playing while the rest settle back.
      tiles.forEach((tile, i) => {
        const dim = tile.querySelector(".js-arch-dim");
        const ring = tile.querySelector(".js-arch-ring");
        const start = FOCUS_STOPS[i];
        const end = FOCUS_STOPS[i + 1] ?? FOCUS_END;
        if (i > 0) tl.fromTo(dim, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.03 }, FOCUS_STOPS[0] - 0.02);
        tl.fromTo(ring, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, start)
          .to(tile, { scale: 1.02, duration: 0.03, ease: "power2.out" }, start)
          .to(ring, { autoAlpha: 0, duration: 0.02 }, end - 0.01)
          .to(tile, { scale: 1, duration: 0.03 }, end - 0.01);
        if (i > 0) tl.to(dim, { autoAlpha: 0, duration: 0.02 }, start - 0.01);
        tl.to(dim, { autoAlpha: i === tiles.length - 1 ? 0 : 1, duration: 0.02 }, end - 0.01);
      });
      tl.to(".js-arch-dim", { autoAlpha: 0, duration: 0.03 }, FOCUS_END - 0.01);

      tl.to(".js-arch-head", { y: -40, autoAlpha: 0, duration: 0.05, ease: "power2.in" }, EXIT_START)
        .to(
          ".js-arch-tile",
          { y: 120, scale: 0.86, rotateX: -10, autoAlpha: 0, duration: 0.1, ease: "power2.in", stagger: { each: 0.015, from: "end" } },
          EXIT_START + 0.01,
        )
        .to(".js-arch-veil", { autoAlpha: 0, duration: 0.1 }, EXIT_START + 0.05)
        .set({}, {}, 1);
    },
    { scope: root },
  );

  return (
    <section
      id="archive"
      ref={root}
      aria-labelledby="archive-title"
      className="pointer-events-none relative -mt-[100svh] h-[600svh]"
    >
      <div className="js-arch-panel invisible sticky top-0 h-svh overflow-hidden">
        <div
          aria-hidden
          className="js-arch-veil absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgb(8_15_28/0.45)_0%,rgb(6_11_22/0.82)_65%,rgb(5_6_11/0.95)_100%)]"
        />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-5 sm:px-8 lg:px-10">
          <header className="js-arch-head flex items-end justify-between gap-6">
            <div>
              <p className="js-arch-fade font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400/80 sm:text-[11px]">
                Portfolio · Selected works
              </p>
              <h2 id="archive-title" className="mt-3 overflow-hidden pb-[0.08em]">
                <span className="js-arch-title inline-block text-[clamp(1.9rem,3.6vw,3rem)] font-bold leading-tight tracking-[-0.03em]">
                  Development <span className="italic text-cyan-200">archive</span>
                </span>
              </h2>
            </div>
            <div className="js-arch-fade hidden text-right font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 sm:block">
              <p>
                <span ref={counter} className="text-cyan-300">
                  --
                </span>{" "}
                / {String(PROJECTS.length).padStart(2, "0")} in focus
              </p>
              <p className="mt-1.5">Scroll to browse • Click to expand</p>
            </div>
          </header>

          <div className="js-arch-gallery pointer-events-auto mt-6 flex flex-col gap-3 sm:gap-4 lg:mt-8 lg:grid lg:h-[min(62svh,40rem)] lg:grid-cols-12 lg:grid-rows-2">
            <ProjectTile project={PROJECTS[0]} index={0} load={load} onOpen={open} />
            <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:gap-4 sm:px-8 lg:contents">
              {PROJECTS.slice(1).map((project, i) => (
                <ProjectTile key={project.code} project={project} index={i + 1} load={load} onOpen={open} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <ExpandVideoModal
        video={active === null ? null : projectVideo(PROJECTS[active])}
        ratio={ratio}
        origin={() => activeMedia.current}
        onRatio={setRatio}
        onClosed={() => setActive(null)}
      />
    </section>
  );
}
