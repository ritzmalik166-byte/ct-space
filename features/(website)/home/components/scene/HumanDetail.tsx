"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Points, ShaderMaterial } from "three";
import { ADDITIVE_GLOW } from "../../lib/heroBlending";
import type { HeroFxController } from "../../lib/heroSceneFx";
import { smoothstep } from "../../lib/particles/shapeUtils";
import type { HeroSceneState } from "../../lib/heroSceneState";
import { humanDetailFragment, humanDetailVertex } from "../../lib/shaders/morphParticles";
import { useHumanDetailData } from "../../lib/useHeroMorphData";

const OPACITY = 0.85;

interface HumanDetailProps {
  count: number;
  sceneState: HeroSceneState;
  fx: HeroFxController;
  reduceMotion: boolean;
  isMobile: boolean;
}

/**
 * Fine particle "skin" that gives the character the reference's dense,
 * luminous surface. Separate from the shared morph buffer so the galaxy and
 * spaceship keep their own budgets; drawn only around the character state.
 */
export default function HumanDetail({ count, sceneState, fx, reduceMotion, isMobile }: HumanDetailProps) {
  const data = useHumanDetailData(count);
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 40 },
      uReveal: { value: 0 },
      uMotion: { value: 1 },
      uScanY: { value: -99 },
      uCutY: { value: -99 },
      uOpacity: { value: OPACITY },
    }),
    [],
  );

  useFrame((state) => {
    const material = materialRef.current;
    const points = pointsRef.current;
    if (!material || !points) return;
    const reveal = 1 - smoothstep(0.012, 0.085, Math.abs(sceneState.progress - 0.5));
    points.visible = reveal > 0.001;
    if (!points.visible) return;
    const u = material.uniforms;
    u.uReveal.value = reveal;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = state.viewport.dpr;
    u.uMotion.value = reduceMotion ? 0 : 1;
    u.uScanY.value = fx.scanY;
    u.uCutY.value = isMobile ? -2.3 : -99;
  });

  if (!data) return null;

  return (
    <points ref={pointsRef} frustumCulled={false} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[data.colors, 3]} />
        <bufferAttribute attach="attributes-aMeta" args={[data.meta, 2]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={humanDetailVertex}
        fragmentShader={humanDetailFragment}
        uniforms={uniforms}
        {...ADDITIVE_GLOW}
      />
    </points>
  );
}
