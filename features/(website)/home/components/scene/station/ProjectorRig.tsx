"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  MathUtils,
  ShaderMaterial,
  SpriteMaterial,
  Vector3,
  type Group,
  type Mesh,
  type PerspectiveCamera,
  type PointLight,
  type Sprite,
  type Texture,
} from "three";
import { STATION, type StationRig } from "../../../lib/station/stationRig";
import { beamFragment, beamVertex, surfaceFragment, uvVertex } from "../../../lib/station/stationShaders";
import type { StationInteraction, StationSceneState } from "../../../lib/station/stationState";
import type { StationMaterials } from "./useStationMaterials";

/** Distance from the camera to the projection surface (world units). */
const SURFACE_DISTANCE = 4.5;
const LENS = 0.16;

const _c = new Vector3();
const _x = new Vector3();
const _y = new Vector3();
const _corners = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
const _lens = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];

function createBeamGeometry() {
  const geometry = new BufferGeometry();
  const along = new Float32Array(16);
  const across = new Float32Array(16);
  const index: number[] = [];
  for (let f = 0; f < 4; f++) {
    const o = f * 4;
    along.set([0, 0, 1, 1], o);
    across.set([0, 1, 1, 0], o);
    index.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(48), 3));
  geometry.setAttribute("aAlong", new Float32BufferAttribute(along, 1));
  geometry.setAttribute("aAcross", new Float32BufferAttribute(across, 1));
  geometry.setIndex(index);
  return geometry;
}

interface ProjectorRigProps {
  rig: StationRig;
  state: StationSceneState;
  interaction: StationInteraction;
  materials: StationMaterials;
  glow: Texture;
  reduceMotion: boolean;
}

/**
 * Ceiling projector that lowers on a telescoping mast, opens a light beam and
 * draws the projection surface exactly behind the HTML panel.
 */
