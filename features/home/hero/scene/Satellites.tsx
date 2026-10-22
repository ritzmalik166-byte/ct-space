"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fades, motion } from "@/features/home/lib/store";
import { snoise } from "@/features/home/scene/shaders";

const planetVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
varying vec3 vWorldNormal;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vView = normalize(-mv.xyz);
  vPos = position;
  gl_Position = projectionMatrix * mv;
}
`;

const planetFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uSurface;
uniform vec3 uRim;
uniform vec3 uLightDir;
uniform float uFade;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
varying vec3 vWorldNormal;
${snoise}
void main(){
  vec3 p = normalize(vPos);
  float bands = snoise(vec3(p.x * 1.5, p.y * 7.0, p.z * 1.5) + uTime * 0.05);
  float detail = snoise(p * 6.0 - uTime * 0.03) * 0.35;
  vec3 col = mix(uDeep, uSurface, smoothstep(-0.6, 0.8, bands + detail));
  float light = smoothstep(-0.25, 0.9, dot(normalize(vWorldNormal), uLightDir));
  float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 3.0);
  gl_FragColor = vec4(col * (0.12 + light) + uRim * rim * 1.6, uFade);
}
`;

type PlanetConfig = {
  radius: number;
  size: number;
  speed: number;
  phase: number;
  tilt: [number, number, number];
  deep: string;
  surface: string;
  rim: string;
  ring?: boolean;
};

const PLANETS: PlanetConfig[] = [
  { radius: 3.1, size: 0.16, speed: 0.35, phase: 0.4, tilt: [0.5, 0, 0.25], deep: "#0e1a3a", surface: "#38bdf8", rim: "#67e8f9" },
  { radius: 4.0, size: 0.24, speed: -0.22, phase: 2.6, tilt: [-0.35, 0, -0.3], deep: "#2e1065", surface: "#c084fc", rim: "#f0abfc", ring: true },
  { radius: 5.0, size: 0.11, speed: 0.16, phase: 4.4, tilt: [0.2, 0, 0.55], deep: "#451a03", surface: "#fbbf24", rim: "#fde68a" },
];

function Planet({ config }: { config: PlanetConfig }) {
  const orbit = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(config.deep) },
      uSurface: { value: new THREE.Color(config.surface) },
      uRim: { value: new THREE.Color(config.rim) },
      uLightDir: { value: new THREE.Vector3(-1, 0.2, 0.3).normalize() },
      uFade: fades.hero,
    }),
    [config],
  );

  const center = useMemo(() => new THREE.Vector3(), []);
  const bodyPos = useMemo(() => new THREE.Vector3(), []);

  const material = useRef<THREE.ShaderMaterial>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1) * motion.speed;
    if (!orbit.current || !body.current || !material.current) return;
    const u = material.current.uniforms;
    u.uTime.value += dt;
    orbit.current.rotation.y += dt * config.speed;
    body.current.rotation.y += dt * 0.4;
    orbit.current.getWorldPosition(center);
    body.current.getWorldPosition(bodyPos);
    u.uLightDir.value.subVectors(center, bodyPos).normalize();
  });

  return (
    <group rotation={config.tilt}>
      <group ref={orbit} rotation={[0, config.phase, 0]}>
        <group position={[config.radius, 0, 0]}>
          <mesh ref={body}>
            <icosahedronGeometry args={[config.size, 5]} />
            <shaderMaterial ref={material} vertexShader={planetVertex} fragmentShader={planetFragment} uniforms={uniforms} transparent />
          </mesh>
          {config.ring && (
            <mesh rotation={[Math.PI * 0.42, 0.2, 0]}>
              <ringGeometry args={[config.size * 1.45, config.size * 2.1, 64]} />
              <meshBasicMaterial
                color={config.rim}
                transparent
                opacity={0.35}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}

export function Satellites() {
  return (
    <group>
      {PLANETS.map((p, i) => (
        <Planet key={i} config={p} />
      ))}
    </group>
  );
}
