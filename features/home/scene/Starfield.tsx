"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { motion, mulberry32, pointer } from "../lib/store";

const starVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aRandom;
attribute vec3 aColor;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.45 + 0.55 * sin(uTime * (0.6 + aRandom * 2.4) + aRandom * 120.0);
  gl_PointSize = (1.0 + aRandom * aRandom * 3.5) * uPixelRatio * (0.6 + twinkle * 0.6);
  vColor = aColor;
  vAlpha = twinkle;
}
`;

const starFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = pow(1.0 - d * 2.0, 1.6);
  gl_FragColor = vec4(vColor, a * vAlpha);
}
`;

const PALETTE = ["#ffffff", "#c7d2fe", "#a5f3fc", "#f5d0fe", "#e0e7ff"].map(
  (c) => new THREE.Color(c),
);

export function Starfield({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, randoms, colors } = useMemo(() => {
    const rand = mulberry32(99);
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const theta = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const dist = 25 + rand() * 45;
      positions[i * 3] = r * Math.cos(theta) * dist;
      positions[i * 3 + 1] = u * dist;
      positions[i * 3 + 2] = r * Math.sin(theta) * dist;
      randoms[i] = rand();
      const c = PALETTE[Math.floor(rand() * PALETTE.length)];
      colors.set([c.r, c.g, c.b], i * 3);
    }
    return { positions, randoms, colors };
  }, [count]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 } }), []);

  const material = useRef<THREE.ShaderMaterial>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1) * motion.speed;
    const p = ref.current;
    if (!p || !material.current) return;
    material.current.uniforms.uTime.value += dt;
    material.current.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    p.rotation.y += dt * 0.008;
    p.rotation.x = THREE.MathUtils.damp(p.rotation.x, pointer.y * 0.05, 2, delta);
    p.rotation.z = THREE.MathUtils.damp(p.rotation.z, -pointer.x * 0.03, 2, delta);
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={starVertex}
        fragmentShader={starFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