export default function ProjectorRig({ rig, state, interaction, materials, glow, reduceMotion }: ProjectorRigProps) {
  const root = useRef<Group>(null);
  const mast = useRef<Mesh>(null);
  const head = useRef<Group>(null);
  const surface = useRef<Mesh>(null);
  const beam = useRef<Mesh>(null);
  const lensGlow = useRef<Sprite>(null);
  const light = useRef<PointLight>(null);
  const beamGeometry = useMemo(() => createBeamGeometry(), []);
  const beamMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        uniforms: { uIntensity: { value: 0 }, uTime: { value: 0 }, uColor: { value: new Color("#bfe9ff") } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    [],
  );
  const surfaceMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: uvVertex,
        fragmentShader: surfaceFragment,
        uniforms: { uReveal: { value: 0 }, uTime: { value: 0 }, uSize: { value: [1, 1] } },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [],
  );
  const glowMaterial = useMemo(
    () => new SpriteMaterial({ map: glow, color: "#d9f4ff", blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }),
    [glow],
  );
  useEffect(
    () => () => {
      beamGeometry.dispose();
      beamMaterial.dispose();
      surfaceMaterial.dispose();
      glowMaterial.dispose();
    },
    [beamGeometry, beamMaterial, surfaceMaterial, glowMaterial],
  );

  useFrame(({ clock, gl, camera: frameCamera }) => {
    const group = root.current;
    if (!group) return;
    const camera = frameCamera as PerspectiveCamera;
    const surfaceUniforms = (surface.current?.material as ShaderMaterial | undefined)?.uniforms;
    const { deploy, beam: beamOn, surface: reveal } = interaction.projector;
    group.visible = state.interior > 0.6 || deploy > 0.001;
    if (!group.visible) return;

    // Mount sits in the ceiling between the camera and the screens.
    const mount = _c.copy(rig.deckCam).addScaledVector(rig.deckForward, 7.2);
    mount.y = STATION.hall.ceiling - 0.05;
    group.position.copy(mount);
    const drop = MathUtils.lerp(0.5, 1.9, MathUtils.smoothstep(deploy, 0, 1));
    if (mast.current) {
      mast.current.scale.y = drop;
      mast.current.position.y = -drop / 2;
    }

    // Projection surface: fitted to the HTML panel, perpendicular to the view.
    let surfaceVisible = false;
    if (interaction.panel && reveal > 0.001) {
      const panel = interaction.panel.getBoundingClientRect();
      const canvas = gl.domElement.getBoundingClientRect();
      if (panel.width > 0 && canvas.width > 0) {
        const h = 2 * SURFACE_DISTANCE * Math.tan(MathUtils.degToRad(camera.fov / 2));
        const w = h * camera.aspect;
        const cx = ((panel.left + panel.width / 2 - canvas.left) / canvas.width - 0.5) * w;
        const cy = (0.5 - (panel.top + panel.height / 2 - canvas.top) / canvas.height) * h;
        const sw = (panel.width / canvas.width) * w;
        const sh = (panel.height / canvas.height) * h;
        const mesh = surface.current;
        if (mesh) {
          mesh.position.set(cx, cy, -SURFACE_DISTANCE).applyMatrix4(camera.matrixWorld);
          mesh.quaternion.copy(camera.quaternion);
          mesh.scale.set(sw, sh, 1);
          mesh.updateMatrixWorld();
          if (surfaceUniforms) surfaceUniforms.uSize.value = [sw, sh];
          _x.set(1, 0, 0).applyQuaternion(camera.quaternion);
          _y.set(0, 1, 0).applyQuaternion(camera.quaternion);
          const open = MathUtils.smoothstep(reveal, 0, 1);
          [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ].forEach(([sx, sy], k) => {
            _corners[k].copy(mesh.position).addScaledVector(_x, (sx * sw) / 2).addScaledVector(_y, (sy * sh * Math.max(open, 0.02)) / 2);
          });
          surfaceVisible = true;
        }
      }
    }
    if (surface.current) surface.current.visible = surfaceVisible;
    if (surfaceUniforms) {
      surfaceUniforms.uReveal.value = reveal;
      surfaceUniforms.uTime.value = reduceMotion ? 0 : clock.elapsedTime;
    }

    // Head aims its lens at the surface (or at the camera while parked).
    const lensWorld = _c.set(0, -drop - 0.22, 0).add(group.position);
    if (head.current) {
      head.current.position.set(0, -drop - 0.22, 0);
      head.current.lookAt(surfaceVisible && surface.current ? surface.current.position : camera.position);
    }

    // Beam: four faces from a small square at the lens to the surface corners.
    const beamMesh = beam.current;
    if (beamMesh) {
      beamMesh.visible = surfaceVisible && beamOn > 0.001;
      if (beamMesh.visible && head.current) {
        _x.set(1, 0, 0).applyQuaternion(head.current.quaternion);
        _y.set(0, 1, 0).applyQuaternion(head.current.quaternion);
        [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].forEach(([sx, sy], k) => _lens[k].copy(lensWorld).addScaledVector(_x, sx * LENS).addScaledVector(_y, sy * LENS));
        const pos = beamMesh.geometry.getAttribute("position") as Float32BufferAttribute;
        for (let f = 0; f < 4; f++) {
          const n = (f + 1) % 4;
          const quad = [_lens[f], _lens[n], _corners[n], _corners[f]];
          quad.forEach((p, j) => pos.setXYZ(f * 4 + j, p.x, p.y, p.z));
        }
        pos.needsUpdate = true;
        beamMesh.geometry.computeBoundingSphere();
        const beamUniforms = (beamMesh.material as ShaderMaterial).uniforms;
        beamUniforms.uIntensity.value = beamOn * (0.6 + 0.4 * MathUtils.smoothstep(reveal, 0, 1));
        beamUniforms.uTime.value = reduceMotion ? 0 : clock.elapsedTime;
      }
    }
    if (lensGlow.current) {
      lensGlow.current.material.opacity = 0.25 * deploy + 0.75 * beamOn;
      lensGlow.current.scale.setScalar(0.5 + 0.7 * beamOn);
    }
    if (light.current) light.current.intensity = 8 * beamOn;
  });

  return (
    <>
      <group ref={root} visible={false}>
        <mesh material={materials.gunmetal} position={[0, -0.08, 0]}>
          <boxGeometry args={[1.4, 0.16, 1.0]} />
        </mesh>
        <mesh ref={mast} material={materials.aluminium}>
          <cylinderGeometry args={[0.07, 0.07, 1, 12]} />
        </mesh>
        <group ref={head}>
          <mesh material={materials.gunmetal}>
            <boxGeometry args={[0.7, 0.42, 0.55]} />
          </mesh>
          <mesh material={materials.gold} position={[0, 0, 0.02]}>
            <boxGeometry args={[0.72, 0.05, 0.57]} />
          </mesh>
          <mesh material={materials.glass} position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.18, 0.08, 24]} />
          </mesh>
          <mesh material={materials.cyan} position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.17, 0.2, 32]} />
          </mesh>
          <sprite ref={lensGlow} material={glowMaterial} position={[0, 0, 0.36]} scale={0.5} />
          <pointLight ref={light} color="#cdeeff" distance={10} decay={2} intensity={0} position={[0, 0, 0.6]} />
        </group>
      </group>
      <mesh ref={beam} geometry={beamGeometry} material={beamMaterial} visible={false} frustumCulled={false} renderOrder={8} />
      <mesh ref={surface} material={surfaceMaterial} visible={false} renderOrder={9}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </>
  );
}
