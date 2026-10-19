"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BackSide, Vector3, type Group, type PointLight, type ShaderMaterial, type Texture } from "three";
import { coronaFragment, sunFragment, voyageVertex } from "../../../lib/shaders/voyage";
import type { VoyageLayout } from "../../../lib/voyage/voyageLayout";

const SHELL = 1.55;

export default function SunBody({ layout, map, isMobile }: { layout: VoyageLayout; map: Texture; isMobile: boolean }) {
  const group = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const surfaceMaterial = useRef<ShaderMaterial>(null);
  const coronaMaterial = useRef<ShaderMaterial>(null);

  const sunUniforms = useMemo(() => ({ uMap: { value: map }, uTime: { value: 0 }, uOpacity: { value: 0 } }), [map]);
  const coronaUniforms = useMemo(
    () => ({
      uCenter: { value: new Vector3() },
      uRadius: { value: 1 },
      uShell: { value: SHELL },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
    }),
    [],
  );

  useFrame(() => {
    const root = group.current;
    if (!root) return;
    root.visible = layout.reveal > 0.01;
    if (!root.visible) return;
    root.position.copy(layout.sun);
    root.scale.setScalar(layout.sunRadius);
    root.rotation.y = layout.time * 0.008;
    const surface = surfaceMaterial.current;
    const corona = coronaMaterial.current;
    if (surface) {
      surface.uniforms.uTime.value = layout.time;
      surface.uniforms.uOpacity.value = layout.reveal;
    }
    if (corona) {
      corona.uniforms.uCenter.value.copy(layout.sun);
      corona.uniforms.uRadius.value = layout.sunRadius;
      corona.uniforms.uTime.value = layout.time;
      corona.uniforms.uOpacity.value = layout.reveal;
    }
    if (light.current) light.current.intensity = layout.reveal * 3.2;
  });

  const segments = isMobile ? 64 : 128;

  return (
    <group ref={group} visible={false}>
      <mesh renderOrder={1}>
        <sphereGeometry args={[1, segments, segments / 2]} />
        <shaderMaterial
          ref={surfaceMaterial}
          vertexShader={voyageVertex}
          fragmentShader={sunFragment}
          uniforms={sunUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh scale={SHELL} renderOrder={2}>
        <sphereGeometry args={[1, 64, 32]} />
        <shaderMaterial
          ref={coronaMaterial}
          vertexShader={voyageVertex}
          fragmentShader={coronaFragment}
          uniforms={coronaUniforms}
          transparent
          premultipliedAlpha
          depthWrite={false}
          blending={AdditiveBlending}
          side={BackSide}
        />
      </mesh>
      {/* Decay 0: the sun lights every planet and the craft evenly across the composition. */}
      <pointLight ref={light} color="#ffd2a1" intensity={0} distance={0} decay={0} />
    </group>
  );
}
