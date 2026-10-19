"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  MathUtils,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointsMaterial,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type Group,
  type Mesh,
  type PointLight,
  type Points,
  type Texture,
} from "three";
import { STATION, type StationRig } from "../../../lib/station/stationRig";
import type { StationSceneState } from "../../../lib/station/stationState";
import { createBackWall, createHallArch, worldUvs } from "../../../lib/station/stationGeometry";
import { STATION_GATE_BRAND } from "../../../lib/station/stationContent";
import { createConsoleTexture, createDataVizTexture, createHazardTexture, createHologramLabelTexture } from "../../../lib/station/stationTextures";
import { coneFragment, fresnelFragment, fresnelVertex, uvVertex } from "../../../lib/station/stationShaders";
import type { StationMaterials } from "./useStationMaterials";

const { hall, pad } = STATION;
const LENGTH = -hall.back;
const ARCH_Z = Array.from({ length: 10 }, (_, i) => -2.2 - i * 3.5);
const WINDOW = { halfW: 6.2, bottom: -0.6, top: 5.4 };

const _o = new Object3D();
const _m = new Matrix4();
const _v = new Vector3();

function useDisposable<T extends { dispose(): void }>(factory: () => T, deps: unknown[] = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  const value = useMemo(factory, deps);
  useEffect(() => () => value.dispose(), [value]);
  return value;
}

function plane(width: number, height: number, transform: (g: PlaneGeometry) => void, uvScale = 0.25) {
  const geometry = new PlaneGeometry(width, height);
  transform(geometry);
  return worldUvs(geometry, uvScale);
}

function useInstances(ref: RefObject<InstancedMesh | null>, matrices: Matrix4[]) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [ref, matrices]);
}

function compose(x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) {
  _o.position.set(x, y, z);
  _o.rotation.set(0, ry, 0);
  _o.scale.set(sx, sy, sz);
  _o.updateMatrix();
  return _o.matrix.clone();
}

/** Hall shell: tread-plate floor, panelled walls and ceiling, arches, light strips and the back window. */
function HallShell({ materials }: { materials: StationMaterials }) {
  const floor = useDisposable(() => plane(hall.halfW * 2, LENGTH, (g) => g.rotateX(-Math.PI / 2).translate(0, hall.floor + 0.01, hall.back / 2), 0.3));
  const ceiling = useDisposable(() => plane(hall.halfW * 2, LENGTH, (g) => g.rotateX(Math.PI / 2).translate(0, hall.ceiling - 0.02, hall.back / 2)));
  const wallL = useDisposable(() =>
    plane(LENGTH, hall.ceiling - hall.floor, (g) => g.rotateY(Math.PI / 2).translate(-hall.halfW + 0.02, (hall.ceiling + hall.floor) / 2, hall.back / 2)),
  );
  const wallR = useDisposable(() =>
    plane(LENGTH, hall.ceiling - hall.floor, (g) => g.rotateY(-Math.PI / 2).translate(hall.halfW - 0.02, (hall.ceiling + hall.floor) / 2, hall.back / 2)),
  );
  const back = useDisposable(() => createBackWall(WINDOW));
  const arch = useDisposable(createHallArch);
  const box = useDisposable(() => new BoxGeometry(1, 1, 1));

  const archRef = useRef<InstancedMesh>(null);
  const stripRef = useRef<InstancedMesh>(null);
  const panelRef = useRef<InstancedMesh>(null);
  const laneRef = useRef<InstancedMesh>(null);
  const mullionRef = useRef<InstancedMesh>(null);

  const archMatrices = useMemo(() => ARCH_Z.map((z) => _m.makeTranslation(0, 0, z).clone()), []);
  const stripMatrices = useMemo(
    () => ARCH_Z.map((z) => compose(0, hall.ceiling - 0.5, z, (hall.halfW - 1.4) * 2, 0.05, 0.14)),
    [],
  );
  const panelMatrices = useMemo(() => {
    const out: Matrix4[] = [];
    for (let i = 0; i < ARCH_Z.length - 1; i++)
      for (const x of [-3.2, 3.2]) out.push(compose(x, hall.ceiling - 0.06, (ARCH_Z[i] + ARCH_Z[i + 1]) / 2, 1.3, 0.05, 2.1));
    return out;
  }, []);
  const laneMatrices = useMemo(() => {
    const out: Matrix4[] = [];
    for (let z = -1.2; z > hall.back + 1; z -= 1.75) for (const x of [-2.9, 2.9]) out.push(compose(x, hall.floor + 0.03, z, 0.08, 0.02, 1.05));
    return out;
  }, []);
  const mullionMatrices = useMemo(() => {
    const out: Matrix4[] = [];
    const z = hall.back - 0.3;
    for (const x of [-WINDOW.halfW, -WINDOW.halfW / 3, WINDOW.halfW / 3, WINDOW.halfW])
      out.push(compose(x, (WINDOW.top + WINDOW.bottom) / 2, z, 0.22, WINDOW.top - WINDOW.bottom, 0.5));
    for (const y of [WINDOW.bottom, WINDOW.top, (WINDOW.top + WINDOW.bottom) / 2 + 0.8])
      out.push(compose(0, y, z, WINDOW.halfW * 2 + 0.22, 0.2, 0.5));
    return out;
  }, []);

  useInstances(archRef, archMatrices);
  useInstances(stripRef, stripMatrices);
  useInstances(panelRef, panelMatrices);
  useInstances(laneRef, laneMatrices);
  useInstances(mullionRef, mullionMatrices);

  return (
    <group>
      <mesh geometry={floor} material={materials.floor} />
      <mesh geometry={ceiling} material={materials.ceiling} />
      <mesh geometry={wallL} material={materials.wall} />
      <mesh geometry={wallR} material={materials.wall} />
      <mesh geometry={back} material={[materials.wall, materials.gunmetal]} />
      <instancedMesh ref={archRef} args={[arch, materials.gunmetal, archMatrices.length]} />
      <instancedMesh ref={stripRef} args={[box, materials.stripLight, stripMatrices.length]} />
      <instancedMesh ref={panelRef} args={[box, materials.stripLight, panelMatrices.length]} />
      <instancedMesh ref={laneRef} args={[box, materials.cyan, laneMatrices.length]} />
      <instancedMesh ref={mullionRef} args={[box, materials.aluminium, mullionMatrices.length]} />
      <mesh material={materials.glass} position={[0, (WINDOW.top + WINDOW.bottom) / 2, hall.back - 0.32]}>
        <planeGeometry args={[WINDOW.halfW * 2, WINDOW.top - WINDOW.bottom]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} material={materials.goldLight} position={[side * (hall.halfW - 0.06), hall.floor + 0.16, hall.back / 2]}>
          <boxGeometry args={[0.04, 0.05, LENGTH - 1]} />
        </mesh>
      ))}
    </group>
  );
}

