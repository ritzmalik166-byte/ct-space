"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Hero } from "./hero/Hero";
import { Constellation } from "./constellation/Constellation";
import { journey } from "./lib/store";
import { prefersReducedMotion } from "@/lib/media";
import { registerLenis, scrollToHash } from "@/lib/scroll";
import { IntroLoader } from "./components/IntroLoader";
import { Archive } from "./archive/Archive";
import { Blueprint } from "./blueprint/Blueprint";
import { Impact } from "./impact/Impact";
import { Reviews } from "./reviews/Reviews";
import { Journal } from "./journal/Journal";
import type { JournalPost } from "./journal/types";
import { HowWeThink } from "./how-we-think/HowWeThink";
import { ThinkIntro } from "./how-we-think/ThinkIntro";
import { NowFeaturing } from "./now-featuring/NowFeaturing";
import { CreativeServices } from "./creative-services/CreativeServices";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const HeroCanvas = dynamic(() => import("./scene/HeroCanvas"), { ssr: false });

export function Experience({ posts }: { posts: JournalPost[] }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      let lenis: Lenis | undefined;
      let tick: ((time: number) => void) | undefined;

      if (!reduced) {
        lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
        lenis.on("scroll", ScrollTrigger.update);
        tick = (time) => lenis?.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        registerLenis(lenis);
      }

      // Same-page anchors glide through the journey instead of jumping. Capture phase runs before
      // next/link, which skips its own navigation once the event is default-prevented.
      const onAnchorClick = (e: MouseEvent) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const link = (e.target as Element | null)?.closest?.("a[href*='#']");
        if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") return;
        const url = new URL(link.href);
        if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
        if (scrollToHash(url.hash)) e.preventDefault();
      };
      document.addEventListener("click", onAnchorClick, true);

      ScrollTrigger.create({
        trigger: "#hero",
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => (journey.dive = self.progress),
        onRefresh: (self) => (journey.dive = self.progress),
      });

      ScrollTrigger.create({
        trigger: "#how-we-think",
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => (journey.net = self.progress),
        onRefresh: (self) => (journey.net = self.progress),
      });

      ScrollTrigger.create({
        trigger: "#now-featuring",
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => (journey.tv = self.progress),
        onRefresh: (self) => (journey.tv = self.progress),
      });

      ScrollTrigger.create({
        trigger: "#blueprint",
        start: "top bottom",
        end: "bottom bottom",
        onUpdate: (self) => (journey.flow = self.progress),
        onRefresh: (self) => (journey.flow = self.progress),
      });

      ScrollTrigger.create({
        trigger: "#archive",
        start: "top bottom",
        end: "bottom bottom",
        onUpdate: (self) => (journey.arch = self.progress),
        onRefresh: (self) => (journey.arch = self.progress),
      });

      ScrollTrigger.create({
        trigger: "#impact",
        start: "top bottom",
        end: "bottom bottom",
        onUpdate: (self) => (journey.impact = self.progress),
        onRefresh: (self) => (journey.impact = self.progress),
      });

      ScrollTrigger.create({
        trigger: "#reviews",
        start: "top bottom",
        end: "bottom bottom",
        onUpdate: (self) => (journey.review = self.progress),
        onRefresh: (self) => (journey.review = self.progress),
      });
      document.fonts?.ready.then(() => ScrollTrigger.refresh());

      return () => {
        document.removeEventListener("click", onAnchorClick, true);
        registerLenis(null);
        if (tick) gsap.ticker.remove(tick);
        lenis?.destroy();
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-48 top-1/3 size-[36rem] rounded-full bg-plasma/12 blur-[150px]" />
        <div className="absolute right-[-12rem] top-[-10rem] size-[40rem] rounded-full bg-amber-200/[0.06] blur-[150px]" />
      </div>

      <div className="fixed inset-0 z-0">
        <HeroCanvas />
      </div>

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(5_6_11/0.75)_100%)]"
      />

      <div className="relative z-10">
        <Hero />
        <Constellation />
        <ThinkIntro />
        <HowWeThink />
        <NowFeaturing />
        <CreativeServices />
        <Blueprint />
        <Archive />
        <Journal posts={posts} />
        <Impact />
        <Reviews />
      </div>

      <div aria-hidden className="grain pointer-events-none fixed inset-0 z-50 hidden md:block" />
      <IntroLoader />
    </div>
  );
}
