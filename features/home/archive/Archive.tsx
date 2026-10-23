"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";
import { assetUrl } from "@/features/home/lib/assets";
import { ExpandVideoModal, previewRatio, type ExpandVideo } from "@/features/home/components/ExpandVideoModal";

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
];

/** The section overlaps the previous one by 100svh; the panel locks once that overlap has scrolled past. */
const SECTION_SVH = 400;
const STUCK_AT = 100 / SECTION_SVH;
/** Scroll window in which the glass rises over the images. */
const GLASS_START = 0.42;
const GLASS_END = 0.56;
/** The next section starts entering here. */
const EXIT_START = (SECTION_SVH - 100) / SECTION_SVH;

/** Glass on the featured card starts as the title strip along its bottom edge. */
const STRIP = "inset(82% 0% 0% 0%)";
const HIDDEN = "inset(100% 0% 0% 0%)";
const FULL = "inset(0% 0% 0% 0%)";
/** Phones skip the backdrop blur: blurring live video every frame is too costly there. */
const GLASS = "bg-black/30 sm:bg-white/[0.04] sm:backdrop-blur-[1px]";

const projectVideo = (project: Project): ExpandVideo => ({
  id: project.code,
  src: project.film ?? project.preview,
  eyebrow: `${project.code} · ${project.place} · ${project.year}`,
  title: project.title,
  summary: project.summary,
});

