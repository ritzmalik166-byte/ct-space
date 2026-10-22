"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { fades, motion, mulberry32 } from "@/features/home/lib/store";
import { fresnelFragment, fresnelVertex, snoise } from "@/features/home/scene/shaders";

const coreVertex = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
attribute float aRandom;
varying float vNoise;
varying float vAlpha;
varying float vScan;
${snoise}
void main(){
  vec3 dir = normalize(position);
  float n = snoise(position * 1.7 + vec3(0.0, uTime * 0.22, uTime * 0.12));
  float breathe = sin(uTime * 1.4 + aRandom * 6.2831) * 0.5 + 0.5;
  vec3 p = position + dir * (n * 0.2 + breathe * 0.025);

  float scanY = sin(uTime * 0.55) * 1.15;
  vScan = smoothstep(0.14, 0.0, abs(p.y - scanY));

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio * (0.55 + aRandom * 0.9) * (1.0 + vScan * 0.8) / -mv.z;

  vNoise = n;
  vAlpha = 0.35 + breathe * 0.65;
}
`;

const coreFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uFade;
varying float vNoise;
varying float vAlpha;
varying float vScan;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = pow(1.0 - d * 2.0, 2.2);
  vec3 col = mix(uColorA, uColorB, smoothstep(-0.45, 0.55, vNoise));
  col = mix(col, uColorC, smoothstep(0.5, 0.9, vNoise));
  col = mix(col, vec3(1.0), vScan * 0.7);
  gl_FragColor = vec4(col, a * vAlpha * uFade);
}
`;

const haloFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uIntensity;
uniform float uFade;
varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(max(1.0 - d, 0.0), 2.6) * uIntensity * uFade;
  gl_FragColor = vec4(mix(uColorA, uColorB, d) * a, a);
}
`;

const uvVertex = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export function NeuralCore({ count }: { count: number }) {
  const spin = useRef<THREE.Group>(null);
  const wire = useRef<THREE.LineSegments>(null);

  const { positions, randoms } = useMemo(() => {
    const rand = mulberry32(7);
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;
      randoms[i] = rand();
    }
    return { positions, randoms };
  }, [count]);

  const wireGeometry = useMemo(() => {
    const source = new THREE.IcosahedronGeometry(1.5, 1);
    const edges = new THREE.EdgesGeometry(source);
    source.dispose();
    return edges;
  }, []);

  useEffect(() => () => wireGeometry.dispose(), [wireGeometry]);

  const coreUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 34 },
      uPixelRatio: { value: 1 },
      uColorA: { value: new THREE.Color("#22d3ee") },
      uColorB: { value: new THREE.Color("#8b5cf6") },
      uColorC: { value: new THREE.Color("#fde68a") },
      uFade: fades.hero,
    }),
    [],
  );

  const innerUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#a5f3fc") },
      uPower: { value: 2.0 },
      uIntensity: { value: 1.4 },
      uInvert: { value: 1 },
      uFade: fades.hero,
    }),
    [],
  );

  const shellUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#7c3aed") },
      uPower: { value: 2.6 },
      uIntensity: { value: 0.9 },
      uInvert: { value: 0 },
      uFade: fades.hero,
    }),
    [],
  );

  const haloUniforms = useMemo(
    () => ({
      uColorA: { value: new THREE.Color("#22d3ee") },
      uColorB: { value: new THREE.Color("#6d28d9") },
      uIntensity: { value: 0.45 },
      uFade: fades.hero,
    }),
    [],
  );

  const coreMat = useRef<THREE.ShaderMaterial>(null);
  const innerMat = useRef<THREE.ShaderMaterial>(null);
  const haloMat = useRef<THREE.ShaderMaterial>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1) * motion.speed;
    if (!coreMat.current || !innerMat.current || !haloMat.current) return;
    const core = coreMat.current.uniforms;
    const t = (core.uTime.value += dt);
    core.uPixelRatio.value = state.gl.getPixelRatio();
    innerMat.current.uniforms.uIntensity.value = 1.2 + Math.sin(t * 2.2) * 0.35;
    haloMat.current.uniforms.uIntensity.value = 0.4 + Math.sin(t * 1.1) * 0.08;
    if (spin.current) spin.current.rotation.y += dt * 0.12;
    if (wire.current) {
      wire.current.rotation.x -= dt * 0.05;
      wire.current.rotation.y -= dt * 0.08;
      (wire.current.material as THREE.LineBasicMaterial).opacity = 0.12 * fades.hero.value;
    }
  });

  return (
    <group>
      <Billboard>
        <mesh renderOrder={-1}>
          <planeGeometry args={[8, 8]} />
          <shaderMaterial
            ref={haloMat}
            vertexShader={uvVertex}
            fragmentShader={haloFragment}
            uniforms={haloUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Billboard>

      <group ref={spin} scale={1.15}>
        <points frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
          </bufferGeometry>
          <shaderMaterial
            ref={coreMat}
            vertexShader={coreVertex}
            fragmentShader={coreFragment}
            uniforms={coreUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>

      <mesh>
        <sphereGeometry args={[0.42, 32, 32]} />
        <shaderMaterial
          ref={innerMat}
          vertexShader={fresnelVertex}
          fragmentShader={fresnelFragment}
          uniforms={innerUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.32, 48, 48]} />
        <shaderMaterial
          vertexShader={fresnelVertex}
          fragmentShader={fresnelFragment}
          uniforms={shellUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <lineSegments ref={wire} geometry={wireGeometry}>
        <lineBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}
