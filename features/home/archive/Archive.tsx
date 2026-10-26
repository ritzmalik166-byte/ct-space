"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";
import { ExpandVideoModal, previewRatio } from "@/features/home/components/ExpandVideoModal";
import { ProjectCard } from "./ProjectCard";
import { PROJECTS, projectVideo } from "./projects";
import { archiveTimeline, bindCardTilt } from "./timeline";

gsap.registerPlugin(useGSAP, ScrollTrigger);

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
      const section = root.current;
      if (!section) return;
      const videos = gsap.utils.toArray<HTMLVideoElement>(".js-arch-video");
      const reduced = prefersReducedMotion();
      let playing = false;

      archiveTimeline(section, (on) => {
        on = on && !reduced;
        if (on === playing) return;
        playing = on;
        for (const v of videos) {
          if (on) v.play().catch(() => {});
          else v.pause();
        }
      });

      if (reduced) return;
      const mm = gsap.matchMedia();
      mm.add("(hover: hover) and (pointer: fine)", () => bindCardTilt(section));
      return () => mm.revert();
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
            <p className="font-sans text-base font-normal leading-none tracking-[-0.6px] text-[#94A3B8] sm:text-lg">Development Archive</p>
          </header>

          <div className="pointer-events-auto mt-8 grid w-full grid-cols-2 gap-3 sm:mt-12 lg:h-[min(64svh,620px)] lg:grid-cols-[1.42fr_1fr] lg:grid-rows-2 lg:gap-3.5">
            {PROJECTS.map((project, i) => (
              <ProjectCard key={project.code} project={project} index={i} load={load} onOpen={open} />
            ))}
          </div>

          <button
            type="button"
            onClick={(e) => open(0, e.currentTarget.parentElement?.querySelector(".js-arch-card") ?? e.currentTarget)}
            aria-haspopup="dialog"
            className="js-arch-cta group pointer-events-auto mt-8 flex h-[46px] w-[180px] items-center justify-between gap-2.5 rounded-[100px] bg-white px-[19px] py-[9px] font-sans text-base font-semibold text-black transition-[scale] duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:mt-12"
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
