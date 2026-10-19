"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  FrontSide,
  RingGeometry,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type ShaderMaterial,
  type SphereGeometry,
  type Texture,
} from "three";
import type { PortfolioPartner } from "../../../lib/portfolioPartners";
import { atmosphereFragment, atmosphereVertex } from "../../../lib/shaders/planet";
import type { PlanetPreset } from "../../../lib/voyage/planetPresets";
import type { VoyageLayout } from "../../../lib/voyage/voyageLayout";

export interface PlanetTextures {
  albedo: Texture;
  normal?: Texture;
  roughness?: Texture;
  emissive?: Texture;
  clouds?: Texture;
}

interface PortfolioPlanetProps {
  index: number;
  partner: PortfolioPartner;
  preset: PlanetPreset;
  textures: PlanetTextures;
  ringMap: Texture;
  layout: VoyageLayout;
  sphere: SphereGeometry;
  reduceMotion: boolean;
}

const rimVertex = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vNormalW;
  void main() {
    vNormalV = normalize(normalMatrix * normal);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Fresnel limb on the planet disc itself; brightest on the sun-facing side. */
const rimFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLightDir;
  uniform float uStrength;
  varying vec3 vNormalV;
  varying vec3 vNormalW;
  void main() {
    float fres = pow(1.0 - clamp(vNormalV.z, 0.0, 1.0), 3.2);
    float lit = 0.35 + 0.65 * smoothstep(-0.6, 0.7, dot(normalize(vNormalW), normalize(uLightDir)));
    float a = fres * lit * uStrength;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

const _light = new Vector3();

export default function PortfolioPlanet({ index, partner, preset, textures, ringMap, layout, sphere, reduceMotion }: PortfolioPlanetProps) {
  const root = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const cloudMesh = useRef<Mesh>(null);
  const surface = useRef<MeshStandardMaterial>(null);
  const cloudMaterial = useRef<MeshStandardMaterial>(null);
  const ringMaterial = useRef<MeshStandardMaterial>(null);
  const halo = useRef<ShaderMaterial>(null);
  const rim = useRef<ShaderMaterial>(null);

  const atmoColor = useMemo(() => new Color(preset.atmosphere?.color ?? "#ffffff"), [preset]);
  const haloUniforms = useMemo(
    () => ({ uAtmo: { value: atmoColor }, uLightDir: { value: new Vector3(1, 0, 0) }, uStrength: { value: 0 }, uOpacity: { value: 0 } }),
    [atmoColor],
  );
  const rimUniforms = useMemo(
    () => ({ uColor: { value: atmoColor }, uLightDir: { value: new Vector3(1, 0, 0) }, uStrength: { value: 0 } }),
    [atmoColor],
  );

  const ringGeometry = useMemo(() => {
    if (!preset.ring) return null;
    const { inner, outer } = preset.ring;
    const geometry = new RingGeometry(inner, outer, 160, 1);
    // Radial UVs: u runs across the ring band so the 1D ring texture maps inner → outer.
    const pos = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    const p = new Vector2();
    for (let i = 0; i < pos.count; i++) {
      p.set(pos.getX(i), pos.getY(i));
      uv.setXY(i, (p.length() - inner) / (outer - inner), 0.5);
    }
    return geometry;
  }, [preset]);

  useEffect(() => () => ringGeometry?.dispose(), [ringGeometry]);

  const normalScale = useMemo(() => new Vector2(preset.normalScale, preset.normalScale), [preset]);
  const emissiveColor = useMemo(() => new Color(preset.emissive ? "#ffffff" : "#000000"), [preset]);
  const ringTint = useMemo(() => new Color(preset.ring?.tint ?? "#ffffff"), [preset]);

  useFrame(() => {
    const group = root.current;
    if (!group) return;
    const vis = layout.visibility[index] * layout.reveal;
    group.visible = vis > 0.01;
    if (!group.visible) return;

    group.position.copy(layout.positions[index]);
    group.scale.setScalar(layout.radii[index]);
    // Group order sorts whole planets against the sun (group order 0): far-side planets draw
    // first so the opaque disc covers them and the corona glows over them. Nested groups
    // reset the order, so the tilt group carries it too.
    const order = layout.isBehindSun(index) ? -1 : 1;
    group.renderOrder = order;
    if (tilt.current) tilt.current.renderOrder = order;
    const emphasis = layout.emphasis[index];

    _light.copy(layout.sun).sub(group.position);
    if (_light.lengthSq() > 1e-4) {
      _light.normalize();
      halo.current?.uniforms.uLightDir.value.copy(_light);
      rim.current?.uniforms.uLightDir.value.copy(_light);
    }

    const spin = reduceMotion ? 0 : layout.time * preset.spin;
    if (body.current) body.current.rotation.y = spin + index * 1.7;
    if (cloudMesh.current) cloudMesh.current.rotation.y = spin * 1.25 + index * 1.7;

    if (surface.current) {
      surface.current.opacity = vis;
      if (preset.emissive) surface.current.emissiveIntensity = (preset.emissiveIntensity ?? 1) * (0.55 + 0.45 * emphasis);
    }
    if (cloudMaterial.current) cloudMaterial.current.opacity = vis * 0.9;
    if (ringMaterial.current) ringMaterial.current.opacity = vis * (preset.ring?.opacity ?? 1);
    if (halo.current) {
      halo.current.uniforms.uOpacity.value = vis;
      halo.current.uniforms.uStrength.value = (preset.atmosphere?.strength ?? 0) * (0.7 + 0.6 * emphasis);
    }
    if (rim.current) rim.current.uniforms.uStrength.value = vis * (preset.atmosphere?.strength ?? 0.3) * (0.25 + 0.75 * emphasis);
  });

  return (
    <group ref={root} visible={false} name={`planet-${partner.id}`}>
      <group ref={tilt} rotation={[0, 0, preset.axialTilt]}>
        <mesh ref={body} geometry={sphere}>
          <meshStandardMaterial
            ref={surface}
            map={textures.albedo}
            normalMap={textures.normal ?? null}
            normalScale={normalScale}
            roughnessMap={textures.roughness ?? null}
            roughness={preset.roughnessValue}
            metalness={preset.metalness}
            emissiveMap={textures.emissive ?? null}
            emissive={emissiveColor}
            emissiveIntensity={preset.emissiveIntensity ?? 0}
            envMapIntensity={0.25}
            transparent
          />
        </mesh>
        {textures.clouds ? (
          <mesh ref={cloudMesh} geometry={sphere} scale={1.012}>
            <meshStandardMaterial
              ref={cloudMaterial}
              color="#ffffff"
              alphaMap={textures.clouds}
              roughness={1}
              metalness={0}
              transparent
              depthWrite={false}
            />
          </mesh>
        ) : null}
      </group>
      {ringGeometry ? (
        <mesh geometry={ringGeometry} rotation={preset.ring!.tilt} renderOrder={1}>
          <meshStandardMaterial
            ref={ringMaterial}
            map={ringMap}
            color={ringTint}
            roughness={0.9}
            metalness={0}
            side={DoubleSide}
            transparent
            depthWrite={false}
          />
        </mesh>
      ) : null}
      {preset.atmosphere ? (
        <>
          <mesh geometry={sphere} scale={1.004} renderOrder={2}>
            <shaderMaterial
              ref={rim}
              vertexShader={rimVertex}
              fragmentShader={rimFragment}
              uniforms={rimUniforms}
              transparent
              premultipliedAlpha
              depthWrite={false}
              blending={AdditiveBlending}
              side={FrontSide}
            />
          </mesh>
          <mesh geometry={sphere} scale={1.08} renderOrder={2}>
            <shaderMaterial
              ref={halo}
              vertexShader={atmosphereVertex}
              fragmentShader={atmosphereFragment}
              uniforms={haloUniforms}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
              side={BackSide}
            />
          </mesh>
        </>
      ) : null}
    </group>
  );
}
