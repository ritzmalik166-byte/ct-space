"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, type Points, type ShaderMaterial } from "three";
import type { HeroSceneState } from "../../lib/heroSceneState";
import { PALETTE, createRandom } from "../../lib/particles/shapeUtils";
import { starFieldFragment, starFieldVertex } from "../../lib/shaders/morphParticles";

interface StarFieldProps {
  count: number;
  sceneState: HeroSceneState;
  reduceMotion: boolean;
}

/** Restrained background stars on a distant shell, with scroll parallax. */
export default function StarField({ count, sceneState, reduceMotion }: StarFieldProps) {
  const ref = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const { positions, sizes, phases, colors } = useMemo(() => {
    const random = createRandom(42);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 35 + random() * 40;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(random() * 2 - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = -Math.abs(r * Math.cos(phi)) - 10;
      const bright = random() < 0.06;
      sizes[i] = bright ? 2.6 + random() * 1.6 : 0.9 + random() * 1.3;
      phases[i] = random();
      const tone = random();
      const color = tone < 0.6 ? PALETTE.ice : tone < 0.85 ? PALETTE.white : tone < 0.95 ? PALETTE.orchid : PALETTE.gold;
      const level = bright ? 0.95 : 0.55 + random() * 0.3;
      colors[i * 3] = color[0] * level;
      colors[i * 3 + 1] = color[1] * level;
      colors[i * 3 + 2] = color[2] * level;
    }
    return { positions, sizes, phases, colors };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uMotion: { value: 1 },
    }),
    [],
  );

  useFrame((state) => {
    const material = materialRef.current;
    if (material) {
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uPixelRatio.value = state.viewport.dpr;
      material.uniforms.uMotion.value = reduceMotion ? 0 : 1;
    }
    if (ref.current) {
      const drift = reduceMotion ? 0 : state.clock.elapsedTime * 0.004;
      ref.current.rotation.y = drift + sceneState.progress * 0.22;
      ref.current.rotation.x = sceneState.progress * 0.06;
    }
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={starFieldVertex}
        fragmentShader={starFieldFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
