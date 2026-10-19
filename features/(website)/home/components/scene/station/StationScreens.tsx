"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  MathUtils,
  MeshBasicMaterial,
  ShaderMaterial,
  TextureLoader,
  Vector3,
  type Group,
  type Mesh,
  type Texture,
} from "three";
import { STATION_SCREENS } from "../../../lib/station/stationContent";
import { STATION, type StationRig } from "../../../lib/station/stationRig";
import { screenFragment, uvVertex } from "../../../lib/station/stationShaders";
import { asColorTexture, createScreenHud } from "../../../lib/station/stationTextures";
import type { StationInteraction, StationSceneState } from "../../../lib/station/stationState";
import type { StationMaterials } from "./useStationMaterials";

const ACCENTS = { gold: new Color("#f4d675"), cyan: new Color("#7fe7ff") };
const _corner = new Vector3();

interface StationScreensProps {
  rig: StationRig;
  state: StationSceneState;
  interaction: StationInteraction;
  materials: StationMaterials;
  glow: Texture;
  reduceMotion: boolean;
}

export default function StationScreens({ rig, state, interaction, materials, glow, reduceMotion }: StationScreensProps) {
  const screens = useMemo(() => STATION_SCREENS.slice(0, rig.screens.length), [rig]);
  const thumbs = useLoader(
    TextureLoader,
    screens.map((s) => s.thumbnail),
  ) as Texture[];
  const groups = useRef<Array<Group | null>>([]);
  const cables = useRef<Array<Array<Mesh | null>>>([]);
  const halos = useRef<Array<Mesh | null>>([]);
  const lastRects = useRef<string[]>([]);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const built = useMemo(() => {
    const hud = screens.map((content, i) => createScreenHud(content, i, screens.length));
    const display = screens.map((content, i) => {
      const map = asColorTexture(thumbs[i], 4);
      return new ShaderMaterial({
        vertexShader: uvVertex,
        fragmentShader: screenFragment,
        uniforms: {
          uMap: { value: map },
          uHud: { value: hud[i] },
          uAccent: { value: ACCENTS[content.accent].clone() },
          uTime: { value: 0 },
          uHover: { value: 0 },
          uSelected: { value: 0 },
          uPower: { value: 0 },
        },
        toneMapped: false,
      });
    });
    const halo = screens.map(
      (content) =>
        new MeshBasicMaterial({
          map: glow,
          color: ACCENTS[content.accent],
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
    );
    return { hud, display, halo };
  }, [screens, thumbs, glow]);

  useEffect(
    () => () => {
      built.hud.forEach((t) => t.dispose());
      built.display.forEach((m) => m.dispose());
      built.halo.forEach((m) => m.dispose());
    },
    [built],
  );

  useFrame(({ clock }, delta) => {
    const t = reduceMotion ? 0 : clock.elapsedTime;
    const ease = 1 - Math.exp(-delta * 10);
    interaction.syncReady(state.interior);
    screens.forEach((_, i) => {
      const group = groups.current[i];
      const slot = rig.screens[i];
      if (!group) return;
      group.position.copy(slot.position);
      group.quaternion.copy(slot.quaternion);
      group.scale.set(slot.width, slot.height, 1);

      const u = built.display[i].uniforms;
      const power = MathUtils.smoothstep(state.interior, 0.15 + i * 0.1, 0.65 + i * 0.08);
      u.uPower.value = power * 1.1;
      u.uTime.value = t;
      u.uHover.value += ((interaction.hovered === i ? 1 : 0) - u.uHover.value) * ease;
      u.uSelected.value += ((interaction.selected === i ? 1 : 0) - u.uSelected.value) * ease;
      built.halo[i].opacity = power * (0.18 + 0.35 * u.uHover.value + 0.6 * u.uSelected.value);
      const halo = halos.current[i];
      if (halo) halo.scale.setScalar(1 + 0.04 * u.uSelected.value);

      // Cables run from the top corners to the ceiling (or posts down to the floor); their length depends on the slot.
      const floor = slot.mount === "floor";
      const edge = slot.position.y + (floor ? -slot.height / 2 : slot.height / 2);
      const length = Math.max(floor ? edge - STATION.hall.floor : STATION.hall.ceiling - edge, 0.01) / slot.height;
      cables.current[i]?.forEach((cable) => {
        if (!cable) return;
        cable.scale.set(floor ? 3 : 1, length, floor ? 3 : 1);
        cable.position.y = floor ? -0.5 - length / 2 : 0.5 + length / 2;
      });

      // Keep the HTML hotspot exactly over the visible screen.
      const el = interaction.hotspots[i];
      if (!el) return;
      group.updateWorldMatrix(true, false);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const [x, y] of [
        [-0.5, -0.5],
        [0.5, -0.5],
        [0.5, 0.5],
        [-0.5, 0.5],
      ]) {
        _corner.set(x, y, 0).applyMatrix4(group.matrixWorld).project(camera);
        const sx = (_corner.x * 0.5 + 0.5) * size.width;
        const sy = (-_corner.y * 0.5 + 0.5) * size.height;
        minX = Math.min(minX, sx);
        maxX = Math.max(maxX, sx);
        minY = Math.min(minY, sy);
        maxY = Math.max(maxY, sy);
      }
      const rect = `${minX.toFixed(1)},${minY.toFixed(1)},${(maxX - minX).toFixed(1)},${(maxY - minY).toFixed(1)}`;
      if (lastRects.current[i] !== rect) {
        lastRects.current[i] = rect;
        el.style.transform = `translate3d(${minX.toFixed(1)}px, ${minY.toFixed(1)}px, 0)`;
        el.style.width = `${(maxX - minX).toFixed(1)}px`;
        el.style.height = `${(maxY - minY).toFixed(1)}px`;
      }
    });
  });

  return (
    <group>
      {screens.map((content, i) => (
        <group
          key={content.id}
          ref={(g) => {
            groups.current[i] = g;
          }}
        >
          <mesh
            ref={(m) => {
              halos.current[i] = m;
            }}
            material={built.halo[i]}
            position={[0, 0, -0.08]}
            scale={[1.5, 1.7, 1]}
          >
            <planeGeometry args={[1, 1]} />
          </mesh>
          <mesh material={materials.gunmetal} position={[0, 0, -0.035]}>
            <boxGeometry args={[1.05, 1.08, 0.05]} />
          </mesh>
          <mesh material={materials.gold} position={[0, -0.535, -0.01]}>
            <boxGeometry args={[1.05, 0.012, 0.03]} />
          </mesh>
          <mesh material={built.display[i]}>
            <planeGeometry args={[1, 1]} />
          </mesh>
          {[-0.42, 0.42].map((x, k) => (
            <mesh
              key={x}
              ref={(m) => {
                (cables.current[i] ??= [])[k] = m;
              }}
              material={materials.aluminium}
              position={[x, 0.5, -0.04]}
            >
              <boxGeometry args={[0.012, 1, 0.012]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
