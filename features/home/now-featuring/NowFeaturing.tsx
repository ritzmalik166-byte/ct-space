"use client";

import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SectionHeading } from "@/features/home/components/SectionHeading";
import { assetUrl } from "@/features/home/lib/assets";
import { motion } from "@/features/home/lib/store";
import { bindTilt, cardsEntrance, cardsExit, simpleEntrance, type FeatureParts } from "./animations";
import { useRef, useState } from "react";
import { ExpandVideoModal, previewRatio } from "@/features/home/components/ExpandVideoModal";
import type { ExpandVideo } from "@/features/home/components/ExpandVideoModal";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const FEATURES = [
  { title: "Eye of the storm", video: assetUrl("auto.mp4") },
  { title: "Signal from deep space", video: assetUrl("01.mp4") },
  { title: "The island that walks", video: assetUrl("02.MP4") },
];

const pick = (scope: Element, selector: string) => scope.querySelector(selector) as HTMLElement;

export function NowFeaturing() {
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [activeVideo, setActiveVideo] = useState<ExpandVideo | null>(null);
  const [activeRatio, setActiveRatio] = useState(16 / 9);

  const videoOrigin = useRef<HTMLElement | null>(null);
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

      mm.add("(max-width: 639px)", () => {
        if (motion.reduced) return simpleEntrance(parts);

        const cards = gsap.utils.toArray<HTMLElement>(".js-nfc-item");

        // Stack all cards in the same centered position.
        gsap.set(cards, {
          position: "absolute",
          left: "50%",
          top: "50%",
          xPercent: -50,
          yPercent: -50,
          autoAlpha: 0,
          scale: 0.92,
        });

        const sequence = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${window.innerHeight * cards.length}`,
            pin: panel.current,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });

        cards.forEach((card, index) => {
          sequence
            .to(card, {
              autoAlpha: 1,
              scale: 1,
              duration: 0.25,
            })
            .to(card, {
              autoAlpha: 1,
              scale: 1,
              duration: 0.5,
            })
            .to(card, {
              autoAlpha: 0,
              scale: 0.94,
              duration: 0.25,
            });
        });

        return () => sequence.scrollTrigger?.kill();
      });

      mm.add("(min-width: 640px)", (ctx) => {
        if (motion.reduced) return simpleEntrance(parts);

        const { fine } = ctx.conditions ?? {};
        cardsEntrance(parts, true);
        cardsExit(parts);

        if (fine) return bindTilt(parts);
      });

      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onToggle: ({ isActive }) => {
          for (const v of videos) {
            if (isActive && !motion.reduced) v.play().catch(() => { });
            else v.pause();
          }
        },
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <>
      <section
        id="now-featuring"
        ref={root}
        aria-labelledby="now-featuring-title"
        className="relative min-h-svh"
      >
        <div
          ref={panel}
          className="relative flex min-h-svh flex-col items-center justify-start overflow-hidden px-5 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-32"
        >
          <SectionHeading
            id="now-featuring-title"
            title="Now featuring"
            subtitle="Inside every good AI product is a network of small, careful decisions."
          />

          {/* Card width is capped by viewport height so heading, cards and button always fit the sticky frame. */}
          <ul className="relative mt-15 h-[46svh] w-full max-w-[1150px] sm:mt-10 sm:grid sm:h-auto sm:grid-cols-3 sm:gap-5 lg:gap-8">
            {FEATURES.map((item, i) => (
              <li
                className={`js-nfc-item absolute left-0 top-0 aspect-[4/5] w-full max-w-[320px] sm:relative sm:left-auto sm:top-auto sm:w-full sm:max-w-none sm:translate-x-0 sm:translate-y-0 ${i === 1 ? "z-10" : ""}`}
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

                    {/* Full-card translucent black overlay */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-10 bg-black/40 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    />

                    {/* Optional subtle circular overlay detail */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(circle at 50% 50%, transparent 0%, rgb(0 0 0 / 0.12) 42%, rgb(0 0 0 / 0.22) 100%)",
                      }}
                    />

                    {/* Card border */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-20 rounded-[10px] ring-1 ring-inset ring-white/15"
                    />

                    {/* Shine */}
                    <span
                      aria-hidden="true"
                      className="js-nfc-shine pointer-events-none absolute inset-0 z-20 -translate-x-full bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.28)_50%,transparent_65%)]"
                    />

                    {/* Center VIEW button */}
                    <button
                      type="button"
                      aria-label={`View ${item.title}`}
                      onClick={(event) => {
                        const card = event.currentTarget.closest(
                          ".js-nfc-tilt",
                        ) as HTMLElement | null;

                        if (!card) return;

                        videoOrigin.current = card;
                        setActiveRatio(previewRatio(card));

                        setActiveVideo({
                          id: item.title,
                          src: item.video,
                          eyebrow: "NOW FEATURING",
                          title: item.title,
                          summary: "Explore the story behind this featured film.",
                          tags: ["Featured", "Film"],
                        });
                      }}
                      className="absolute left-1/2 cursor-pointer top-1/2 z-30 grid size-[104px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-transparent text-[11px] font-medium uppercase tracking-[0.25em] text-white opacity-0 transition-[opacity,background-color,border-color,transform] duration-500 group-hover:opacity-100 hover:scale-105 hover:border-black hover:bg-black focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      VIEW
                    </button>

                    {/* Title */}
                    <p className="absolute inset-x-4 bottom-4 z-20 translate-y-2 font-heading text-base font-semibold text-white opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                      {item.title}
                    </p>
                  </div>

                </div>
              </li>
            ))}
          </ul>

          <div className="js-nfc-cta-out mt-15 shrink-0 sm:mt-10">
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
      {activeVideo && (
        <ExpandVideoModal
          video={activeVideo}
          ratio={activeRatio}
          origin={() => videoOrigin.current}
          onRatio={setActiveRatio}
          onClosed={() => setActiveVideo(null)}
        />
      )}
    </>
  );
}