/** Landing pad with clamp blocks, gold ring and hazard band; lights up during touchdown. */
function LandingPad({ materials, state }: { materials: StationMaterials; state: StationSceneState }) {
  const hazard = useDisposable(createHazardTexture);
  const ring = useDisposable(() => new RingGeometry(2.55, 2.8, 64));
  const band = useDisposable(() => new RingGeometry(2.9, 3.3, 64, 1));
  const hazardMaterial = useDisposable(() => {
    hazard.repeat.set(18, 1);
    return new MeshStandardMaterial({ map: hazard, roughness: 0.7, metalness: 0.2, emissiveMap: hazard, emissive: new Color("#ffb347"), emissiveIntensity: 0.15 });
  }, [hazard]);
  const ringMaterial = useDisposable(() => new MeshBasicMaterial({ color: "#ffcf7a", toneMapped: false, transparent: true, opacity: 0.4 }));

  const bandMesh = useRef<Mesh>(null);
  const ringMesh = useRef<Mesh>(null);
  useFrame(() => {
    const touchdown = MathUtils.smoothstep(state.entry, 0.55, 0.95);
    if (ringMesh.current) (ringMesh.current.material as MeshBasicMaterial).opacity = 0.35 + 0.65 * touchdown;
    if (bandMesh.current) (bandMesh.current.material as MeshStandardMaterial).emissiveIntensity = 0.15 + 0.6 * touchdown;
  });

  const y = hall.floor + 0.02;
  return (
    <group position={[pad.x, 0, pad.z]}>
      <mesh material={materials.gunmetal} position={[0, y + 0.04, 0]}>
        <cylinderGeometry args={[3.4, 3.5, 0.1, 48]} />
      </mesh>
      <mesh ref={bandMesh} geometry={band} material={hazardMaterial} rotation={[-Math.PI / 2, 0, 0]} position={[0, y + 0.1, 0]} />
      <mesh ref={ringMesh} geometry={ring} material={ringMaterial} rotation={[-Math.PI / 2, 0, 0]} position={[0, y + 0.105, 0]} />
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} material={materials.aluminium} position={[Math.cos(a) * 2.2, y + 0.25, Math.sin(a) * 2.2]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.7, 0.32, 0.32]} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Six-axis service arm beside the pad; swings toward the ship once it has landed. */
function ServiceArm({ materials, state, reduceMotion }: { materials: StationMaterials; state: StationSceneState; reduceMotion: boolean }) {
  const base = useRef<Group>(null);
  const shoulder = useRef<Group>(null);
  const elbow = useRef<Group>(null);
  const wrist = useRef<Group>(null);

  useFrame(({ clock }) => {
    const reach = MathUtils.smoothstep(state.entry, 0.85, 1) * 0.6 + MathUtils.smoothstep(state.interior, 0, 0.8) * 0.4;
    const idle = reduceMotion ? 0 : Math.sin(clock.elapsedTime * 0.6) * 0.04;
    if (base.current) base.current.rotation.y = MathUtils.lerp(-0.5, 0.55, reach) + idle;
    if (shoulder.current) shoulder.current.rotation.z = MathUtils.lerp(0.15, 0.85, reach);
    if (elbow.current) elbow.current.rotation.z = MathUtils.lerp(-1.9, -1.15, reach) + idle;
    if (wrist.current) wrist.current.rotation.z = MathUtils.lerp(0.9, 0.4, reach);
  });

  return (
    <group position={[6.1, hall.floor, pad.z - 0.6]}>
      <mesh material={materials.gunmetal} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.75, 0.9, 0.4, 24]} />
      </mesh>
      <group ref={base} position={[0, 0.4, 0]}>
        <mesh material={materials.aluminium} position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.42, 0.5, 0.7, 20]} />
        </mesh>
        <group ref={shoulder} position={[0, 0.8, 0]} rotation={[0, Math.PI, 0]}>
          <mesh material={materials.gold} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.7, 20]} />
          </mesh>
          <mesh material={materials.aluminium} position={[0, 1.2, 0]}>
            <boxGeometry args={[0.36, 2.4, 0.42]} />
          </mesh>
          <group ref={elbow} position={[0, 2.4, 0]}>
            <mesh material={materials.gold} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.26, 0.26, 0.56, 18]} />
            </mesh>
            <mesh material={materials.aluminium} position={[0, 1.0, 0]}>
              <boxGeometry args={[0.28, 2.0, 0.32]} />
            </mesh>
            <group ref={wrist} position={[0, 2.0, 0]}>
              <mesh material={materials.gunmetal} position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.16, 0.2, 0.4, 14]} />
              </mesh>
              <mesh material={materials.cyan} position={[0, 0.45, 0]}>
                <sphereGeometry args={[0.07, 10, 8]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/** Glass railing separating the hangar from the research deck, open in the middle. */
function DeckRailing({ materials }: { materials: StationMaterials }) {
  const z = -14.6;
  const h = 1.1;
  return (
    <group>
      {[-1, 1].map((side) => {
        const x0 = side * 2.2;
        const x1 = side * (hall.halfW - 0.1);
        const cx = (x0 + x1) / 2;
        const w = Math.abs(x1 - x0);
        return (
          <group key={side}>
            <mesh material={materials.glass} position={[cx, hall.floor + h / 2 + 0.05, z]}>
              <boxGeometry args={[w, h, 0.04]} />
            </mesh>
            <mesh material={materials.gold} position={[cx, hall.floor + h + 0.08, z]}>
              <boxGeometry args={[w, 0.06, 0.12]} />
            </mesh>
            {[0, 0.5, 1].map((t) => (
              <mesh key={t} material={materials.aluminium} position={[MathUtils.lerp(x0, x1, t), hall.floor + h / 2 + 0.05, z]}>
                <boxGeometry args={[0.08, h + 0.1, 0.1]} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function Console({ position, facing, seed, materials }: { position: Vector3; facing: Vector3; seed: number; materials: StationMaterials }) {
  const group = useRef<Group>(null);
  const screen = useDisposable(() => createConsoleTexture(seed), [seed]);
  const screenMaterial = useDisposable(() => new MeshBasicMaterial({ map: screen, toneMapped: false }), [screen]);
  useFrame(() => {
    if (!group.current) return;
    group.current.position.copy(position);
    _v.set(facing.x, position.y, facing.z);
    group.current.lookAt(_v);
  });
  return (
    <group ref={group}>
      <mesh material={materials.gunmetal} position={[0, 0.45, 0]}>
        <boxGeometry args={[2.3, 0.9, 0.8]} />
      </mesh>
      <mesh material={materials.aluminium} position={[0, 0.95, -0.05]} rotation={[-0.55, 0, 0]}>
        <boxGeometry args={[2.4, 0.08, 1.0]} />
      </mesh>
      <mesh material={screenMaterial} position={[0, 1.0, -0.02]} rotation={[-0.55 - Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.1, 0.82]} />
      </mesh>
      <mesh material={materials.goldLight} position={[0, 0.06, 0.41]}>
        <boxGeometry args={[2.2, 0.03, 0.02]} />
      </mesh>
    </group>
  );
}

/** Central AI core: pedestal emitter, light cone, fresnel shell, gold lattice, orbit rings and data motes. */
function AiHologram({ rig, glow, state, reduceMotion, isMobile }: { rig: StationRig; glow: Texture; state: StationSceneState; reduceMotion: boolean; isMobile: boolean }) {
  const root = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const rings = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const shellMesh = useRef<Mesh>(null);
  const coreMesh = useRef<Mesh>(null);
  const coneMesh = useRef<Mesh>(null);
  const motePoints = useRef<Points>(null);
  const shell = useDisposable(() => new SphereGeometry(1, 48, 32));
  const lattice = useDisposable(() => new EdgesGeometry(new IcosahedronGeometry(0.72, 1)));
  const shellMaterial = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: fresnelVertex,
        fragmentShader: fresnelFragment,
        uniforms: { uColor: { value: new Color("#6fe2ff") }, uIntensity: { value: 1.1 }, uPower: { value: 2.2 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
  );
  const coreMaterial = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: fresnelVertex,
        fragmentShader: fresnelFragment,
        uniforms: { uColor: { value: new Color("#ffd98a") }, uIntensity: { value: 1.6 }, uPower: { value: 1.2 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
  );
  const coneMaterial = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: uvVertex,
        fragmentShader: coneFragment,
        uniforms: { uColor: { value: new Color("#5fd8ff") }, uIntensity: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
  );
  const motes = useDisposable(() => {
    const count = isMobile ? 220 : 520;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count;
      const phi = Math.acos(1 - 2 * u);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 1.25 + 0.35 * Math.abs(Math.sin(i * 1.7));
      positions.set([Math.sin(phi) * Math.cos(theta) * r, Math.cos(phi) * r, Math.sin(phi) * Math.sin(theta) * r], i * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    return geometry;
  }, [isMobile]);
  const moteMaterial = useDisposable(
    () => new PointsMaterial({ map: glow, color: "#9feaff", size: 0.09, transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false }),
    [glow],
  );
  const ringMaterial = useDisposable(() => new MeshBasicMaterial({ color: "#f4d675", transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
  const labelTexture = useDisposable(() => createHologramLabelTexture(STATION_GATE_BRAND.logo));
  const labelMaterial = useDisposable(
    () => new MeshBasicMaterial({ map: labelTexture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
    [labelTexture],
  );
  const label = useRef<Mesh>(null);

  useFrame(({ clock, camera }, delta) => {
    if (!root.current) return;
    root.current.position.copy(rig.hologram);
    root.current.scale.setScalar(rig.hologramScale);
    const power = MathUtils.smoothstep(state.entry, 0.5, 1);
    const t = clock.elapsedTime;
    if (label.current) {
      label.current.quaternion.copy(camera.quaternion);
      (label.current.material as MeshBasicMaterial).opacity = power;
    }
    const intensity = (mesh: Mesh | null, value: number) => {
      if (mesh) (mesh.material as ShaderMaterial).uniforms.uIntensity.value = value;
    };
    intensity(shellMesh.current, 1.1 * power);
    intensity(coreMesh.current, (0.9 + (reduceMotion ? 0 : 0.2 * Math.sin(t * 1.8))) * power);
    intensity(coneMesh.current, power);
    if (motePoints.current) (motePoints.current.material as PointsMaterial).opacity = power;
    const ringMesh = rings.current?.children[0] as Mesh | undefined;
    if (ringMesh) (ringMesh.material as MeshBasicMaterial).opacity = 0.55 * power;
    if (!reduceMotion) {
      if (spin.current) spin.current.rotation.y += delta * 0.25;
      if (rings.current) {
        rings.current.children.forEach((ring, i) => {
          ring.rotation.z += delta * (0.2 + i * 0.12) * (i % 2 ? -1 : 1);
        });
      }
    }
    if (light.current) light.current.intensity = 14 * power;
  });

  const height = rig.hologram.y - hall.floor;
  return (
    <group ref={root}>
      <group position={[0, -height / rig.hologramScale, 0]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[1.1, 1.35, 0.4, 40]} />
          <meshStandardMaterial color="#20242b" metalness={0.9} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.95, 48]} />
          <meshBasicMaterial color="#6fe2ff" toneMapped={false} />
        </mesh>
        <mesh ref={coneMesh} material={coneMaterial} position={[0, 0.42 + (height - 0.42) / 2, 0]}>
          <cylinderGeometry args={[1.4, 0.75, height - 0.42, 40, 1, true]} />
        </mesh>
      </group>
      <group ref={spin}>
        <mesh ref={shellMesh} geometry={shell} material={shellMaterial} scale={1.1} />
        <mesh ref={coreMesh} geometry={shell} material={coreMaterial} scale={0.38} />
        <lineSegments geometry={lattice}>
          <lineBasicMaterial color="#f4d675" transparent opacity={0.3} toneMapped={false} />
        </lineSegments>
        <points ref={motePoints} geometry={motes} material={moteMaterial} />
      </group>
      {/* Drawn after the rings and shell so the orbit lines never cross the logo or title. */}
      <mesh ref={label} material={labelMaterial} renderOrder={10}>
        <planeGeometry args={[2.05, 2.05]} />
      </mesh>
      <group ref={rings}>
        {[1.55, 1.85, 2.2].map((r, i) => (
          <mesh key={r} material={ringMaterial} rotation={[Math.PI / 2 + (i - 1) * 0.5, i * 0.6, 0]}>
            <torusGeometry args={[r, 0.012, 6, 96]} />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} color="#7fe4ff" distance={16} decay={2} intensity={0} />
    </group>
  );
}

/** Two restrained orbital-diagram panels floating near the window. */
function DataPanels({ state, reduceMotion }: { state: StationSceneState; reduceMotion: boolean }) {
  const left = useDisposable(() => createDataVizTexture(1));
  const right = useDisposable(() => createDataVizTexture(4));
  const materials = useDisposable(() => {
    const make = (map: Texture) =>
      new MeshBasicMaterial({ map, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide });
    const list = [make(left), make(right)];
    return { list, dispose: () => list.forEach((m) => m.dispose()) };
  }, [left, right]);
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    const power = MathUtils.smoothstep(state.interior, 0.2, 1);
    materials.list.forEach((m) => (m.opacity = 0.75 * power));
    if (group.current && !reduceMotion) group.current.position.y = Math.sin(clock.elapsedTime * 0.5) * 0.08;
  });
  return (
    <group ref={group}>
      <mesh material={materials.list[0]} position={[-5.4, 4.6, hall.back + 3]} rotation={[0, 0.35, 0]}>
        <planeGeometry args={[2.6, 2.6]} />
      </mesh>
      <mesh material={materials.list[1]} position={[5.4, 4.6, hall.back + 3]} rotation={[0, -0.35, 0]}>
        <planeGeometry args={[2.6, 2.6]} />
      </mesh>
    </group>
  );
}

interface StationInteriorProps {
  state: StationSceneState;
  rig: StationRig;
  materials: StationMaterials;
  glow: Texture;
  reduceMotion: boolean;
  isMobile: boolean;
  children?: ReactNode;
}

export default function StationInterior({ state, rig, materials, glow, reduceMotion, isMobile, children }: StationInteriorProps) {
  const group = useRef<Group>(null);
  const hallLight = useRef<PointLight>(null);
  const deckLight = useRef<PointLight>(null);

  useFrame(() => {
    const visible = state.gate > 0.001 || state.entry > 0;
    if (group.current) group.current.visible = visible;
    const power = MathUtils.smoothstep(state.gate, 0.1, 0.8);
    if (hallLight.current) hallLight.current.intensity = 55 * power;
    if (deckLight.current) deckLight.current.intensity = 40 * MathUtils.smoothstep(state.entry, 0.4, 1);
  });

  return (
    <group ref={group} visible={false}>
      <HallShell materials={materials} />
      <LandingPad materials={materials} state={state} />
      <ServiceArm materials={materials} state={state} reduceMotion={reduceMotion} />
      <DeckRailing materials={materials} />
      {rig.showConsoles
        ? rig.consoles.map((p, i) => <Console key={i} position={p} facing={rig.deckCam} seed={i + 1} materials={materials} />)
        : null}
      <AiHologram rig={rig} glow={glow} state={state} reduceMotion={reduceMotion} isMobile={isMobile} />
      <DataPanels state={state} reduceMotion={reduceMotion} />
      <pointLight ref={hallLight} color="#ffe9c8" distance={30} decay={1.6} intensity={0} position={[0, hall.ceiling - 1.2, -7]} />
      <pointLight ref={deckLight} color="#d6ecff" distance={28} decay={1.6} intensity={0} position={[0, hall.ceiling - 1.2, -24]} />
      {children}
    </group>
  );
}
