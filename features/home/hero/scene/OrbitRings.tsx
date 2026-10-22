"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fades, motion, mulberry32 } from "@/features/home/lib/store";
import { softPointFragment } from "@/features/home/scene/shaders";

const ringVertex = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uSpeed;
uniform float uPixelRatio;
attribute float aAngle;
attribute float aRadius;
attribute float aY;
attribute float aSpeed;
attribute float aRandom;
varying float vMix;
varying float vAlpha;
void main(){
  float a = aAngle + uTime * uSpeed * aSpeed;
  vec3 p = vec3(cos(a) * aRadius, aY, sin(a) * aRadius);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.55 + 0.45 * sin(uTime * 2.5 + aRandom * 50.0);
  gl_PointSize = uSize * uPixelRatio * (0.35 + aRandom) * twinkle / -mv.z;
  vMix = aRandom;
  vAlpha = twinkle;
}
`;

type RingProps = {
  count: number;
  radius: number;
  spread: number;
  thickness: number;
  speed: number;
  size: number;
  rotation: [number, number, number];
  colorA: string;
  colorB: string;
  seed: number;
};

function Ring({ count, radius, spread, thickness, speed, size, rotation, colorA, colorB, seed }: RingProps) {
  const attrs = useMemo(() => {
    const rand = mulberry32(seed);
    const angle = new Float32Array(count);
    const rad = new Float32Array(count);
    const y = new Float32Array(count);
    const spd = new Float32Array(count);
    const rnd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      angle[i] = rand() * Math.PI * 2;
      const offset = (rand() - 0.5) * (rand() * spread);
      rad[i] = radius + offset;
      y[i] = (rand() - 0.5) * thickness;
      spd[i] = (0.6 + rand() * 0.8) * (radius / rad[i]);
      rnd[i] = rand();
    }
    return { angle, rad, y, spd, rnd, position: new Float32Array(count * 3) };
  }, [count, radius, spread, thickness, seed]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: size },
      uSpeed: { value: speed },
      uPixelRatio: { value: 1 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uFade: fades.hero,
    }),
    [size, speed, colorA, colorB],
  );

  const material = useRef<THREE.ShaderMaterial>(null);

  useFrame((state, delta) => {
    if (!material.current) return;
    const u = material.current.uniforms;
    u.uTime.value += Math.min(delta, 0.1) * motion.speed;
    u.uPixelRatio.value = state.gl.getPixelRatio();
  });

  return (
    <points rotation={rotation} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attrs.position, 3]} />
        <bufferAttribute attach="attributes-aAngle" args={[attrs.angle, 1]} />
        <bufferAttribute attach="attributes-aRadius" args={[attrs.rad, 1]} />
        <bufferAttribute attach="attributes-aY" args={[attrs.y, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[attrs.spd, 1]} />
        <bufferAttribute attach="attributes-aRandom" args={[attrs.rnd, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={ringVertex}
        fragmentShader={softPointFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function OrbitRings({ count }: { count: number }) {
  return (
    <group>
      <Ring
        count={Math.round(count * 1.3)}
        radius={2.7}
        spread={0.9}
        thickness={0.08}
        speed={0.18}
        size={22}
        rotation={[Math.PI * 0.42, 0, Math.PI * 0.08]}
        colorA="#22d3ee"
        colorB="#a78bfa"
        seed={11}
      />
      <Ring
        count={count}
        radius={3.5}
        spread={0.35}
        thickness={0.05}
        speed={-0.12}
        size={18}
        rotation={[Math.PI * 0.55, Math.PI * 0.18, -Math.PI * 0.12]}
        colorA="#c084fc"
        colorB="#f0abfc"
        seed={23}
      />
      <Ring
        count={Math.round(count * 0.6)}
        radius={4.4}
        spread={0.2}
        thickness={0.03}
        speed={0.07}
        size={16}
        rotation={[Math.PI * 0.35, -Math.PI * 0.25, Math.PI * 0.2]}
        colorA="#7dd3fc"
        colorB="#e0f2fe"
        seed={37}
      />
    </group>
  );
}
