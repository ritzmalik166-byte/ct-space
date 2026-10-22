"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { fades, mulberry32, view } from "@/features/home/lib/store";
import { FLOW_CENTER, FLOW_FILL, FLOW_RISE, flowHalfWidth } from "@/features/home/scene/journeyPath";

const BLOCKS = 16;
const CYAN = new THREE.Color("#22d3ee");

/** Unit-box edges as [x, y, z] corners; y is 0 (base) or 1 (roof) and gets scaled in the shader. */
const BOX_EDGES: [number, number, number][][] = (() => {
  const c = (x: number, y: number, z: number): [number, number, number] => [x, y, z];
  const edges: [number, number, number][][] = [];
  for (const y of [0, 1]) {
    edges.push([c(-1, y, -1), c(1, y, -1)], [c(1, y, -1), c(1, y, 1)], [c(1, y, 1), c(-1, y, 1)], [c(-1, y, 1), c(-1, y, -1)]);
  }
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    edges.push([c(x, 0, z), c(x, 1, z)]);
  }
  return edges;
})();

const vertex = /* glsl */ `
uniform float uRise;
attribute float aHeight;
attribute float aDelay;
varying float vTop;
void main(){
  float grow = clamp(uRise * 1.7 - aDelay * 0.7, 0.0, 1.0);
  grow = grow * grow * (3.0 - 2.0 * grow);
  vec3 p = vec3(position.x, position.y * aHeight * grow, position.z);
  vTop = position.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform float uFade;
varying float vTop;
void main(){
  float a = (0.22 + vTop * 0.5) * uFade;
  gl_FragColor = vec4(uColor * a, a);
}
`;

/** Wireframe blocks that grow out of the blueprint floor for the "Spaces That Inspire" section. */
export function SpaceBlocks() {
  const root = useRef<THREE.LineSegments>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const aspect = useThree((s) => s.size.width / s.size.height);
  const halfWidth = flowHalfWidth(aspect);
  const floorY = FLOW_CENTER.y - ((FLOW_RISE / 2) * halfWidth) / (FLOW_FILL * aspect) - 1.4;

  const { positions, heights, delays } = useMemo(() => {
    const rand = mulberry32(57);
    const verts = BLOCKS * BOX_EDGES.length * 2;
    const positions = new Float32Array(verts * 3);
    const heights = new Float32Array(verts);
    const delays = new Float32Array(verts);
    let v = 0;
    for (let b = 0; b < BLOCKS; b++) {
      const cx = Math.round((rand() - 0.5) * 12);
      const cz = Math.round(-rand() * 9 + 2);
      const sx = 0.35 + rand() * 0.5;
      const sz = 0.35 + rand() * 0.5;
      const h = 0.6 + rand() * rand() * 3.4;
      const delay = rand();
      for (const edge of BOX_EDGES) {
        for (const [x, y, z] of edge) {
          positions.set([cx + x * sx, y, cz + z * sz], v * 3);
          heights[v] = h;
          delays[v] = delay;
          v++;
        }
      }
    }
    return { positions, heights, delays };
  }, []);

  const uniforms = useMemo(() => ({ uColor: { value: CYAN }, uFade: fades.space, uRise: { value: 0 } }), []);

  useFrame(() => {
    const visible = fades.space.value > 0.002;
    if (root.current) root.current.visible = visible;
    if (visible && material.current) {
      material.current.uniforms.uRise.value = THREE.MathUtils.smoothstep(view.space, 0.1, 0.42);
    }
  });

  return (
    <lineSegments
      ref={root}
      position={[FLOW_CENTER.x, floorY, FLOW_CENTER.z]}
      visible={false}
      frustumCulled={false}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aHeight" args={[heights, 1]} />
        <bufferAttribute attach="attributes-aDelay" args={[delays, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}
