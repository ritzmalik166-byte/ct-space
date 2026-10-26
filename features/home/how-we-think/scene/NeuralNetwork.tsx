"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { fades, motion, mulberry32, netAt, STEP_CARD_WIDTH, STEP_STOPS, stepCards, view } from "@/features/home/lib/store";
import { JOURNEY_PATH, LOOK_AHEAD } from "@/features/home/scene/journeyPath";
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
/** World-space width of a step video card at rest (the ring it replaced was 0.9 across). */
const CARD_WORLD_WIDTH = 1.8;
/**
 * A step's copy is fully visible from 9svh before its stop to 28svh after (see HowWeThink's timeline),
 * so the card holds its docked slot across that window and blends in/out over DOCK_BLEND either side.
 */
const DOCK_CENTER = netAt(9);
const DOCK_HOLD = netAt(18);
const DOCK_BLEND = netAt(23);
const FOCUS_NEAR = netAt(9);
const FOCUS_FAR = netAt(64);
/** Path distance between the camera and a step's key node when that step is centred. */
const KEY_NODE_AHEAD = 0.12;

/** 0 while the card follows its node, 1 while it sits in the fixed slot. */
function dockAmount(progress: number, index: number) {
  const offset = Math.abs(progress - STEP_STOPS[index] - DOCK_CENTER);
  return THREE.MathUtils.smootherstep(1 - THREE.MathUtils.clamp((offset - DOCK_HOLD) / DOCK_BLEND, 0, 1), 0, 1);
}

function KeyNode({ index, position }: { index: number; position: THREE.Vector3 }) {
  const halo = useRef<THREE.ShaderMaterial>(null);
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

  const projected = useMemo(() => new THREE.Vector3(), []);
  const cardShown = useRef(false);

  useFrame((state, delta) => {
    const focus = 1 - THREE.MathUtils.smoothstep(Math.abs(view.net - STEP_STOPS[index]), FOCUS_NEAR, FOCUS_FAR);
    if (halo.current) halo.current.uniforms.uIntensity.value = 0.25 + focus * 0.85;
    const g = group.current;
    if (!g) return;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, 1 + focus * 0.35, 4, delta));

    // The video card takes the ring's place: pinned to this node on screen, sized by distance and focus.
    const card = stepCards[index];
    if (!card) return;
    const video = card.querySelector("video");
    const dock = dockAmount(view.net, index);
    // Another step's docked card owns the stage: the flying ones clear out so nothing shows behind it.
    let otherDock = 0;
    for (let i = 0; i < STEP_STOPS.length; i++) if (i !== index) otherDock = Math.max(otherDock, dockAmount(view.net, i));
    // The network shows behind other sections too; the cards belong to "How we think" only.
    const { smoothstep } = THREE.MathUtils;
    const inPhase = smoothstep(view.net, 0.01, 0.06) * (1 - smoothstep(view.net, 0.95, 1)) * (1 - smoothstep(view.tv, 0, 0.05));
    const opacity = Math.max(0.2 + focus * 0.8, dock) * (1 - otherDock * (1 - dock)) * fades.network.value * inPhase;
    const camera = state.camera as THREE.PerspectiveCamera;
    g.getWorldPosition(projected);
    const distance = projected.distanceTo(camera.position);
    projected.project(camera);
    const onScreen = projected.z <= 1 && Math.abs(projected.x) <= 1.6 && Math.abs(projected.y) <= 1.6;

    if (opacity < 0.01 || (!onScreen && dock < 0.99)) {
      if (cardShown.current) {
        card.style.visibility = "hidden";
        video?.pause();
        cardShown.current = false;
      }
      return;
    }

    const { width, height } = state.size;
    const pxPerUnit = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance);
    const flyScale = (CARD_WORLD_WIDTH * g.scale.x * pxPerUnit) / STEP_CARD_WIDTH;
    const flyX = (projected.x * 0.5 + 0.5) * width;
    const flyY = (-projected.y * 0.5 + 0.5) * height;

    // While the step's copy is fully on screen the card parks in a fixed slot, then rejoins its node.
    const desktop = width >= 1024;
    const dockScale = Math.min(desktop ? STEP_CARD_WIDTH : width * 0.7, STEP_CARD_WIDTH) / STEP_CARD_WIDTH;
    const dockX = desktop ? width * 0.73 : width / 2;
    const dockY = desktop ? height / 2 : height * 0.3;
    const { lerp } = THREE.MathUtils;
    const x = lerp(flyX, dockX, dock);
    const y = lerp(flyY, dockY, dock);
    const scale = lerp(flyScale, dockScale, dock);
    card.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`;
    card.style.opacity = String(opacity);
    card.style.zIndex = dock > 0.5 ? "1" : "0";
    if (!cardShown.current) {
      card.style.visibility = "visible";
      cardShown.current = true;
    }

    if (video && !motion.reduced) {
      const live = focus > 0.35 || dock > 0.5;
      if (live && video.paused) video.play().catch(() => {});
      else if (!live && !video.paused) video.pause();
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
      // Mirrors CameraRig's path easing so each node sits the same distance ahead of the camera at its stop.
      const cameraAt = ((1 - Math.cos(Math.PI * stop)) / 2) * (1 - LOOK_AHEAD);
      const p = JOURNEY_PATH.getPointAt(Math.min(cameraAt + KEY_NODE_AHEAD, 1));
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
