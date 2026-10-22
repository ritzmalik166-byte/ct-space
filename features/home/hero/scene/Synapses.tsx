"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fades, motion, mulberry32 } from "@/features/home/lib/store";
import { softPointFragment } from "@/features/home/scene/shaders";

const RADIUS = 1.9;
const NEIGHBOURS = 3;

const lineVertex = /* glsl */ `
attribute float aT;
attribute float aSeed;
varying float vT;
varying float vSeed;
void main(){
  vT = aT;
  vSeed = aSeed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const lineFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uPulse;
uniform float uFade;
varying float vT;
varying float vSeed;
void main(){
  float speed = 0.22 + fract(vSeed * 3.7) * 0.4;
  float head = fract(uTime * speed + vSeed * 9.0) * 1.4;
  float t = mix(vT, 1.0 - vT, step(0.5, fract(vSeed * 7.13)));
  float d = head - t;
  float glow = step(0.0, d) * pow(max(1.0 - d / 0.3, 0.0), 2.0);
  glow *= step(0.3, fract(vSeed * 13.7));
  vec3 col = mix(uColor, uPulse, glow);
  gl_FragColor = vec4(col, (0.07 + glow * 0.95) * uFade);
}
`;

const nodeVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSeed;
varying float vMix;
varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float pulse = sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 30.0) * 0.5 + 0.5;
  gl_PointSize = (40.0 + pulse * 50.0) * uPixelRatio / -mv.z;
  vMix = aSeed;
  vAlpha = 0.35 + pulse * 0.65;
}
`;

export function Synapses({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null);

  const data = useMemo(() => {
    const rand = mulberry32(42);
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const theta = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const radius = RADIUS * (0.92 + rand() * 0.16);
      nodes.push(
        new THREE.Vector3(r * Math.cos(theta), u, r * Math.sin(theta)).multiplyScalar(radius),
      );
    }

    const seen = new Set<string>();
    const pos: number[] = [];
    const t: number[] = [];
    const seeds: number[] = [];
    nodes.forEach((a, i) => {
      nodes
        .map((b, j) => ({ j, d: a.distanceToSquared(b) }))
        .filter(({ j }) => j !== i)
        .sort((x, y) => x.d - y.d)
        .slice(0, NEIGHBOURS)
        .forEach(({ j }) => {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (seen.has(key)) return;
          seen.add(key);
          const b = nodes[j];
          const seed = rand();
          pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
          t.push(0, 1);
          seeds.push(seed, seed);
        });
    });

    const nodePositions = new Float32Array(nodes.flatMap((n) => [n.x, n.y, n.z]));
    const nodeSeeds = new Float32Array(nodes.map(() => rand()));

    return {
      linePositions: new Float32Array(pos),
      lineT: new Float32Array(t),
      lineSeeds: new Float32Array(seeds),
      nodePositions,
      nodeSeeds,
    };
  }, [count]);

  const lineUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#38bdf8") },
      uPulse: { value: new THREE.Color("#fef3c7") },
      uFade: fades.hero,
    }),
    [],
  );

  const nodeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uColorA: { value: new THREE.Color("#67e8f9") },
      uColorB: { value: new THREE.Color("#c084fc") },
      uFade: fades.hero,
    }),
    [],
  );

  const lineMat = useRef<THREE.ShaderMaterial>(null);
  const nodeMat = useRef<THREE.ShaderMaterial>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1) * motion.speed;
    if (lineMat.current) lineMat.current.uniforms.uTime.value += dt;
    if (nodeMat.current) {
      nodeMat.current.uniforms.uTime.value += dt;
      nodeMat.current.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    }
    if (group.current) {
      group.current.rotation.y -= dt * 0.04;
      group.current.rotation.z += dt * 0.015;
    }
  });

  return (
    <group ref={group}>
      <lineSegments frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.linePositions, 3]} />
          <bufferAttribute attach="attributes-aT" args={[data.lineT, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[data.lineSeeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={lineMat}
          vertexShader={lineVertex}
          fragmentShader={lineFragment}
          uniforms={lineUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.nodePositions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[data.nodeSeeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={nodeMat}
          vertexShader={nodeVertex}
          fragmentShader={softPointFragment}
          uniforms={nodeUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
