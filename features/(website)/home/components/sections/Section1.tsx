"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { gsap, useGSAP } from "@/lib/gsap";
import HeroContent from "../ui/HeroContent";
import { createHeroTimeline } from "../../lib/heroAnimations";
import { createHeroSceneState } from "../../lib/heroSceneState";
import {
  MOBILE_QUERY,
  REDUCED_MOTION_QUERY,
  detectHeroQuality,
  detectWebGL,
} from "../../lib/heroDevice";

const HeroScene = dynamic(() => import("../scene/HeroScene"), { ssr: false });

const subscribeNoop = () => () => {};

/** Per-state ambient light behind the 3D object (galaxy, robot, spaceship). */
const GLOWS = [
  "radial-gradient(42% 46% at var(--glow-x) var(--glow-y), rgba(110,80,255,0.22), rgba(40,60,200,0.08) 55%, transparent 75%)",
  "radial-gradient(36% 44% at var(--glow-x) var(--glow-y), rgba(60,210,255,0.16), rgba(30,90,180,0.07) 55%, transparent 75%)",
  "radial-gradient(44% 40% at var(--glow-x) var(--glow-y), rgba(80,170,255,0.18), rgba(110,80,255,0.06) 55%, transparent 78%)",
];

export default function Section1() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const glowRefs = useRef<HTMLDivElement[]>([]);
  const [sceneState] = useState(createHeroSceneState);

  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const env = useMemo(() => {
    if (!isClient) return null;
    return {
      webgl: detectWebGL(),
      quality: detectHeroQuality(),
      reduceMotion: window.matchMedia(REDUCED_MOTION_QUERY).matches,
    };
  }, [isClient]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const content = contentRef.current;
      if (!section || !content) return;
      const layers = Array.from(content.querySelectorAll<HTMLElement>("[data-hero-layer]"));

      const mm = gsap.matchMedia();
      mm.add(
        { isMobile: MOBILE_QUERY, isDesktop: "(min-width: 768px)", reduceMotion: REDUCED_MOTION_QUERY },
        (ctx) => {
          const { isMobile, reduceMotion } = ctx.conditions as { isMobile: boolean; reduceMotion: boolean };
          createHeroTimeline({
            section,
            layers,
            glows: glowRefs.current,
            sceneState,
            reduceMotion,
            isMobile,
          });
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      aria-label="Contenaissance introduction"
      className="relative isolate h-svh min-h-[620px] w-full overflow-hidden bg-[#03040b] font-sans text-white [--glow-x:50%] [--glow-y:30%] md:[--glow-x:73%] md:[--glow-y:50%]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_40%,#0a1030_0%,#03040b_60%)]" />
        {GLOWS.map((background, i) => (
          <div
            key={i}
            ref={(el) => {
              if (el) glowRefs.current[i] = el;
            }}
            className="absolute inset-0"
            style={{ background, opacity: i === 0 ? 1 : 0 }}
          />
        ))}
      </div>

      {env?.webgl ? (
        <HeroScene sceneState={sceneState} quality={env.quality} reduceMotion={env.reduceMotion} />
      ) : null}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#03040b] via-[#03040b]/70 via-45% to-transparent to-70% md:bg-linear-to-r md:from-[#03040b]/85 md:via-[#03040b]/35 md:via-40% md:to-transparent md:to-60%"
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1440px] items-end px-6 pb-12 md:items-center md:px-12 md:pb-0 lg:px-20">
        <div className="w-full md:w-1/2">
          <HeroContent ref={contentRef} />
        </div>
      </div>
    </section>
  );
}
