"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { fades, motion, mulberry32, STEP_STOPS, view } from "@/features/home/lib/store";
import { JOURNEY_PATH } from "@/features/home/scene/journeyPath";
import {
  fresnelFragment,
  fresnelVertex,
  glowFragment,
  glowVertex,
} from "@/features/home/scene/shaders";

const LINK_DISTANCE = 3.2;
const NEIGHBOURS = 3;

const fog = /* glsl */ `
float depthFade(float depth){
  return smoothstep(22.0, 6.0, depth) * smoothstep(0.25, 1.6, depth);
}
`;

const linkVertex = /* glsl */ `
attribute float aT;
attribute float aSeed;
varying float vT;
varying float vSeed;
varying float vDepth;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vT = aT;
  vSeed = aSeed;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const linkFragment = /* glsl */ `
uniform float uTime;
uniform float uFade;
uniform vec3 uColor;
uniform vec3 uPulse;
varying float vT;
varying float vSeed;
varying float vDepth;
${fog}
void main(){
  float speed = 0.18 + fract(vSeed * 3.7) * 0.35;
  float head = fract(uTime * speed + vSeed * 9.0) * 1.5;
  float t = mix(vT, 1.0 - vT, step(0.5, fract(vSeed * 7.13)));
  float d = head - t;
  float glow = step(0.0, d) * pow(max(1.0 - d / 0.25, 0.0), 2.0);
  glow *= step(0.45, fract(vSeed * 13.7));
  vec3 col = mix(uColor, uPulse, glow);
  gl_FragColor = vec4(col, (0.08 + glow) * depthFade(vDepth) * uFade);
}
`;

const nodeVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSeed;
varying float vSeed;
varying float vDepth;
varying float vPulse;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vPulse = sin(uTime * (0.8 + aSeed * 2.0) + aSeed * 40.0) * 0.5 + 0.5;
  gl_PointSize = min((28.0 + vPulse * 36.0 + aSeed * 20.0) * uPixelRatio / -mv.z, 72.0 * uPixelRatio);
  vSeed = aSeed;
  vDepth = -mv.z;
}
`;

const nodeFragment = /* glsl */ `
uniform float uFade;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
varying float vSeed;
varying float vDepth;
varying float vPulse;
${fog}
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float core = smoothstep(0.18, 0.0, d);
  float halo = pow(1.0 - d * 2.0, 2.5) * 0.6;
  vec3 col = mix(uColorA, uColorB, vSeed);
  col = mix(col, uColorC, step(0.92, vSeed));
  col = mix(col, vec3(1.0), core * 0.6);
  gl_FragColor = vec4(col, (core + halo) * (0.45 + vPulse * 0.55) * depthFade(vDepth) * uFade);
}
`;

const dustVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSeed;
varying float vDepth;
varying float vSeed;
void main(){
  vec3 p = position;
  p.x += sin(uTime * 0.25 + aSeed * 30.0) * 0.35;
  p.y += cos(uTime * 0.2 + aSeed * 50.0) * 0.35;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (6.0 + aSeed * 10.0) * uPixelRatio / -mv.z;
  vDepth = -mv.z;
  vSeed = aSeed;
}
`;

const dustFragment = /* glsl */ `
uniform float uFade;
varying float vDepth;
varying float vSeed;
${fog}
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  vec3 col = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.9, 0.7), step(0.7, vSeed));
  gl_FragColor = vec4(col, pow(1.0 - d * 2.0, 2.0) * 0.55 * depthFade(vDepth) * uFade);
}
`;

const LIGHTS: { t: number; offset: [number, number, number]; color: string; size: number; intensity: number }[] = [
  { t: 0.08, offset: [-4, 2.5, -3], color: "#6d28d9", size: 16, intensity: 0.35 },
  { t: 0.3, offset: [5, -2, -4], color: "#0e7490", size: 18, intensity: 0.3 },
  { t: 0.52, offset: [-5, -1.5, -5], color: "#b45309", size: 14, intensity: 0.22 },
  { t: 0.74, offset: [4.5, 2.5, -4], color: "#7c3aed", size: 18, intensity: 0.32 },
  { t: 0.95, offset: [0, 0, -8], color: "#fde68a", size: 20, intensity: 0.28 },
];

const KEY_COLORS = ["#67e8f9", "#c084fc", "#fde68a", "#f0abfc"];

function KeyNode({ index, position }: { index: number; position: THREE.Vector3 }) {
  const halo = useRef<THREE.ShaderMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);

  const haloUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(KEY_COLORS[index]) },
      uIntensity: { value: 0.3 },
      uFade: fades.network,
    }),
    [index],
  );

  const coreUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(KEY_COLORS[index]).lerp(new THREE.Color("#ffffff"), 0.5) },
      uPower: { value: 1.6 },
      uIntensity: { value: 1.6 },
      uInvert: { value: 1 },
      uFade: fades.network,
    }),
    [index],
  );

  useFrame((_, delta) => {
    const focus = 1 - THREE.MathUtils.smoothstep(Math.abs(view.net - STEP_STOPS[index]), 0.02, 0.14);
    if (halo.current) halo.current.uniforms.uIntensity.value = 0.25 + focus * 0.85;
    if (group.current) group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, 1 + focus * 0.35, 4, delta));
    if (ring.current) {
      ring.current.rotation.z += Math.min(delta, 0.1) * motion.speed * (0.4 + focus);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (0.15 + focus * 0.55) * fades.network.value;
    }
  });

  return (
    <group ref={group} position={position}>
      <Billboard>
        <mesh>
          <planeGeometry args={[4.5, 4.5]} />
          <shaderMaterial
            ref={halo}
            vertexShader={glowVertex}
            fragmentShader={glowFragment}
            uniforms={haloUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh ref={ring}>
          <ringGeometry args={[0.42, 0.45, 64, 1, 0, Math.PI * 1.6]} />
          <meshBasicMaterial
            color={KEY_COLORS[index]}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Billboard>
      <mesh>
        <sphereGeometry args={[0.16, 24, 24]} />
        <shaderMaterial
          vertexShader={fresnelVertex}
          fragmentShader={fresnelFragment}
          uniforms={coreUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export function NeuralNetwork({
  nodes,
  dust,
  glows = LIGHTS.length,
  keyNodes = true,
}: {
  nodes: number;
  dust: number;
  glows?: number;
  keyNodes?: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const linkMat = useRef<THREE.ShaderMaterial>(null);
  const nodeMat = useRef<THREE.ShaderMaterial>(null);
  const dustMat = useRef<THREE.ShaderMaterial>(null);
  const width = useThree((s) => s.size.width);

  const data = useMemo(() => {
    const rand = mulberry32(2027);
    const point = new THREE.Vector3();
    const positions = new Float32Array(nodes * 3);
    const seeds = new Float32Array(nodes);

    for (let i = 0; i < nodes; i++) {
      JOURNEY_PATH.getPointAt(rand(), point);
      const angle = rand() * Math.PI * 2;
      const radius = 1.3 + Math.pow(rand(), 0.7) * 6.5;
      positions[i * 3] = point.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = point.y + Math.sin(angle) * radius * 0.75;
      positions[i * 3 + 2] = point.z + (rand() - 0.5) * 2.5;
      seeds[i] = rand();
    }

    const maxDistSq = LINK_DISTANCE * LINK_DISTANCE;
    const seen = new Set<number>();
    const linkPos: number[] = [];
    const linkT: number[] = [];
    const linkSeed: number[] = [];
    const best = new Array<{ j: number; d: number }>();

    for (let i = 0; i < nodes; i++) {
      best.length = 0;
      const ax = positions[i * 3], ay = positions[i * 3 + 1], az = positions[i * 3 + 2];
      for (let j = 0; j < nodes; j++) {
        if (j === i) continue;
        const dx = positions[j * 3] - ax, dy = positions[j * 3 + 1] - ay, dz = positions[j * 3 + 2] - az;
        const d = dx * dx + dy * dy + dz * dz;
        if (d > maxDistSq) continue;
        if (best.length < NEIGHBOURS) best.push({ j, d });
        else if (d < best[NEIGHBOURS - 1].d) best[NEIGHBOURS - 1] = { j, d };
        else continue;
        best.sort((a, b) => a.d - b.d);
      }
      for (const { j } of best) {
        const key = i < j ? i * nodes + j : j * nodes + i;
        if (seen.has(key)) continue;
        seen.add(key);
        const seed = rand();
        linkPos.push(ax, ay, az, positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
        linkT.push(0, 1);
        linkSeed.push(seed, seed);
      }
    }

    const dustPositions = new Float32Array(dust * 3);
    const dustSeeds = new Float32Array(dust);
    for (let i = 0; i < dust; i++) {
      JOURNEY_PATH.getPointAt(rand(), point);
      const angle = rand() * Math.PI * 2;
      const radius = 0.4 + rand() * 7;
      dustPositions[i * 3] = point.x + Math.cos(angle) * radius;
      dustPositions[i * 3 + 1] = point.y + Math.sin(angle) * radius;
      dustPositions[i * 3 + 2] = point.z + (rand() - 0.5) * 3;
      dustSeeds[i] = rand();
    }

    return {
      positions,
      seeds,
      linkPos: new Float32Array(linkPos),
      linkT: new Float32Array(linkT),
      linkSeed: new Float32Array(linkSeed),
      dustPositions,
      dustSeeds,
    };
  }, [nodes, dust]);

  const keyPositions = useMemo(() => {
    const side = width >= 1024 ? 1.5 : 0;
    const lift = width >= 1024 ? 0.1 : 0.55;
    return STEP_STOPS.map((stop) => {
      const p = JOURNEY_PATH.getPointAt(Math.min(stop + 0.06, 1));
      return p.add(new THREE.Vector3(side, lift, 0));
    });
  }, [width]);

  const lights = useMemo(
    () =>
      LIGHTS.filter((_, i) => i % Math.ceil(LIGHTS.length / Math.max(glows, 1)) === 0).map((l) => ({
        ...l,
        position: JOURNEY_PATH.getPointAt(l.t).add(new THREE.Vector3(...l.offset)),
        uniforms: {
          uColor: { value: new THREE.Color(l.color) },
          uIntensity: { value: l.intensity },
          uFade: fades.network,
        },
      })),
    [glows],
  );

  const linkUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFade: fades.network,
      uColor: { value: new THREE.Color("#38bdf8") },
      uPulse: { value: new THREE.Color("#fef3c7") },
    }),
    [],
  );

  const nodeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uFade: fades.network,
      uColorA: { value: new THREE.Color("#67e8f9") },
      uColorB: { value: new THREE.Color("#a78bfa") },
      uColorC: { value: new THREE.Color("#fde68a") },
    }),
    [],
  );

  const dustUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 }, uFade: fades.network }),
    [],
  );

  useFrame((state, delta) => {
    const g = root.current;
    if (!g) return;
    g.visible = fades.network.value > 0.002;
    if (!g.visible) return;
    const dt = Math.min(delta, 0.1) * motion.speed;
    const pr = state.gl.getPixelRatio();
    if (linkMat.current) linkMat.current.uniforms.uTime.value += dt;
    if (nodeMat.current) {
      nodeMat.current.uniforms.uTime.value += dt;
      nodeMat.current.uniforms.uPixelRatio.value = pr;
    }
    if (dustMat.current) {
      dustMat.current.uniforms.uTime.value += dt;
      dustMat.current.uniforms.uPixelRatio.value = pr;
    }
  });

  return (
    <group ref={root} visible={false}>
      {lights.map((l, i) => (
        <Billboard key={i} position={l.position}>
          <mesh renderOrder={-1}>
            <planeGeometry args={[l.size, l.size]} />
            <shaderMaterial
              vertexShader={glowVertex}
              fragmentShader={glowFragment}
              uniforms={l.uniforms}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </Billboard>
      ))}

      <lineSegments frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.linkPos, 3]} />
          <bufferAttribute attach="attributes-aT" args={[data.linkT, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[data.linkSeed, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={linkMat}
          vertexShader={linkVertex}
          fragmentShader={linkFragment}
          uniforms={linkUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[data.seeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={nodeMat}
          vertexShader={nodeVertex}
          fragmentShader={nodeFragment}
          uniforms={nodeUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.dustPositions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[data.dustSeeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={dustMat}
          vertexShader={dustVertex}
          fragmentShader={dustFragment}
          uniforms={dustUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {keyNodes && keyPositions.map((p, i) => <KeyNode key={i} index={i} position={p} />)}
    </group>
  );
}
