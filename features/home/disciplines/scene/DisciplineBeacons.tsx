"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { DISC_STOPS, fades, motion, view } from "@/features/home/lib/store";
import { DISC_CAMERA, DISC_FOCUS } from "@/features/home/scene/journeyPath";
import { fresnelFragment, fresnelVertex, glowFragment, glowVertex } from "@/features/home/scene/shaders";

const SPACING = 2.6;
const COLOR = new THREE.Color("#22d3ee");
const CORE_COLOR = new THREE.Color("#a5f3fc");

function Beacon({ index, position }: { index: number; position: THREE.Vector3 }) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.ShaderMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);

  const haloUniforms = useMemo(
    () => ({ uColor: { value: COLOR }, uIntensity: { value: 0 }, uFade: fades.disc }),
    [],
  );
  const coreUniforms = useMemo(
    () => ({
      uColor: { value: CORE_COLOR },
      uPower: { value: 1.6 },
      uIntensity: { value: 1.5 },
      uInvert: { value: 1 },
      uFade: fades.disc,
    }),
    [],
  );

  useFrame((state, delta) => {
    const lit = THREE.MathUtils.smoothstep(view.disc, DISC_STOPS[index] - 0.04, DISC_STOPS[index] + 0.04);
    const t = state.clock.elapsedTime * motion.speed;
    const pulse = 0.85 + Math.sin(t * 1.6 + index * 1.3) * 0.15;
    if (halo.current) halo.current.uniforms.uIntensity.value = (0.15 + lit * 0.75) * pulse;
    if (group.current) {
      group.current.position.y = position.y + Math.sin(t * 0.8 + index) * 0.08;
      group.current.scale.setScalar(0.6 + lit * 0.4);
    }
    if (ring.current) {
      ring.current.rotation.z += Math.min(delta, 0.1) * motion.speed * 0.6;
      (ring.current.material as THREE.MeshBasicMaterial).opacity = lit * 0.6 * fades.disc.value;
    }
  });

  return (
    <group ref={group} position={position}>
      <Billboard>
        <mesh>
          <planeGeometry args={[3.2, 3.2]} />
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
          <ringGeometry args={[0.36, 0.38, 48, 1, 0, Math.PI * 1.5]} />
          <meshBasicMaterial color={COLOR} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </Billboard>
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
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

export function DisciplineBeacons() {
  const root = useRef<THREE.Group>(null);

  const positions = useMemo(() => {
    const forward = DISC_FOCUS.clone().sub(DISC_CAMERA).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(forward, THREE.Object3D.DEFAULT_UP).normalize();
    return DISC_STOPS.map((_, i) =>
      DISC_FOCUS.clone()
        .addScaledVector(right, (i - (DISC_STOPS.length - 1) / 2) * SPACING)
        .add(new THREE.Vector3(0, -0.4, 0)),
    );
  }, []);

  useFrame(() => {
    if (root.current) root.current.visible = fades.disc.value > 0.002;
  });

  return (
    <group ref={root} visible={false}>
      {positions.map((p, i) => (
        <Beacon key={i} index={i} position={p} />
      ))}
    </group>
  );
}
