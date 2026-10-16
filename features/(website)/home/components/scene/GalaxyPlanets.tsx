"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  Euler,
  MathUtils,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Group,
  type Mesh,
  type ShaderMaterial,
} from "three";
import { HERO_SCENE_KEYFRAMES, type HeroSceneState } from "../../lib/heroSceneState";
import {
  atmosphereFragment,
  atmosphereVertex,
  planetFragment,
  planetVertex,
  ringFragment,
  ringVertex,
} from "../../lib/shaders/planet";

interface PlanetSpec {
  kind: "rocky" | "gas";
  radius: number;
  /** Rig-local position as seen in the galaxy state (x right, y up, z toward camera). */
  anchor: [number, number, number];
  colors: [string, string, string];
  atmosphere: string;
  atmosphereStrength: number;
  craters?: number;
  spin: number;
  seed: number;
  tilt: number;
  orbit: { range: number; speed: number };
  ring?: { inner: number; outer: number; colors: [string, string]; tilt: number };
  desktopOnly?: boolean;
}

/** Deliberately uneven: different sizes, depths and lighting angles. */
const PLANETS: PlanetSpec[] = [
  {
    kind: "rocky",
    radius: 0.19,
    anchor: [1.9, 2.55, 0.6],
    colors: ["#56688a", "#aebfd8", "#262f47"],
    atmosphere: "#7fd8ff",
    atmosphereStrength: 0.85,
    craters: 1,
    spin: 0.05,
    seed: 3.1,
    tilt: 0.35,
    orbit: { range: 0.07, speed: 0.021 },
  },
  {
    kind: "gas",
    radius: 0.3,
    anchor: [2.35, -2.3, -1.2],
    colors: ["#2a2550", "#66609e", "#c4cae6"],
    atmosphere: "#9a86ff",
    atmosphereStrength: 0.7,
    spin: 0.025,
    seed: 7.4,
    tilt: -0.32,
    orbit: { range: 0.05, speed: 0.013 },
    ring: { inner: 1.45, outer: 2.3, colors: ["#5d5a92", "#c3c8e6"], tilt: 0.1 },
    desktopOnly: true,
  },
  {
    kind: "rocky",
    radius: 0.085,
    anchor: [-0.55, -2.85, 1.5],
    colors: ["#3a3e49", "#727887", "#1d2027"],
    atmosphere: "#9fb6ff",
    atmosphereStrength: 0.3,
    craters: 1.4,
    spin: 0.08,
    seed: 12.9,
    tilt: 0.1,
    orbit: { range: 0.09, speed: 0.03 },
    desktopOnly: true,
  },
  {
    kind: "gas",
    radius: 0.06,
    anchor: [-2.1, 2.85, -2.6],
    colors: ["#174d63", "#4aa9c0", "#bfe9f2"],
    atmosphere: "#5fe6ff",
    atmosphereStrength: 0.55,
    spin: 0.04,
    seed: 21.7,
    tilt: 0.5,
    orbit: { range: 0.06, speed: 0.017 },
  },
];

/** Scroll progress over which the planets recede as the morph begins. */
const FADE_END = 0.16;
const KEY_LIGHT = new Vector3(0.55, 0.45, 0.7).normalize();
const UP = new Vector3(0, 1, 0);

const { rotX, rotY, rotZ } = HERO_SCENE_KEYFRAMES.galaxy;
/** Undoes the galaxy keyframe tilt so specs can be authored screen-aligned. */
const SCREEN_TO_GALAXY = new Quaternion().setFromEuler(new Euler(rotX, rotY, rotZ, "ZXY")).invert();

interface PlanetProps {
  spec: PlanetSpec;
  sphere: BufferGeometry;
  sceneState: HeroSceneState;
  reduceMotion: boolean;
}

