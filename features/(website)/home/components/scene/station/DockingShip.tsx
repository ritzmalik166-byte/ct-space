"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AdditiveBlending, Box3, SpriteMaterial, TextureLoader, Vector3, type Group, type Mesh, type PointLight, type Sprite, type Texture } from "three";
import {
  MODEL_URL,
  TEXTURES,
  applySheetMaps,
  buildShip,
  disposeSheetMaps,
  disposeShip,
  loadSheetMaps,
  setUniforms,
  type SheetMaps,
  type Ship,
} from "../ship/Spaceship";
import { STATION, type StationRig } from "../../../lib/station/stationRig";
import type { StationSceneState } from "../../../lib/station/stationState";

interface DockingShipProps {
  rig: StationRig;
  state: StationSceneState;
  glow: Texture;
  reduceMotion: boolean;
  isMobile: boolean;
}

/** The Section 1/2 explorer (same GLB and PBR materials), flown by the station rig. */
export default function DockingShip({ rig, state, glow, reduceMotion, isMobile }: DockingShipProps) {
  const group = useRef<Group>(null);
  const plumeRefs = useRef<Array<Mesh | null>>([]);
  const engineLight = useRef<PointLight>(null);
  const navRefs = useRef<Array<Sprite | null>>([]);
  const gltf = useGLTF(MODEL_URL);
  const maps = useLoader(TextureLoader, TEXTURES) as Texture[];
  const ship = useMemo(() => buildShip(gltf.scene, maps, isMobile), [gltf, maps, isMobile]);
  const live = useRef<Ship | null>(null);
  useLayoutEffect(() => {
    live.current = ship;
    setUniforms(ship.reveal, 1);
  }, [ship]);
  useEffect(() => () => disposeShip(ship), [ship]);
  useEffect(() => {
    let cancelled = false;
    let loaded: SheetMaps | null = null;
    loadSheetMaps()
      .then((sheet) => {
        if (cancelled) return disposeSheetMaps(sheet);
        loaded = sheet;
        applySheetMaps(ship.surfaces, sheet);
      })
      .catch((error) => console.warn("Station ship sheet maps unavailable; keeping procedural hull maps.", error));
    return () => {
      cancelled = true;
      if (loaded) disposeSheetMaps(loaded);
    };
  }, [ship]);

  // Wingtips (port red, starboard green) and tail strobe from the model bounds; nose is +X, starboard +Z.
  const nav = useMemo(() => {
    const box = new Box3().setFromObject(ship.root);
    return [
      { position: new Vector3(box.min.x * 0.35, 0, box.min.z * 0.97), color: "#ff3d3d" },
      { position: new Vector3(box.min.x * 0.35, 0, box.max.z * 0.97), color: "#3dff8e" },
      { position: new Vector3(box.min.x * 0.95, box.max.y * 0.8, 0), color: "#ffffff" },
    ];
  }, [ship]);
  const navMaterials = useMemo(
    () => nav.map((n) => new SpriteMaterial({ map: glow, color: n.color, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false })),
    [nav, glow],
  );
  useEffect(() => () => navMaterials.forEach((m) => m.dispose()), [navMaterials]);

  useFrame(({ clock, viewport }) => {
    const craft = group.current;
    const model = live.current;
    if (!craft || !model) return;
    craft.position.copy(rig.shipPos);
    craft.quaternion.copy(rig.shipQuat);
    craft.scale.setScalar(STATION.shipScale);

    const engine = state.thrust;
    model.heat.value = 0;
    model.plume.value = engine;
    model.exhaust.uEngine.value = engine;
    model.exhaust.uSize.value = model.sparkSize;
    model.exhaust.uTime.value = reduceMotion ? 0 : clock.elapsedTime;
    model.exhaust.uPixelRatio.value = viewport.dpr;
    model.engineMaterial.emissiveIntensity = 0.4 + engine * 3.6;
    model.nozzles.forEach((nozzle, i) => {
      const mesh = plumeRefs.current[i];
      if (mesh) mesh.scale.set(i === 0 ? 0.4 + engine * 2.6 : 0.3 + engine * 1.8, nozzle.radius, nozzle.radius);
    });
    if (engineLight.current) engineLight.current.intensity = 0.4 + engine * 6;

    const t = reduceMotion ? 0 : clock.elapsedTime;
    navRefs.current.forEach((sprite, i) => {
      if (!sprite) return;
      const on = i < 2 ? 0.85 : (t * 1.1) % 1 < 0.08 ? 1 : 0;
      sprite.material.opacity = reduceMotion ? 0.8 : on;
    });
  });

  return (
    <group ref={group} frustumCulled={false}>
      <primitive object={ship.root} />
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
          <points geometry={ship.sparkGeometry} material={ship.sparkMaterials[index]} renderOrder={5} frustumCulled={false} scale={index === 0 ? 1 : 0.7} />
        </group>
      ))}
      {nav.map((n, i) => (
        <sprite
          key={i}
          ref={(s) => {
            navRefs.current[i] = s;
          }}
          material={navMaterials[i]}
          position={n.position}
          scale={0.55}
        />
      ))}
      <pointLight ref={engineLight} color="#ffb36a" distance={7} decay={2} intensity={0} position={[-2.6, 0, 0]} />
    </group>
  );
}
