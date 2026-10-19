"use client";

import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  PointsMaterial,
  ShaderMaterial,
  TextureLoader,
  Vector3,
  type Texture,
} from "three";
import { atmosphereFragment, atmosphereVertex } from "../../../lib/shaders/planet";
import { asColorTexture } from "../../../lib/station/stationTextures";

/** Reuses the Section 2 Solar System Scope maps (CC BY 4.0, see public/assets/space/CREDITS.md). */
const SKY = { desktop: "/assets/space/textures/milky-way.jpg", mobile: "/assets/space/textures/1k/milky-way.jpg" };
const EARTH = { desktop: "/assets/space/textures/earth-albedo.jpg", mobile: "/assets/space/textures/1k/earth-albedo.jpg" };
const CLOUDS = { desktop: "/assets/space/textures/earth-clouds.jpg", mobile: "/assets/space/textures/1k/earth-clouds.jpg" };

export const SUN_DIRECTION = new Vector3(0.75, 0.42, 0.5).normalize();
const PLANET = { position: new Vector3(-70, -95, -430), radius: 150 };

export default function StationSky({ isMobile, glow }: { isMobile: boolean; glow: Texture }) {
  const key = isMobile ? "mobile" : "desktop";
  const [skyMap, earthMap, clouds] = useLoader(TextureLoader, [SKY[key], EARTH[key], CLOUDS[key]]) as Texture[];
  const sky = useMemo(() => asColorTexture(skyMap), [skyMap]);
  const earth = useMemo(() => asColorTexture(earthMap, 8), [earthMap]);

  const stars = useMemo(() => {
    const count = isMobile ? 450 : 1100;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [new Color("#ffffff"), new Color("#bcd4ff"), new Color("#ffe1b0")];
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u) * 700;
      positions.set([Math.cos(a) * r, u * 700, Math.sin(a) * r], i * 3);
      const c = palette[i % 3].clone().multiplyScalar(0.35 + rand() * 0.65);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    return geometry;
  }, [isMobile]);
  const starMaterial = useMemo(
    () =>
      new PointsMaterial({
        map: glow,
        size: isMobile ? 3 : 3.6,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [glow, isMobile],
  );
  const atmosphere = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: {
          uAtmo: { value: new Color("#7cc4ff") },
          uLightDir: { value: SUN_DIRECTION.clone() },
          uStrength: { value: 1.6 },
          uOpacity: { value: 1 },
        },
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  useEffect(
    () => () => {
      stars.dispose();
      starMaterial.dispose();
      atmosphere.dispose();
    },
    [stars, starMaterial, atmosphere],
  );

  return (
    <group>
      <mesh rotation={[0.4, 1.1, -0.5]} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[900, 48, 24]} />
        <meshBasicMaterial map={sky} side={BackSide} color="#5d6c95" depthWrite={false} toneMapped={false} />
      </mesh>
      <points geometry={stars} material={starMaterial} renderOrder={-9} frustumCulled={false} />
      <group position={PLANET.position}>
        <mesh rotation={[0.35, -1.2, 0.1]}>
          <sphereGeometry args={[PLANET.radius, isMobile ? 64 : 112, isMobile ? 48 : 80]} />
          <meshStandardMaterial map={earth} roughness={0.85} metalness={0} />
        </mesh>
        <mesh rotation={[0.35, -1.0, 0.1]}>
          <sphereGeometry args={[PLANET.radius * 1.008, isMobile ? 64 : 112, isMobile ? 48 : 80]} />
          <meshStandardMaterial alphaMap={clouds} transparent depthWrite={false} color="#ffffff" roughness={1} />
        </mesh>
        <mesh material={atmosphere} scale={1.05}>
          <sphereGeometry args={[PLANET.radius, 64, 48]} />
        </mesh>
      </group>
    </group>
  );
}
