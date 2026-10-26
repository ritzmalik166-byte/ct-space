"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { fades, flowDraw, view } from "@/features/home/lib/store";
import { FLOW_CENTER, FLOW_FILL, FLOW_RISE, flowHalfWidth } from "@/features/home/scene/journeyPath";

const GOLD = new THREE.Color("#DAAF25");

const gridVertex = /* glsl */ `
varying vec3 vPos;
void main(){
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const gridFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uFade;
uniform float uScan;
varying vec3 vPos;
void main(){
  float falloff = 1.0 - smoothstep(4.0, 14.0, length(vPos.xz));
  float scan = exp(-pow((vPos.x - uScan) * 0.9, 2.0));
  float a = (0.06 + scan * 0.16) * falloff * uFade;
  gl_FragColor = vec4(uColor * a, a);
}
`;

const GRID_POSITIONS = (() => {
  const verts: number[] = [];
  for (let x = -14; x <= 14; x++) verts.push(x, 0, -10, x, 0, 6);
  for (let z = -10; z <= 6; z++) verts.push(-14, 0, z, 14, 0, z);
  return new Float32Array(verts);
})();

/** Blueprint floor the camera flies toward; a scan band follows the timeline's energy pulse. */
export function FlowTimeline() {
  const root = useRef<THREE.LineSegments>(null);
  const grid = useRef<THREE.ShaderMaterial>(null);
  const aspect = useThree((s) => s.size.width / s.size.height);
  const halfWidth = flowHalfWidth(aspect);
  const halfRise = ((FLOW_RISE / 2) * halfWidth) / (FLOW_FILL * aspect);
  const uniforms = useMemo(() => ({ uColor: { value: GOLD }, uFade: fades.flow, uScan: { value: -14 } }), []);

  useFrame(() => {
    const visible = fades.flow.value > 0.002;
    if (root.current) root.current.visible = visible;
    if (visible && grid.current) grid.current.uniforms.uScan.value = (flowDraw(view.flow) * 2 - 1) * halfWidth;
  });

  return (
    <lineSegments
      ref={root}
      position={[FLOW_CENTER.x, FLOW_CENTER.y - halfRise - 1.4, FLOW_CENTER.z]}
      visible={false}
      frustumCulled={false}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[GRID_POSITIONS, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={grid}
        vertexShader={gridVertex}
        fragmentShader={gridFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}
