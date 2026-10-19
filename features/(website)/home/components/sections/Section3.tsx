"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { gsap, useGSAP } from "@/lib/gsap";
import { setScrollLocked } from "@/lib/smoothScroll";
import ProjectionPanel from "../ui/station/ProjectionPanel";
import { StationCaptions, StationHeader, StationHint, StationHotspots, StationLoader, StationRail } from "../ui/station/StationOverlay";
import { MOBILE_QUERY, REDUCED_MOTION_QUERY, detectHeroQuality, detectWebGL } from "../../lib/heroDevice";
import { STATION_SCREENS } from "../../lib/station/stationContent";
import { StationInteraction, createStationSceneState } from "../../lib/station/stationState";
import { createStationTimeline } from "../../lib/station/stationTimeline";

const SpaceStationScene = dynamic(() => import("../scene/station/SpaceStationScene"), { ssr: false });

const subscribeNoop = () => () => {};
const SCROLL_KEYS = new Set([" ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"]);

export default function Section3() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const captionRefs = useRef<HTMLElement[]>([]);
  const projectorTween = useRef<gsap.core.Timeline | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [state] = useState(createStationSceneState);
  const [interaction] = useState(() => new StationInteraction());
  const [active, setActive] = useState(-1);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);

  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const env = useMemo(() => {
    if (!isClient) return null;
    return {
      webgl: detectWebGL(),
      quality: detectHeroQuality(),
      reduceMotion: window.matchMedia(REDUCED_MOTION_QUERY).matches,
    };
  }, [isClient]);
  const webgl = env?.webgl ?? false;

  useEffect(() => {
    interaction.setRoot(sectionRef.current);
    return () => interaction.setRoot(null);
  }, [interaction]);

  // The 3D scene (and its ~5 MB of assets) only loads once the section is a screen away.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !webgl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [webgl]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || !webgl) return;
      const rail = railRef.current;
      const fill = rail?.querySelector<HTMLElement>("[data-station-rail-fill]");
      const mm = gsap.matchMedia();
      mm.add({ isMobile: MOBILE_QUERY, isDesktop: "(min-width: 768px)", reduceMotion: REDUCED_MOTION_QUERY }, (ctx) => {
        const { isMobile, reduceMotion } = ctx.conditions as { isMobile: boolean; reduceMotion: boolean };
        createStationTimeline({
          section,
          state,
          captions: captionRefs.current,
          header: headerRef.current,
          hint: hintRef.current,
          rail: rail && fill ? { fill, nodes: Array.from(rail.querySelectorAll<HTMLElement>("[data-station-rail-node]")) } : null,
          reduceMotion,
          isMobile,
        });
      });
    },
    { scope: sectionRef, dependencies: [webgl] },
  );

  const syncPanel = useCallback(() => interaction.syncPanel(), [interaction]);
  const speed = env?.reduceMotion ? 0.01 : 1;

  const open = useCallback(
    (index: number) => {
      if (interaction.selected === index) return;
      const wasOpen = interaction.selected >= 0;
      returnFocus.current = interaction.hotspots[index] ?? null;
      interaction.select(index);
      setScrollLocked(true);
      projectorTween.current?.kill();
      const p = interaction.projector;
      const tl = gsap.timeline({ onUpdate: syncPanel });
      if (wasOpen) {
        // Collapse the current projection before the content swaps, so only one panel ever exists.
        tl.to(p, { surface: 0, beam: 0.35, duration: 0.22 * speed, ease: "power1.in" });
        tl.add(() => setActive(index));
      } else {
        setActive(index);
      }
      tl.to(p, { deploy: 1, duration: 0.6 * speed, ease: "power2.out" }, wasOpen ? ">" : 0);
      tl.to(p, { beam: 1, duration: 0.45 * speed, ease: "power1.out" }, wasOpen ? "<" : 0.35 * speed);
      tl.to(p, { surface: 1, duration: 0.5 * speed, ease: "power2.out" }, "<0.15");
      projectorTween.current = tl;
    },
    [interaction, syncPanel, speed],
  );

  const close = useCallback(
    (restoreFocus = true) => {
      if (interaction.selected < 0) return;
      interaction.select(-1);
      setScrollLocked(false);
      projectorTween.current?.kill();
      const p = interaction.projector;
      projectorTween.current = gsap
        .timeline({ onUpdate: syncPanel, onComplete: () => setActive(-1) })
        .to(p, { surface: 0, duration: 0.3 * speed, ease: "power1.in" })
        .to(p, { beam: 0, duration: 0.25 * speed }, "<0.1")
        .to(p, { deploy: 0, duration: 0.5 * speed, ease: "power2.inOut" }, "<0.1");
      if (restoreFocus) returnFocus.current?.focus({ preventScroll: true });
    },
    [interaction, syncPanel, speed],
  );

  // While projecting: Escape closes, and scroll keys can't advance the pinned timeline.
  useEffect(() => {
    if (active < 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (!SCROLL_KEYS.has(e.key)) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, video, iframe")) return;
      if (target && interaction.panel?.contains(target) && e.key !== " ") return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, interaction]);

  useEffect(
    () => () => {
      projectorTween.current?.kill();
      if (interaction.selected >= 0) setScrollLocked(false);
    },
    [interaction],
  );

  const setPanel = useCallback((el: HTMLElement | null) => interaction.setPanel(el), [interaction]);

  const handleReady = useCallback(() => setReady(true), []);

  return (
    <section
      ref={sectionRef}
      aria-label="Contenaissance space station"
      data-interior-ready="false"
      className="group/station relative isolate h-svh min-h-[620px] w-full overflow-hidden bg-[#02030a] font-sans text-white"
    >
      {env?.webgl && near ? (
        <SpaceStationScene
          state={state}
          interaction={interaction}
          reduceMotion={env.reduceMotion}
          isMobile={env.quality.isMobile}
          maxDpr={Math.min(env.quality.maxDpr, env.quality.isMobile ? 1.5 : 2)}
          onReady={handleReady}
        />
      ) : null}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-1 h-40 bg-linear-to-b from-[#03040b] to-transparent" />

      {env?.webgl ? (
        <>
          <StationLoader ready={ready} />
          <StationHeader ref={headerRef} />
          <StationRail ref={railRef} />
          <StationCaptions captionRefs={captionRefs} />
          <StationHint ref={hintRef} />
          <StationHotspots screens={STATION_SCREENS} interaction={interaction} active={active} onSelect={open} />
          {active >= 0 ? (
            <ProjectionPanel
              key="projection"
              content={STATION_SCREENS[active]}
              index={active}
              total={STATION_SCREENS.length}
              panelRef={setPanel}
              onClose={() => close()}
              onContact={() => close(false)}
            />
          ) : null}
        </>
      ) : env ? (
        <StaticFallback />
      ) : null}
    </section>
  );
}

/** Without WebGL the section degrades to a plain list of the same content. */
function StaticFallback() {
  return (
    <div className="relative z-10 mx-auto flex h-full max-w-[1200px] flex-col justify-center gap-8 px-6 md:px-12">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#e2bf74]">Section 03</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
          The <span className="brand-gold-text">Contenaissance</span> Station
        </h2>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {STATION_SCREENS.map((screen) => (
          <li key={screen.id} className="rounded-md border border-white/12 bg-white/3 p-5">
            {screen.label ? <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#7fe3ff]/80">{screen.label}</p> : null}
            <h3 className="mt-2 text-lg font-semibold">{screen.category}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{screen.description}</p>
            <a
              href={screen.video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-medium text-[#f4d675] underline-offset-4 hover:underline"
            >
              Watch Full Video
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
