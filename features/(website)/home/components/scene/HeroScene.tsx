"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { gsap } from "@/lib/gsap";
import type { HeroQuality } from "../../lib/heroDevice";
import { HeroFxController } from "../../lib/heroSceneFx";
import type { HeroSceneState } from "../../lib/heroSceneState";
import type { RobotInteraction } from "../../lib/robotInteraction";
import GalaxyDetail from "./GalaxyDetail";
import GalaxyPlanets from "./GalaxyPlanets";
import HeroRig from "./HeroRig";
import HumanDetail from "./HumanDetail";
import HumanPlanets from "./HumanPlanets";
import MorphingParticles from "./MorphingParticles";
import RobotEyes from "./RobotEyes";
import StarField from "./StarField";
import RobotLaser from "./robot/RobotLaser";

interface HeroSceneProps {
  sceneState: HeroSceneState;
  quality: HeroQuality;
  reduceMotion: boolean;
  interaction: RobotInteraction;
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

export default function HeroScene({ sceneState, quality, reduceMotion, interaction }: HeroSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const robotAnchorRef = useRef<Group>(null);
  const activeRef = useRef(true);
  const [ready, setReady] = useState(false);
  const [fx] = useState(() => new HeroFxController());

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      activeRef.current = entry.isIntersecting;
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
        onCreated={() => setReady(true)}
      >
        <TickerDriver activeRef={activeRef} />
        <FxDriver fx={fx} sceneState={sceneState} reduceMotion={reduceMotion} />
        <StarField count={quality.starCount} sceneState={sceneState} reduceMotion={reduceMotion} />
        <HeroRig
          sceneState={sceneState}
          fx={fx}
          reduceMotion={reduceMotion}
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