function ProjectCard({
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

  return (
    <button
      type="button"
      onClick={(e) => onOpen(index, e.currentTarget)}
      aria-haspopup="dialog"
      aria-label={`Watch ${project.title}`}
      className={`js-arch-card group relative block overflow-hidden bg-[#0a1220] text-left ring-1 ring-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] ${
        featured ? "col-span-2 aspect-[4/3] lg:col-span-1 lg:row-span-2 lg:aspect-auto" : "aspect-[4/3] lg:aspect-auto"
      }`}
    >
      <video
        className="js-arch-video absolute inset-0 size-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
        src={load ? `${project.preview}#t=0.5` : undefined}
        preload={load ? "metadata" : "none"}
        muted
        loop
        playsInline
        disablePictureInPicture
      />

      <span
        className={`js-arch-glass absolute inset-0 flex flex-col items-center justify-end border-t border-white/20 text-center [text-shadow:0_1px_14px_rgb(0_0_0/0.65)] ${GLASS} ${
          featured ? "px-6 pb-5 sm:px-10 sm:pb-6" : "px-4 pb-4 sm:px-6 sm:pb-5"
        }`}
        style={{ clipPath: featured ? STRIP : HIDDEN }}
      >
        <span className="js-arch-more flex flex-col items-center">
          <span className="font-sans text-[11px] uppercase tracking-[0.2em] text-white/70 sm:text-xs">
            {project.place} · {project.type} · {project.year}
          </span>
          {featured && (
            <>
              <span className="mt-4 hidden max-w-md font-sans text-base leading-snug text-white/85 sm:block">
                {project.summary}
              </span>
              {project.stats && (
                <span className="mt-6 hidden gap-10 sm:flex">
                  {project.stats.map(([label, value]) => (
                    <span key={label} className="block">
                      <span className="block font-heading text-2xl font-bold text-white">{value}</span>
                      <span className="mt-1 block font-sans text-[11px] uppercase tracking-[0.18em] text-white/60">
                        {label}
                      </span>
                    </span>
                  ))}
                </span>
              )}
              <span className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 font-sans text-sm font-semibold text-black">
                <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                  <path d="M4.5 2.8v10.4L13 8z" fill="currentColor" />
                </svg>
                Watch film
              </span>
            </>
          )}
        </span>
        <span
          className={`js-arch-title block font-heading font-bold leading-tight text-white ${
            featured ? "mt-5 text-lg sm:text-[22px]" : "mt-2 text-sm sm:text-lg"
          }`}
        >
          {project.title}
        </span>
      </span>
    </button>
  );
}

export function Archive() {
  const root = useRef<HTMLElement>(null);
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
    root.current?.querySelectorAll<HTMLVideoElement>(".js-arch-video").forEach((v) => v.pause());
    activeMedia.current = media;
    setRatio(previewRatio(media));
    setActive(index);
  };

  useGSAP(
    () => {
      const videos = gsap.utils.toArray<HTMLVideoElement>(".js-arch-video");
      const glass = gsap.utils.toArray<HTMLElement>(".js-arch-glass");
      const more = gsap.utils.toArray<HTMLElement>(".js-arch-more");
      let playing = false;

      // Videos run while the images are on show and stop once glass fully covers them.
      const setPlaying = (on: boolean) => {
        if (on === playing) return;
        playing = on;
        for (const v of videos) {
          if (on) v.play().catch(() => {});
          else v.pause();
        }
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top bottom",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: ({ progress }) =>
            setPlaying(!prefersReducedMotion() && progress > STUCK_AT - 0.02 && progress < GLASS_END && progress < EXIT_START),
          onLeave: () => setPlaying(false),
          onLeaveBack: () => setPlaying(false),
        },
      });

      // Arrival: header, then the cards unmask one after another, as in the static design.
      tl.fromTo(".js-arch-panel", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, STUCK_AT - 0.02)
        .fromTo(".js-arch-veil", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, STUCK_AT - 0.02)
        .fromTo(".js-arch-head", { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.05, ease: "power2.out" }, STUCK_AT - 0.01)
        .fromTo(
          ".js-arch-card",
          { y: 80, autoAlpha: 0, clipPath: "inset(12% 0% 0% 0%)" },
          { y: 0, autoAlpha: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 0.08, stagger: 0.02, ease: "power3.out" },
          STUCK_AT,
        )
        .fromTo(".js-arch-cta", { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.04 }, STUCK_AT + 0.06);

      // Glass: rises over each full image, then the extra details settle in.
      const span = GLASS_END - GLASS_START;
      glass.forEach((el, i) => {
        tl.fromTo(
          el,
          { clipPath: i === 0 ? STRIP : HIDDEN },
          { clipPath: FULL, duration: span * 0.7, ease: "power2.inOut" },
          GLASS_START + i * span * 0.15,
        );
      });
      tl.fromTo(
        more,
        { y: 30, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: span * 0.45, stagger: span * 0.12, ease: "power2.out" },
        GLASS_START + span * 0.45,
      );

      tl.to(".js-arch-head", { y: -40, autoAlpha: 0, duration: 0.05, ease: "power2.in" }, EXIT_START)
        .to(".js-arch-cta", { autoAlpha: 0, duration: 0.04 }, EXIT_START)
        .to(
          ".js-arch-card",
          { y: 100, scale: 0.92, autoAlpha: 0, duration: 0.1, ease: "power2.in", stagger: { each: 0.015, from: "end" } },
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
      className="pointer-events-none relative -mt-[100svh] h-[400svh]"
    >
      <div className="js-arch-panel invisible sticky top-0 h-svh overflow-hidden">
        <div
          aria-hidden
          className="js-arch-veil absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgb(8_15_28/0.55)_0%,rgb(6_11_22/0.88)_65%,rgb(5_6_11/0.96)_100%)]"
        />

        <div className="relative mx-auto flex h-full w-full max-w-[1280px] flex-col items-center justify-center px-5 sm:px-8 lg:px-10">
          <header className="js-arch-head flex max-w-[506px] flex-col items-center gap-2.5 text-center">
            <h2
              id="archive-title"
              className="bg-[linear-gradient(0deg,#94AEB8_0%,#F1F5F9_50%,#FFFFFF_100%)] bg-clip-text font-heading text-[30px] font-bold uppercase leading-none tracking-[-0.6px] text-transparent sm:text-[38px]"
            >
              Portfolio
            </h2>
            <p className="font-sans text-base font-normal leading-none tracking-[-0.6px] text-[#94A3B8] sm:text-lg">
              Development Archive
            </p>
          </header>

          <div className="pointer-events-auto mt-8 grid w-full grid-cols-2 gap-3 sm:mt-12 lg:h-[min(58svh,560px)] lg:grid-cols-[1.42fr_1fr] lg:grid-rows-2 lg:gap-3.5">
            {PROJECTS.map((project, i) => (
              <ProjectCard key={project.code} project={project} index={i} load={load} onOpen={open} />
            ))}
          </div>

          <button
            type="button"
            onClick={(e) => open(0, e.currentTarget.parentElement?.querySelector(".js-arch-card") ?? e.currentTarget)}
            aria-haspopup="dialog"
            className="js-arch-cta group pointer-events-auto mt-8 flex h-[46px] w-[180px] items-center justify-between gap-2.5 rounded-[100px] bg-white px-[19px] py-[9px] font-sans text-base font-semibold text-black transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:mt-12"
          >
            Portfolio
            <span className="grid size-7 place-items-center rounded-full bg-black text-white">
              <svg viewBox="0 0 24 24" className="size-4 transition-transform duration-500 group-hover:rotate-45" aria-hidden>
                <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
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
