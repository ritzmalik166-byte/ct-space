"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  MathUtils,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  NoColorSpace,
  PointLight,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Object3D,
  type Texture,
} from "three";
import type { HeroSceneState } from "../../../lib/heroSceneState";
import {
  exhaustFragment,
  exhaustVertex,
  heatFragment,
  plumeFragment,
  plumeVertex,
  voyageVertex,
} from "../../../lib/shaders/voyage";
import { createExhaustGeometry, createPlumeGeometry } from "../../../lib/voyage/shipGeometry";
import type { ShipPose } from "../../../lib/voyage/shipPose";
import type { VoyageLayout } from "../../../lib/voyage/voyageLayout";

/** Bump `v` whenever build-ship.mjs regenerates the model so browsers drop the cached copy. */
export const MODEL_URL = "/assets/space/models/contenaissance-explorer.meshopt.glb?v=2";
export const TEXTURES = [
  "/assets/space/textures/ship-hull-albedo.jpg",
  "/assets/space/textures/ship-hull-normal.jpg",
  "/assets/space/textures/ship-hull-roughness.jpg",
  "/assets/space/textures/ship-gold-roughness.jpg",
];

interface SpaceshipProps {
  sceneState: HeroSceneState;
  pose: ShipPose;
  layout: VoyageLayout;
  reduceMotion: boolean;
  isMobile: boolean;
}

interface Nozzle {
  position: Vector3;
  radius: number;
}

type Uniform = { value: number };

const _p0 = new Vector3();
const _p1 = new Vector3();
const _p2 = new Vector3();
const _flight = new Vector3();
const _tangent = new Vector3();
const _aim = new Vector3();
const _nose = new Vector3();
const _up = new Vector3();
const _y = new Vector3();
const _z = new Vector3();
const _basis = new Matrix4();
const _flightQ = new Quaternion();

function bezier(a: Vector3, b: Vector3, c: Vector3, t: number, out: Vector3) {
  const u = 1 - t;
  return out.set(0, 0, 0).addScaledVector(a, u * u).addScaledVector(b, 2 * u * t).addScaledVector(c, t * t);
}

function bezierTangent(a: Vector3, b: Vector3, c: Vector3, t: number, out: Vector3) {
  return out
    .copy(b)
    .sub(a)
    .multiplyScalar(2 * (1 - t))
    .addScaledVector(_aim.copy(c).sub(b), 2 * t);
}

function noseQuaternion(direction: Vector3, bank: number, out: Quaternion) {
  _nose.copy(direction);
  if (_nose.lengthSq() < 1e-6) _nose.set(1, 0, 0);
  _nose.normalize();
  if (Math.abs(_nose.y) > 0.92) _up.set(0, 0, 1);
  else _up.set(0, 1, 0);
  _z.crossVectors(_nose, _up).normalize();
  _y.crossVectors(_z, _nose).normalize();
  if (bank !== 0) {
    _y.applyAxisAngle(_nose, bank);
    _z.crossVectors(_nose, _y).normalize();
  }
  _basis.makeBasis(_nose, _y, _z);
  return out.setFromRotationMatrix(_basis);
}

/**
 * The meshopt GLB ships without texture coordinates, so every map would sample a single
 * texel. Box-project model space instead; the flat-shaded facets have split vertices, so
 * each face picks its own axis without smearing across neighbours.
 */
function ensureBoxUvs(geometry: BufferGeometry, scale: number) {
  if (geometry.getAttribute("uv")) return;
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const nx = Math.abs(normal.getX(i));
    const ny = Math.abs(normal.getY(i));
    const nz = Math.abs(normal.getZ(i));
    const [u, v] = ny >= nx && ny >= nz ? [x, z] : nz >= nx ? [x, y] : [z, y];
    uv[i * 2] = u * scale;
    uv[i * 2 + 1] = v * scale;
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
}