function Planet({ spec, sphere, sceneState, reduceMotion }: PlanetProps) {
  const groupRef = useRef<Group>(null);
  const planetRef = useRef<ShaderMaterial>(null);
  const haloRef = useRef<ShaderMaterial>(null);
  const ringMeshRef = useRef<Mesh>(null);
  const ringRef = useRef<ShaderMaterial>(null);

  const { base, orientation, planetUniforms, haloUniforms, ringUniforms, ringGeometry } = useMemo(() => {
    const atmo = new Color(spec.atmosphere);
    return {
      base: new Vector3(...spec.anchor).applyQuaternion(SCREEN_TO_GALAXY),
      // Spin axis near screen-up, leaning slightly toward the viewer.
      orientation: SCREEN_TO_GALAXY.clone().multiply(new Quaternion().setFromEuler(new Euler(0.28, 0, spec.tilt))),
      planetUniforms: {
        uTime: { value: 0 },
        uSpin: { value: spec.spin },
        uSeed: { value: spec.seed },
        uKind: { value: spec.kind === "rocky" ? 0 : 1 },
        uOpacity: { value: 1 },
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
        uStrength: { value: spec.atmosphereStrength * 0.9 },
        uOpacity: { value: 1 },
      },
      ringUniforms: spec.ring
        ? {
            uColorA: { value: new Color(spec.ring.colors[0]) },
            uColorB: { value: new Color(spec.ring.colors[1]) },
            uInner: { value: spec.ring.inner },
            uOuter: { value: spec.ring.outer },
            uLight: { value: 0.7 },
            uOpacity: { value: 1 },
          }
        : null,
      ringGeometry: spec.ring ? new RingGeometry(spec.ring.inner, spec.ring.outer, 128, 1) : null,
    };
  }, [spec]);

  const scratch = useMemo(() => ({ core: new Vector3(), self: new Vector3(), light: new Vector3(), normal: new Vector3() }), []);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const visible = 1 - MathUtils.smoothstep(sceneState.progress, 0, FADE_END);
    group.visible = visible > 0.001;
    if (!group.visible) return;

    const t = reduceMotion ? 0 : state.clock.elapsedTime;
    const angle = Math.sin(t * spec.orbit.speed + spec.seed) * spec.orbit.range;
    group.position.copy(base).applyAxisAngle(UP, angle).multiplyScalar(1 + (1 - visible) * 0.35);
    group.scale.setScalar(spec.radius * (0.8 + 0.2 * visible));

    // Lit by the galaxy core, with a soft key light so the form always reads.
    const { core, self, light, normal } = scratch;
    group.parent?.getWorldPosition(core);
    group.getWorldPosition(self);
    light.subVectors(core, self).normalize().multiplyScalar(0.6).addScaledVector(KEY_LIGHT, 0.4).normalize();

    const opacity = visible * visible;
    const planet = planetRef.current;
    if (planet) {
      planet.uniforms.uTime.value = t;
      planet.uniforms.uOpacity.value = opacity;
      (planet.uniforms.uLightDir.value as Vector3).copy(light);
    }
    const halo = haloRef.current;
    if (halo) {
      halo.uniforms.uOpacity.value = opacity;
      (halo.uniforms.uLightDir.value as Vector3).copy(light);
    }
    const ring = ringRef.current;
    if (ring && ringMeshRef.current) {
      ringMeshRef.current.getWorldDirection(normal);
      ring.uniforms.uLight.value = 0.3 + 0.7 * Math.abs(normal.dot(light));
      ring.uniforms.uOpacity.value = opacity;
    }
  });

  return (
    <group ref={groupRef} quaternion={orientation}>
      <mesh geometry={sphere} renderOrder={-3}>
        <shaderMaterial
          ref={planetRef}
          vertexShader={planetVertex}
          fragmentShader={planetFragment}
          uniforms={planetUniforms}
          transparent
        />
      </mesh>
      <mesh geometry={sphere} scale={1.09} renderOrder={-2}>
        <shaderMaterial
          ref={haloRef}
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
          uniforms={haloUniforms}
          side={BackSide}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      {spec.ring && ringGeometry && ringUniforms ? (
        <mesh ref={ringMeshRef} geometry={ringGeometry} rotation={[-Math.PI / 2 + spec.ring.tilt, 0, 0]} renderOrder={-1}>
          <shaderMaterial
            ref={ringRef}
            vertexShader={ringVertex}
            fragmentShader={ringFragment}
            uniforms={ringUniforms}
            side={DoubleSide}
            transparent
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

interface GalaxyPlanetsProps {
  sceneState: HeroSceneState;
  reduceMotion: boolean;
  isMobile: boolean;
}

/** A few procedural planets orbiting in the galaxy's frame (galaxy state only). */
export default function GalaxyPlanets({ sceneState, reduceMotion, isMobile }: GalaxyPlanetsProps) {
  const sphere = useMemo(() => (isMobile ? new SphereGeometry(1, 40, 28) : new SphereGeometry(1, 64, 44)), [isMobile]);
  const planets = isMobile ? PLANETS.filter((p) => !p.desktopOnly) : PLANETS;

  return (
    <>
      {planets.map((spec) => (
        <Planet key={spec.seed} spec={spec} sphere={sphere} sceneState={sceneState} reduceMotion={reduceMotion} />
      ))}
    </>
  );
}
