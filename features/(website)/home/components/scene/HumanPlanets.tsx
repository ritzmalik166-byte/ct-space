"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Color, Euler, MathUtils, Quaternion, SphereGeometry, Vector3, type Group, type ShaderMaterial } from "three";
import { ADDITIVE_GLOW } from "../../lib/heroBlending";
import type { HeroFxController } from "../../lib/heroSceneFx";
import { atmosphereFragment, atmosphereVertex, planetFragment, planetVertex } from "../../lib/shaders/planet";

interface BodySpec {
  kind: "rocky" | "gas";
  radius: number;
  /** Screen-aligned character-local position (x right, y up, z toward camera). */
  position: [number, number, number];
  colors: [string, string, string];
  atmosphere: string;
  atmosphereStrength: number;
  craters?: number;
  spin: number;
  seed: number;
  tilt: number;
  /** Peak opacity; the moon stays low-contrast behind the character. */
  opacity: number;
}

/** One deep-blue gas giant and one distant moon, clear of the face and the text column. */
const DESKTOP: BodySpec[] = [
  {
    kind: "gas",
    radius: 1.05,
    position: [3.85, 2.75, -3.2],
    colors: ["#141631", "#3b3f74", "#a8a3cf"],
    atmosphere: "#9a8cff",
    atmosphereStrength: 0.7,
    spin: 0.012,
    seed: 5.3,
    tilt: 0.38,
    opacity: 0.95,
  },
  {
    kind: "rocky",
    radius: 0.24,
    position: [-2.2, 3.35, -4.2],
    colors: ["#3a3848", "#8c88a2", "#1a1924"],
    atmosphere: "#b7adff",
    atmosphereStrength: 0.22,
    craters: 1.3,
    spin: 0.02,
    seed: 17.9,
    tilt: 0.1,
    opacity: 0.6,
  },
];

const MOBILE: BodySpec[] = [
  { ...DESKTOP[0], radius: 0.8, position: [2.75, 2.85, -3.4] },
  { ...DESKTOP[1], radius: 0.2, position: [-2.6, 2.6, -4.2] },
];

/** Same left key as the particle-human, in screen space. */
const KEY_LIGHT = new Vector3(-0.88, 0.32, 0.36).normalize();

function CelestialBody({ spec, sphere, fx, reduceMotion }: { spec: BodySpec; sphere: SphereGeometry; fx: HeroFxController; reduceMotion: boolean }) {
  const groupRef = useRef<Group>(null);
  const planetRef = useRef<ShaderMaterial>(null);
  const haloRef = useRef<ShaderMaterial>(null);

  const { base, orientation, planetUniforms, haloUniforms } = useMemo(() => {
    const atmo = new Color(spec.atmosphere);
    return {
      base: new Vector3(...spec.position),
      orientation: new Quaternion().setFromEuler(new Euler(0.32, 0, spec.tilt)),
      planetUniforms: {
        uTime: { value: 0 },
        uSpin: { value: spec.spin },
        uSeed: { value: spec.seed },
        uKind: { value: spec.kind === "rocky" ? 0 : 1 },
        uOpacity: { value: 0 },
        uLightDir: { value: KEY_LIGHT.clone() },
        uColorA: { value: new Color(spec.colors[0]) },
        uColorB: { value: new Color(spec.colors[1]) },
        uColorC: { value: new Color(spec.colors[2]) },
        uAtmo: { value: atmo },
        uAtmoStrength: { value: spec.atmosphereStrength },
        uCraters: { value: spec.craters ?? 0 },
      },
      haloUniforms: {
        uAtmo: { value: atmo },
        uLightDir: { value: KEY_LIGHT.clone() },
        uStrength: { value: spec.atmosphereStrength * 0.85 },
        uOpacity: { value: 0 },
      },
    };
  }, [spec]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const presence = fx.robotPresence;
    group.visible = presence > 0.001;
    if (!group.visible) return;
    const t = reduceMotion ? 0 : state.clock.elapsedTime;
    // Recede slightly while (dis)appearing; a very slow drift when settled.
    group.position.copy(base).multiplyScalar(1 + (1 - presence) * 0.18);
    group.position.y += Math.sin(t * 0.07 + spec.seed) * 0.04;
    group.scale.setScalar(spec.radius * MathUtils.lerp(0.88, 1, presence));
    const opacity = presence * presence * spec.opacity;
    const planet = planetRef.current;
    if (planet) {
      planet.uniforms.uTime.value = t;
      planet.uniforms.uOpacity.value = opacity;
    }
    const halo = haloRef.current;
    if (halo) halo.uniforms.uOpacity.value = opacity;
  });

  return (
    <group ref={groupRef} quaternion={orientation} visible={false}>
      <mesh geometry={sphere} renderOrder={-3}>
        <shaderMaterial
          ref={planetRef}
          vertexShader={planetVertex}
          fragmentShader={planetFragment}
          uniforms={planetUniforms}
          transparent
        />
      </mesh>
      <mesh geometry={sphere} scale={1.08} renderOrder={-2}>
        <shaderMaterial
          ref={haloRef}
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
          uniforms={haloUniforms}
          side={BackSide}
          {...ADDITIVE_GLOW}
        />
      </mesh>
    </group>
  );
}

interface HumanPlanetsProps {
  fx: HeroFxController;
  reduceMotion: boolean;
  isMobile: boolean;
}

/**
 * The character state's cosmic environment: a primary planet and a distant
 * moon, authored screen-aligned in the rig's static stage (placed with the
 * character, never rotated by it) and faded with its scroll presence.
 */
export default function HumanPlanets({ fx, reduceMotion, isMobile }: HumanPlanetsProps) {
  const sphere = useMemo(() => (isMobile ? new SphereGeometry(1, 48, 32) : new SphereGeometry(1, 96, 64)), [isMobile]);
  const bodies = isMobile ? MOBILE : DESKTOP;

  return (
    <>
      {bodies.map((spec) => (
        <CelestialBody key={spec.seed} spec={spec} sphere={sphere} fx={fx} reduceMotion={reduceMotion} />
      ))}
    </>
  );
}
