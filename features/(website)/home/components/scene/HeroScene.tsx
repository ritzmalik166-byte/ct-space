"use client";

import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { AmbientLight, DirectionalLight, Group } from "three";
import { gsap } from "@/lib/gsap";
import type { HeroQuality } from "../../lib/heroDevice";
import { HeroFxController } from "../../lib/heroSceneFx";
import type { HeroSceneState } from "../../lib/heroSceneState";
import type { RobotInteraction } from "../../lib/robotInteraction";
import { ShipPose } from "../../lib/voyage/shipPose";
import { VoyageLayout } from "../../lib/voyage/voyageLayout";
import GalaxyDetail from "./GalaxyDetail";
import GalaxyPlanets from "./GalaxyPlanets";
import HeroRig from "./HeroRig";
import HumanDetail from "./HumanDetail";
import HumanPlanets from "./HumanPlanets";
import MorphingParticles from "./MorphingParticles";
import RobotEyes from "./RobotEyes";
import SpaceEnvironment from "./SpaceEnvironment";
import StarField from "./StarField";
import RobotLaser from "./robot/RobotLaser";
import Spaceship from "./ship/Spaceship";
import SolarSystem from "./system/SolarSystem";
interface HeroSceneProps {
  sceneState: HeroSceneState;
  quality: HeroQuality;
  reduceMotion: boolean;
  interaction: RobotInteraction;
  labelsRoot?: RefObject<HTMLElement | null>;
}

/**
 * Renders R3F frames from GSAP's ticker (frameloop="never") so Lenis,
 * ScrollTrigger and WebGL all share one requestAnimationFrame loop.
 */
function TickerDriver({ activeRef }: { activeRef: RefObject<boolean> }) {
  const advance = useThree((s) => s.advance);

  useEffect(() => {
    const tick = (time: number) => {
      if (activeRef.current) advance(time);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [advance, activeRef]);

  return null;
}

/** Updates state-aware secondary effects before anything else renders. */
function FxDriver({ fx, sceneState, reduceMotion }: { fx: HeroFxController; sceneState: HeroSceneState; reduceMotion: boolean }) {
  useFrame((state, delta) => fx.update(sceneState.progress, state.clock.elapsedTime, delta, reduceMotion));
  return null;
}

function VoyageDriver({
  layout,
  sceneState,
  reduceMotion,
}: {
  layout: VoyageLayout;
  sceneState: HeroSceneState;
  reduceMotion: boolean;
}) {
  // Negative priority runs before the ship and camera, and stays below 0 so
  // R3F keeps drawing the canvas. A positive priority disables that render.
  useFrame((state, delta) => {
    layout.update(state.size.width, state.size.height, sceneState, state.clock.elapsedTime, delta, reduceMotion);  }, -2);
  return null;
}

/** Hero key/fill/rim rig; dims once the sun takes over lighting the system. */
function HeroLights({ layout }: { layout: VoyageLayout }) {
  const ambient = useRef<AmbientLight>(null);
  const lights = useRef<Array<DirectionalLight | null>>([]);

  useFrame(() => {
    const k = 1 - layout.reveal * 0.86;
    if (ambient.current) ambient.current.intensity = 0.16 * (1 - layout.reveal * 0.5);
    lights.current.forEach((light, i) => {
      if (light) light.intensity = HERO_LIGHTS[i].intensity * k;
    });
  }, -2);

  return (
    <>
      <ambientLight ref={ambient} intensity={0.16} />
      {HERO_LIGHTS.map((light, i) => (
        <directionalLight
          key={i}
          ref={(el) => {
            lights.current[i] = el;
          }}
          position={light.position}
          intensity={light.intensity}
          color={light.color}
        />
      ))}
    </>
  );
}

const HERO_LIGHTS: Array<{ position: [number, number, number]; intensity: number; color: string }> = [
  { position: [6, 8, 10], intensity: 4.2, color: "#fff6e8" },
  { position: [-8, 2, 4], intensity: 1.15, color: "#9eb6ef" },
  { position: [1, -2, -6], intensity: 0.7, color: "#e7c48a" },
];

export default function HeroScene({ sceneState, quality, reduceMotion, interaction, labelsRoot }: HeroSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const robotAnchorRef = useRef<Group>(null);
  const activeRef = useRef(true);
  const [ready, setReady] = useState(false);
  const [voyageReady, setVoyageReady] = useState(false);

  // The ship and solar system assets load after the hero is interactive.
  useEffect(() => {
    if (!ready) return;
    const start = () => setVoyageReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(start, 1200);
    return () => clearTimeout(id);
  }, [ready]);
  const [fx] = useState(() => new HeroFxController());
  const [shipPose] = useState(() => new ShipPose());
  const [layout] = useState(() => new VoyageLayout());

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    // Pinning re-parents the section, which can queue a stale "not intersecting"
    // entry ahead of the current one; only the latest entry is authoritative.
    const observer = new IntersectionObserver((entries) => {
      activeRef.current = entries[entries.length - 1].isIntersecting;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      aria-hidden
      className={`absolute inset-0 transition-opacity duration-[1600ms] ease-out ${ready ? "opacity-100" : "opacity-0"}`}
    >
      <Canvas
        frameloop="never"
        dpr={[1, quality.maxDpr]}
        camera={{ fov: 35, position: [0, 0, 11], near: 0.1, far: 200 }}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          setReady(true);
        }}
      >
        <TickerDriver activeRef={activeRef} />
        <FxDriver fx={fx} sceneState={sceneState} reduceMotion={reduceMotion} />
        <VoyageDriver layout={layout} sceneState={sceneState} reduceMotion={reduceMotion} />
        <SpaceEnvironment />
        <HeroLights layout={layout} />
        <StarField count={quality.starCount} sceneState={sceneState} reduceMotion={reduceMotion} />
        {voyageReady ? (
          <>
            <Suspense fallback={null}>
              <Spaceship
                sceneState={sceneState}
                pose={shipPose}
                layout={layout}
                reduceMotion={reduceMotion}
                isMobile={quality.isMobile}
              />
            </Suspense>
            <Suspense fallback={null}>
              <SolarSystem layout={layout} reduceMotion={reduceMotion} isMobile={quality.isMobile} labelsRoot={labelsRoot} />
            </Suspense>
          </>
        ) : null}
        <HeroRig
          sceneState={sceneState}
          fx={fx}
          reduceMotion={reduceMotion}
          shipPose={shipPose}
          layout={layout}
          environment={<HumanPlanets fx={fx} reduceMotion={reduceMotion} isMobile={quality.isMobile} />}
        >
          <GalaxyPlanets sceneState={sceneState} reduceMotion={reduceMotion} isMobile={quality.isMobile} />
          <GalaxyDetail count={quality.galaxyDetailCount} sceneState={sceneState} reduceMotion={reduceMotion} />
          <MorphingParticles
            count={quality.particleCount}
            sceneState={sceneState}
            fx={fx}
            reduceMotion={reduceMotion}
            isMobile={quality.isMobile}
          />
          <HumanDetail
            count={quality.humanDetailCount}
            sceneState={sceneState}
            fx={fx}
            reduceMotion={reduceMotion}
            isMobile={quality.isMobile}
          />
          <RobotEyes fx={fx} />
          <group ref={robotAnchorRef} />
        </HeroRig>
        <RobotLaser fx={fx} interaction={interaction} anchorRef={robotAnchorRef} reduceMotion={reduceMotion} />
      </Canvas>
    </div>
  );
}
