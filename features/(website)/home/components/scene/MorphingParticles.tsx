"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Vector2, type ShaderMaterial } from "three";
import type { HeroFxController } from "../../lib/heroSceneFx";
import type { HeroSceneState } from "../../lib/heroSceneState";
import { getRobotEyes } from "../../lib/particles/robotShape";
import { SHIP_NOZZLES } from "../../lib/particles/spaceshipShape";
import { morphParticlesFragment, morphParticlesVertex } from "../../lib/shaders/morphParticles";
import { useHeroMorphData } from "../../lib/useHeroMorphData";

const OPACITY = 0.85;

interface MorphingParticlesProps {
  count: number;
  sceneState: HeroSceneState;
  fx: HeroFxController;
  reduceMotion: boolean;
}

/**
 * One particle system holding galaxy, robot and spaceship positions as
 * separate attributes. The vertex shader interpolates them on the GPU from a
 * single progress uniform, so a morph costs no CPU work per frame.
 */
export default function MorphingParticles({ count, sceneState, fx, reduceMotion }: MorphingParticlesProps) {
  const data = useHeroMorphData(count);
  const materialRef = useRef<ShaderMaterial>(null);
  const reveal = useRef(0);

  const uniforms = useMemo(() => {
    const eyes = getRobotEyes();
    return {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 40 },
      uFlow: { value: 0.26 },
      uMotion: { value: 1 },
      uOpacity: { value: 0 },
      uRobotW: { value: 0 },
      uShipW: { value: 0 },
      uScanY: { value: -99 },
      uEyeGlow: { value: 1 },
      uBlink: { value: new Vector2() },
      uLidY: { value: new Vector2(eyes.left.lidY, eyes.right.lidY) },
      uNozzle: { value: SHIP_NOZZLES.map((n) => new Vector2(n.y, n.z)) },
    };
  }, []);

  useFrame((state, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const u = material.uniforms;
    reveal.current = reduceMotion ? 1 : Math.min(1, reveal.current + Math.min(delta, 0.1) / 1.2);
    u.uOpacity.value = OPACITY * reveal.current * reveal.current * (3 - 2 * reveal.current);
    u.uTime.value = state.clock.elapsedTime;
    u.uProgress.value = sceneState.progress;
    u.uPixelRatio.value = state.viewport.dpr;
    u.uMotion.value = reduceMotion ? 0 : 1;
    u.uRobotW.value = fx.robotWeight;
    u.uShipW.value = fx.shipWeight;
    u.uScanY.value = fx.scanY;
    u.uEyeGlow.value = fx.eyeGlow;
    (u.uBlink.value as Vector2).set(fx.blinkLeft, fx.blinkRight);
  });

  if (!data) return null;

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.galaxyPositions, 3]} />
        <bufferAttribute attach="attributes-aRobot" args={[data.robotPositions, 3]} />
        <bufferAttribute attach="attributes-aShip" args={[data.spaceshipPositions, 3]} />
        <bufferAttribute attach="attributes-aColorGalaxy" args={[data.galaxyColors, 3]} />
        <bufferAttribute attach="attributes-aColorRobot" args={[data.robotColors, 3]} />
        <bufferAttribute attach="attributes-aColorShip" args={[data.spaceshipColors, 3]} />
        <bufferAttribute attach="attributes-aSizes" args={[data.sizes, 3]} />
        <bufferAttribute attach="attributes-aMeta" args={[data.meta, 4]} />
        <bufferAttribute attach="attributes-aFx" args={[data.fx, 4]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={morphParticlesVertex}
        fragmentShader={morphParticlesFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
