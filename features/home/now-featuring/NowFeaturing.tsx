"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { assetUrl } from "@/features/home/lib/assets";
import { motion } from "@/features/home/lib/store";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const FEATURES = [
  { title: "Eye of the storm", video: assetUrl("06.mp4") },
  { title: "Signal from deep space", video: assetUrl("04.mp4") },
  { title: "The island that walks", video: assetUrl("07.mp4") },
];

export function NowFeaturing() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const videos = gsap.utils.toArray<HTMLVideoElement>(".js-nfc-video");

      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: root.current, start: "top 80%", end: "top top", scrub: 0.8 },
        })
        .fromTo(".js-nfc-head", { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0)
        .fromTo(
          ".js-nfc-card",
          { y: 120, autoAlpha: 0, clipPath: "inset(18% 0% 0% 0% round 10px)" },
          {
            y: 0,
            autoAlpha: 1,
            clipPath: "inset(0% 0% 0% 0% round 10px)",
            duration: 0.55,
            stagger: 0.12,
            ease: "power3.out",
          },
          0.15,
        )
        .fromTo(".js-nfc-cta", { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.25 }, 0.75);

      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: ({ isActive }) => {
          for (const v of videos) {
            if (isActive && !motion.reduced) v.play().catch(() => {});
            else v.pause();
          }
        },
      });
    },
    { scope: root },
  );

  return (
    <section id="now-featuring" ref={root} aria-labelledby="now-featuring-title" className="relative h-[200svh]">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
        <div className="js-nfc-head flex max-w-[506px] flex-col items-center gap-2.5 text-center">
          <h2
            id="now-featuring-title"
            className="bg-[linear-gradient(0deg,#94AEB8_0%,#F1F5F9_50%,#FFFFFF_100%)] bg-clip-text font-heading text-[30px] font-bold uppercase leading-none tracking-[-0.6px] text-transparent sm:text-[38px]"
          >
            Now featuring
          </h2>
          <p className="font-sans text-base font-normal leading-none tracking-[-0.6px] text-[#94A3B8] sm:text-lg">
            Inside every good AI product is a network of small, careful decisions.
          </p>
        </div>

        {/* Card width is capped by viewport height so heading, cards and button always fit the sticky frame. */}
        <ul className="mt-10 flex w-full max-w-[min(1311px,calc((100svh_-_19rem)*407/541*3_+_90px))] snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] sm:mt-14 sm:grid sm:grid-cols-3 sm:gap-6 lg:gap-[45px] sm:overflow-visible sm:pb-0">
          {FEATURES.map((item) => (
            <li
              key={item.video}
              className="js-nfc-card group relative aspect-[407/541] w-[68vw] shrink-0 snap-center overflow-hidden rounded-[10px] bg-white/[0.03] ring-1 ring-white/10 sm:w-auto"
            >
              <video
                className="js-nfc-video absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                src={`${item.video}#t=0.1`}
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              <p className="absolute inset-x-4 bottom-4 translate-y-2 font-heading text-base font-semibold text-white opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                {item.title}
              </p>
            </li>
          ))}
        </ul>

        <Link
          href="/#archive"
          className="js-nfc-cta group mt-10 flex h-[52px] items-center gap-6 rounded-full bg-white pl-6 pr-1.5 font-sans text-sm font-semibold uppercase text-black shadow-[0_10px_40px_-14px_rgb(255_255_255/0.5)] transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:mt-14"
        >
          View all
          <span className="grid size-10 place-items-center rounded-full bg-black text-white">
            <svg viewBox="0 0 24 24" className="size-5 transition-transform duration-500 group-hover:rotate-45" aria-hidden>
              <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      </div>
    </section>
  );
}