/** Nose-to-tail reveal sweep in model space, shared by every hull material. */
function bindReveal(material: MeshPhysicalMaterial, uniforms: Uniform[], rim: number) {
  const reveal = { value: 0 };
  uniforms.push(reveal);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uReveal = reveal;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vShipLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvShipLocal = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uReveal;\nvarying vec3 vShipLocal;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
float along = clamp((vShipLocal.x + 2.25) / 4.9, 0.0, 1.0);
if (uReveal < 0.995 && along > uReveal) discard;
float wave = exp(-pow((along - uReveal) * 16.0, 2.0)) * (1.0 - step(0.995, uReveal));
totalEmissiveRadiance += vec3(1.0, 0.76, 0.38) * wave * 2.8;
float facing = clamp(dot(normalize(normal), normalize(-vViewPosition)), 0.0, 1.0);
totalEmissiveRadiance += vec3(0.85, 0.62, 0.32) * pow(1.0 - facing, 3.0) * ${rim.toFixed(3)};`,
      );
  };
  material.customProgramCacheKey = () => `contenaissance-explorer-${rim}`;
  material.needsUpdate = true;
}

/** Clones the GLB, swaps in PBR materials by mesh name and collects the nozzle anchors. */
export function buildShip(scene: Object3D, maps: Texture[], isMobile: boolean) {
  const [albedo, normal, roughness, goldRoughness] = maps;
  for (const texture of maps) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.anisotropy = 8;
    texture.colorSpace = texture === albedo ? SRGBColorSpace : NoColorSpace;
    texture.needsUpdate = true;
  }
  for (const texture of [albedo, normal, roughness]) texture.repeat.set(3, 1.5);
  goldRoughness.repeat.set(4, 1);

  const hull = new MeshPhysicalMaterial({
    color: new Color("#555a63"),
    map: albedo,
    normalMap: normal,
    normalScale: new Vector2(0.9, 0.9),
    roughnessMap: roughness,
    roughness: 0.8,
    metalness: 0.7,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
    envMapIntensity: 0.55,
  });
  const titanium = new MeshPhysicalMaterial({
    color: new Color("#3b404a"),
    normalMap: normal,
    normalScale: new Vector2(0.5, 0.5),
    metalness: 0.92,
    roughness: 0.42,
    envMapIntensity: 1.1,
  });
  const gold = new MeshPhysicalMaterial({
    color: new Color("#e0b562"),
    metalness: 1,
    roughnessMap: goldRoughness,
    roughness: 0.8,
    emissive: new Color("#4a2e08"),
    emissiveIntensity: 0.6,
    anisotropy: 0.7,
    clearcoat: 0.25,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.6,
  });
  const glass = new MeshPhysicalMaterial({
    color: new Color("#0f1a26"),
    metalness: 0.2,
    roughness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.2,
    emissive: new Color("#1d3550"),
    emissiveIntensity: 0.35,
  });
  const dark = new MeshPhysicalMaterial({ color: new Color("#050608"), metalness: 0.6, roughness: 0.7 });
  const engine = new MeshPhysicalMaterial({
    color: new Color("#1a0c02"),
    emissive: new Color("#ffb766"),
    emissiveIntensity: 0.4,
    roughness: 0.6,
  });
  const lights = new MeshPhysicalMaterial({
    color: new Color("#111"),
    emissive: new Color("#ffe2b0"),
    emissiveIntensity: 2.2,
    roughness: 0.4,
  });

  const reveal: Uniform[] = [];
  bindReveal(hull, reveal, 0.03);
  bindReveal(titanium, reveal, 0.06);
  bindReveal(gold, reveal, 0.3);
  bindReveal(glass, reveal, 0.4);
  bindReveal(dark, reveal, 0);
  bindReveal(engine, reveal, 0);
  bindReveal(lights, reveal, 0);

  const byName: Record<string, MeshPhysicalMaterial> = { hull, titanium, gold, glass, dark, engine, lights };
  const root = scene.clone(true);
  const nozzles: Nozzle[] = [];
  const found: { hull: BufferGeometry | null } = { hull: null };
  root.traverse((child) => {
    if (child instanceof Mesh) {
      const material = byName[child.name];
      if (material) {
        ensureBoxUvs(child.geometry, 0.6);
        child.material = material;
      }
      child.frustumCulled = false;
      if (child.name === "hull") found.hull = child.geometry;
    } else if (child.name.startsWith("nozzle_")) {
      nozzles[Number(child.name.slice(7))] = {
        position: child.position.clone(),
        radius: Number(child.userData.radius ?? 0.12),
      };
    }
  });

  const heat = { value: 0 };
  const plume = { value: 0 };
  const exhaust = {
    uTime: { value: 0 },
    uEngine: { value: 0 },
    uLength: { value: 2.4 },
    uSize: { value: isMobile ? 26 : 34 },
    uPixelRatio: { value: 1 },
  };
  const sparkSize = exhaust.uSize.value;
  const glow = { transparent: true, premultipliedAlpha: true, depthWrite: false, blending: AdditiveBlending };
  // Effect materials live here, not in JSX: three caches a material's uniforms object
  // on first compile, so props that swap it later would leave these values unbound.
  const heatMaterial = new ShaderMaterial({
    vertexShader: voyageVertex,
    fragmentShader: heatFragment,
    uniforms: { uHeat: heat },
    side: DoubleSide,
    ...glow,
    premultipliedAlpha: false,
  });
  const plumeMaterials = nozzles.map(
    (_, i) =>
      new ShaderMaterial({
        vertexShader: plumeVertex,
        fragmentShader: plumeFragment,
        uniforms: { uIntensity: plume, uColor: { value: new Color(i === 0 ? "#ffc27a" : "#ffad55") } },
        side: DoubleSide,
        ...glow,
      }),
  );
  const sparkMaterials = nozzles.map(
    (nozzle) =>
      new ShaderMaterial({
        vertexShader: exhaustVertex,
        fragmentShader: exhaustFragment,
        uniforms: { ...exhaust, uRadius: { value: nozzle.radius } },
        ...glow,
      }),
  );

  return {
    root,
    nozzles,
    hullGeometry: found.hull,
    materials: [...Object.values(byName), heatMaterial, ...plumeMaterials, ...sparkMaterials],
    surfaces: { hull, titanium, gold },
    engineMaterial: engine,
    heatMaterial,
    plumeMaterials,
    sparkMaterials,
    reveal,
    heat,
    plume,
    exhaust,
    sparkSize,
    plumeGeometry: createPlumeGeometry(),
    sparkGeometry: createExhaustGeometry(isMobile ? 70 : 160),
  };
}

export type Ship = ReturnType<typeof buildShip>;

export function setUniforms(uniforms: Uniform[], value: number) {
  for (const uniform of uniforms) uniform.value = value;
}

export function disposeShip(ship: Ship) {
  for (const material of ship.materials) material.dispose();
  ship.plumeGeometry.dispose();
  ship.sparkGeometry.dispose();
}

/**
 * Tileable maps cut from public/ct_spaceship_texture_previews/ by
 * scripts/space-assets/build-ship-preview-maps.mjs (the previews themselves are atlas
 * crops whose layout does not match this model's UVs).
 */
const SHEET_FILES = {
  panelAlbedo: "panel-albedo",
  panelNormal: "panel-normal",
  panelRoughness: "panel-roughness",
  panelAo: "panel-ao",
  panelEmissive: "panel-emissive",
  goldAlbedo: "gold-albedo",
  goldNormal: "gold-normal",
  goldRoughness: "gold-roughness",
  goldAo: "gold-ao",
} as const;
type SheetKey = keyof typeof SHEET_FILES;
export type SheetMaps = Record<SheetKey, Texture>;
const SHEET_COLOR: ReadonlySet<SheetKey> = new Set(["panelAlbedo", "panelEmissive", "goldAlbedo"]);

export async function loadSheetMaps(): Promise<SheetMaps> {
  const loader = new TextureLoader();
  const keys = Object.keys(SHEET_FILES) as SheetKey[];
  const results = await Promise.allSettled(
    keys.map((key) => loader.loadAsync(`/assets/space/textures/ship-sheet-${SHEET_FILES[key]}.jpg`)),
  );
  const failed = results.find((result) => result.status === "rejected");
  if (failed) {
    for (const result of results) if (result.status === "fulfilled") result.value.dispose();
    throw failed.reason;
  }
  const maps = {} as SheetMaps;
  keys.forEach((key, i) => {
    const texture = (results[i] as PromiseFulfilledResult<Texture>).value;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.anisotropy = 8;
    texture.colorSpace = SHEET_COLOR.has(key) ? SRGBColorSpace : NoColorSpace;
    if (key.startsWith("panel")) texture.repeat.set(2, 1);
    else texture.repeat.set(3, 1.5);
    texture.needsUpdate = true;
    maps[key] = texture;
  });
  return maps;
}

/** Black plating with gold accents on the hull, the same plating relief on titanium, gold plate on the trims. */
export function applySheetMaps({ hull, titanium, gold }: Ship["surfaces"], maps: SheetMaps) {
  hull.map = maps.panelAlbedo;
  hull.normalMap = maps.panelNormal;
  hull.normalScale.set(1.2, 1.2);
  hull.roughnessMap = maps.panelRoughness;
  hull.roughness = 1;
  hull.aoMap = maps.panelAo;
  hull.aoMapIntensity = 0.85;
  hull.emissiveMap = maps.panelEmissive;
  hull.emissive.set("#ffffff");
  hull.emissiveIntensity = 1.1;
  hull.color.set("#46464c");
  hull.metalness = 0.1;
  hull.specularIntensity = 0.3;
  hull.clearcoat = 0;

  titanium.normalMap = maps.panelNormal;
  titanium.normalScale.set(0.6, 0.6);
  titanium.roughnessMap = maps.panelRoughness;
  titanium.roughness = 0.9;
  titanium.aoMap = maps.panelAo;
  titanium.aoMapIntensity = 0.7;
  titanium.color.set("#1f2227");

  gold.map = maps.goldAlbedo;
  gold.color.set("#ffffff");
  gold.normalMap = maps.goldNormal;
  gold.normalScale.set(0.6, 0.6);
  gold.roughnessMap = maps.goldRoughness;
  gold.roughness = 0.45;
  gold.aoMap = maps.goldAo;
  gold.aoMapIntensity = 0.6;

  for (const material of [hull, titanium, gold]) material.needsUpdate = true;
}

export function disposeSheetMaps(maps: SheetMaps) {
  for (const texture of Object.values(maps)) texture.dispose();
}

export default function Spaceship({ sceneState, pose, layout, reduceMotion, isMobile }: SpaceshipProps) {
  const group = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const plumeRefs = useRef<Array<Mesh | null>>([]);
  const gltf = useGLTF(MODEL_URL);
  const maps = useLoader(TextureLoader, TEXTURES) as Texture[];

  const ship = useMemo(() => buildShip(gltf.scene, maps, isMobile), [gltf, maps, isMobile]);
  const live = useRef<Ship | null>(null);
  useLayoutEffect(() => {
    live.current = ship;
  }, [ship]);
  useEffect(() => () => disposeShip(ship), [ship]);
  useEffect(() => {
    let cancelled = false;
    let loaded: SheetMaps | null = null;
    loadSheetMaps()
      .then((maps) => {
        if (cancelled) return disposeSheetMaps(maps);
        loaded = maps;
        applySheetMaps(ship.surfaces, maps);
      })
      .catch((error) => console.warn("Spaceship sheet maps unavailable; keeping procedural hull maps.", error));
    return () => {
      cancelled = true;
      if (loaded) disposeSheetMaps(loaded);
    };
  }, [ship]);

  useFrame((state) => {
    const craft = group.current;
    const model = live.current;
    if (!craft || !model || !pose.ready) return;

    const formed = sceneState.shipForm;
    setUniforms(model.reveal, formed);
    craft.visible = formed > 0.012;
    if (!craft.visible) return;

    const launch = sceneState.launch;
    const cruise = MathUtils.smoothstep(launch, 0.15, 0.85);
    // Sparks are sized in pixels, so they need the same depth factor as the hull.
    model.exhaust.uSize.value = model.sparkSize * MathUtils.lerp(1, layout.shipDepthScale, cruise);
    if (launch <= 0.001) {
      craft.position.copy(pose.position);
      craft.quaternion.copy(pose.quaternion);
      craft.scale.copy(pose.scale);
    } else {
      const heroScale = pose.scale.x;
      const t = MathUtils.smoothstep(launch, 0, 1);
      _p0.copy(pose.position);
      _p2.copy(layout.shipDest);
      _p1.copy(_p0).lerp(_p2, 0.5);
      _p1.y += 2.2 * heroScale + 0.6;
      _p1.z += 1.2;
      bezier(_p0, _p1, _p2, t, _flight);
      craft.position.copy(_flight);

      bezierTangent(_p0, _p1, _p2, Math.max(t, 0.02), _tangent).normalize();
      _aim.copy(layout.shipAim).sub(craft.position).normalize();
      _tangent.lerp(_aim, MathUtils.smoothstep(launch, 0.55, 1));
      const climbBank = reduceMotion ? 0 : Math.sin(t * Math.PI) * -0.35;
      noseQuaternion(_tangent, climbBank + layout.shipBank, _flightQ);
      craft.quaternion.copy(pose.quaternion).slerp(_flightQ, MathUtils.smoothstep(launch, 0.03, 0.4));

      craft.scale.setScalar(MathUtils.lerp(heroScale, layout.shipCruiseScale, cruise));
    }

    const engine = layout.engine;
    model.heat.value = layout.heat;
    model.plume.value = engine * formed;
    model.exhaust.uEngine.value = engine * formed;
    model.exhaust.uTime.value = reduceMotion ? 0 : state.clock.elapsedTime;
    model.exhaust.uPixelRatio.value = state.viewport.dpr;
    model.engineMaterial.emissiveIntensity = 0.4 + engine * 3.6;
    model.nozzles.forEach((nozzle, i) => {
      const mesh = plumeRefs.current[i];
      if (mesh) mesh.scale.set(i === 0 ? 0.5 + engine * 3.4 : 0.4 + engine * 2.4, nozzle.radius, nozzle.radius);
    });
    if (light.current) light.current.intensity = (0.3 + engine * 7) * formed;  }, -1);

  return (
    <group ref={group} visible={false} frustumCulled={false}>
      <primitive object={ship.root} />
      {ship.hullGeometry ? (
        <mesh geometry={ship.hullGeometry} material={ship.heatMaterial} scale={1.012} renderOrder={3} />
      ) : null}
      {ship.nozzles.map((nozzle, index) => (
        <group key={index} position={nozzle.position}>
          <mesh
            ref={(mesh) => {
              plumeRefs.current[index] = mesh;
            }}
            geometry={ship.plumeGeometry}
            material={ship.plumeMaterials[index]}
            renderOrder={4}
            frustumCulled={false}
          />
          <points
            geometry={ship.sparkGeometry}
            material={ship.sparkMaterials[index]}
            renderOrder={5}
            frustumCulled={false}
            scale={index === 0 ? 1 : 0.7}
          />
        </group>
      ))}
      <pointLight color="#fff1dc" distance={8} decay={2} intensity={1.6} position={[0.4, 1.9, 1.2]} />
      <pointLight ref={light} color="#ffb36a" distance={6} decay={2} intensity={0} position={[-2.6, 0, 0]} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
