"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SectionHeading } from "@/features/home/components/SectionHeading";
import { assetUrl } from "@/features/home/lib/assets";
import { motion } from "@/features/home/lib/store";
import { bindTilt, cardsEntrance, cardsExit, simpleEntrance, type FeatureParts } from "./animations";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const FEATURES = [
  { title: "Eye of the storm", video: assetUrl("auto.mp4") },
  { title: "Signal from deep space", video: assetUrl("01.mp4") },
  { title: "The island that walks", video: assetUrl("02.mp4") },
];

const pick = (scope: Element, selector: string) => scope.querySelector(selector) as HTMLElement;

export function NowFeaturing() {
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section || !panel.current) return;
      const videos = gsap.utils.toArray<HTMLVideoElement>(".js-nfc-video");

      const parts: FeatureParts = {
        section,
        panel: panel.current,
        items: gsap.utils.toArray<HTMLElement>(".js-nfc-item").map((li) => ({
          li,
          card: pick(li, ".js-nfc-card"),
          tilt: pick(li, ".js-nfc-tilt"),
          shine: pick(li, ".js-nfc-shine"),
        })),
        cta: { inner: pick(section, ".js-nfc-cta"), outer: pick(section, ".js-nfc-cta-out") },
      };

      const mm = gsap.matchMedia();
      mm.add({ fan: "(min-width: 640px)", fine: "(hover: hover) and (pointer: fine)" }, (ctx) => {
        if (motion.reduced) return simpleEntrance(parts);
        const { fan, fine } = ctx.conditions ?? {};
        cardsEntrance(parts, Boolean(fan));
        cardsExit(parts);
        if (fine) return bindTilt(parts);
      });

      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onToggle: ({ isActive }) => {
          for (const v of videos) {
            if (isActive && !motion.reduced) v.play().catch(() => {});
            else v.pause();
          }
        },
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section id="now-featuring" ref={root} aria-labelledby="now-featuring-title" className="relative h-[200svh]">
      <div ref={panel} className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden bg-space px-5 py-10 sm:px-8">
        <SectionHeading
          id="now-featuring-title"
          title="Now featuring"
          subtitle="Inside every good AI product is a network of small, careful decisions."
        />

        {/* Card width is capped by viewport height so heading, cards and button always fit the sticky frame. */}
        <ul className="mt-10 flex w-full max-w-[min(1311px,calc((100svh_-_19rem)*407/541*3_+_90px))] snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] sm:mt-14 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:pb-0 lg:gap-[45px]">
          {FEATURES.map((item, i) => (
            <li
              key={item.video}
              className={`js-nfc-item relative aspect-[407/541] w-[68vw] shrink-0 snap-center sm:w-auto ${i === 1 ? "z-10" : ""}`}
            >
              <div className="js-nfc-card size-full">
                <div className="js-nfc-tilt group relative size-full overflow-hidden bg-white/[0.03] [clip-path:inset(0%_round_10px)]">
                  <video
                    className="js-nfc-video absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    src={`${item.video}#t=0.1`}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-hidden
                  />
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[10px] ring-1 ring-inset ring-white/10" />
                  <span
                    aria-hidden
                    className="js-nfc-shine pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.28)_50%,transparent_65%)]"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <p className="absolute inset-x-4 bottom-4 translate-y-2 font-heading text-base font-semibold text-white opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    {item.title}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="js-nfc-cta-out mt-10 sm:mt-14">
          <Link
            href="/#archive"
            className="js-nfc-cta group flex h-[52px] items-center gap-6 rounded-full bg-white pl-6 pr-1.5 font-sans text-sm font-semibold uppercase text-black shadow-[0_10px_40px_-14px_rgb(255_255_255/0.5)] transition-[scale] duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            View all
            <span className="grid size-10 place-items-center rounded-full bg-black text-white">
              <svg viewBox="0 0 24 24" className="size-5 transition-transform duration-500 group-hover:rotate-45" aria-hidden>
                <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
