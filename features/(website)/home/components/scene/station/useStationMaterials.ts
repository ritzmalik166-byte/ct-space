"use client";

import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import {
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  type Texture,
} from "three";

const SETS = ["hull-panels", "wall-panels", "brushed-metal", "tread-plate"] as const;
type SetName = (typeof SETS)[number];
const MAPS = ["albedo", "normal", "arm"] as const;
const URLS = SETS.flatMap((set) => MAPS.map((map) => `/assets/station/textures/${set}/${map}.jpg`));

type PbrSet = { albedo: Texture; normal: Texture; arm: Texture };

function prepare(textures: Texture[]) {
  const sets = {} as Record<SetName, PbrSet>;
  SETS.forEach((set, s) => {
    const [albedo, normal, arm] = textures.slice(s * 3, s * 3 + 3);
    for (const tex of [albedo, normal, arm]) {
      tex.wrapS = RepeatWrapping;
      tex.wrapT = RepeatWrapping;
      tex.anisotropy = 8;
      tex.colorSpace = tex === albedo ? SRGBColorSpace : NoColorSpace;
      tex.needsUpdate = true;
    }
    sets[set] = { albedo, normal, arm };
  });
  return sets;
}

/** ARM packing: occlusion in R, roughness in G, metalness in B (three's channel layout). */
function pbr(set: PbrSet, params: ConstructorParameters<typeof MeshPhysicalMaterial>[0], normalScale = 1) {
  return new MeshPhysicalMaterial({
    map: set.albedo,
    normalMap: set.normal,
    normalScale: new Vector2(normalScale, normalScale),
    roughnessMap: set.arm,
    metalnessMap: set.arm,
    aoMap: set.arm,
    aoMapIntensity: 0.8,
    ...params,
  });
}

export type StationMaterials = ReturnType<typeof createMaterials>;

function createMaterials(sets: Record<SetName, PbrSet>) {
  const emissive = (color: string, intensity: number) =>
    new MeshStandardMaterial({ color: "#050505", emissive: new Color(color), emissiveIntensity: intensity, roughness: 0.5, toneMapped: false });

  return {
    /** Titanium hull plating. */
    hull: pbr(sets["hull-panels"], { color: "#9aa1ab", metalness: 0.85, roughness: 0.95, clearcoat: 0.25, clearcoatRoughness: 0.5 }, 1.1),
    /** Dark gunmetal for collars, ribs and the doors. */
    gunmetal: pbr(sets["hull-panels"], { color: "#3d424b", metalness: 0.9, roughness: 0.85 }, 1),
    /** Brushed aluminium trims, truss and consoles. */
    aluminium: pbr(sets["brushed-metal"], { color: "#c4c9d0", metalness: 1, roughness: 0.9 }),
    /** Gold accents keyed to the Contenaissance mark. */
    gold: pbr(sets["brushed-metal"], { color: "#d9ad55", metalness: 1, roughness: 0.75, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    /** Interior wall and ceiling panels. */
    wall: pbr(sets["wall-panels"], { color: "#7d848e", metalness: 0.75, roughness: 1 }, 0.9),
    ceiling: pbr(sets["wall-panels"], { color: "#3a3f47", metalness: 0.7, roughness: 1 }, 0.9),
    /** Hangar floor tread plate. */
    floor: pbr(sets["tread-plate"], { color: "#6a6f78", metalness: 0.9, roughness: 1 }, 1),
    glass: new MeshPhysicalMaterial({
      color: "#9ec9e6",
      metalness: 0,
      roughness: 0.04,
      transparent: true,
      opacity: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      depthWrite: false,
    }),
    windowWarm: emissive("#ffd9a3", 1.6),
    windowCool: emissive("#9fe6ff", 1.4),
    cyan: emissive("#5fdfff", 2.2),
    goldLight: emissive("#ffcf7a", 2),
    amber: emissive("#ffa531", 2.4),
    stripLight: emissive("#e8f6ff", 1.8),
  };
}

/** Loads the four PBR sets once and builds the shared station materials. */
export function useStationMaterials() {
  const textures = useLoader(TextureLoader, URLS) as Texture[];
  const materials = useMemo(() => createMaterials(prepare(textures)), [textures]);
  useEffect(
    () => () => {
      for (const material of Object.values(materials)) material.dispose();
    },
    [materials],
  );
  return materials;
}
