"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, MathUtils, type Points, type ShaderMaterial } from "three";
import type { HeroSceneState } from "../../lib/heroSceneState";
import { galaxyDetailFragment, galaxyDetailVertex } from "../../lib/shaders/galaxyDetail";
import { useGalaxyDetailData } from "../../lib/useHeroMorphData";

interface GalaxyDetailProps {
  count: number;
  sceneState: HeroSceneState;
  reduceMotion: boolean;
}

const OPACITY = 0.8;
/** Scroll progress over which the detail layer dissolves into the morph. */
const FADE_END = 0.2;

/** Dense galaxy-only stars and dust layered onto the morphing galaxy. */
export default function GalaxyDetail({ count, sceneState, reduceMotion }: GalaxyDetailProps) {
  const data = useGalaxyDetailData(count);
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const reveal = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMotion: { value: 1 },
      uPixelRatio: { value: 1 },
      uSize: { value: 40 },
      uVisible: { value: 1 },
      uOpacity: { value: 0 },
    }),
    [],
  );

  useFrame((state, delta) => {
    const material = materialRef.current;
    const points = pointsRef.current;
    if (!material || !points) return;
    const visible = 1 - MathUtils.smoothstep(sceneState.progress, 0, FADE_END);
    points.visible = visible > 0.001;
    if (!points.visible) return;
    reveal.current = reduceMotion ? 1 : Math.min(1, reveal.current + Math.min(delta, 0.1) / 1.4);
    const u = material.uniforms;
    u.uOpacity.value = OPACITY * MathUtils.smoothstep(reveal.current, 0, 1);
    u.uVisible.value = visible;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = state.viewport.dpr;
    u.uMotion.value = reduceMotion ? 0 : 1;
  });

  if (!data) return null;

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[data.colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
        <bufferAttribute attach="attributes-aMeta" args={[data.meta, 2]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={galaxyDetailVertex}
        fragmentShader={galaxyDetailFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
