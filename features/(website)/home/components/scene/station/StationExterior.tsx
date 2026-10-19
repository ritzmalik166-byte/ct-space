"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  LatheGeometry,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  SpriteMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
  type Group,
  type PointLight,
  type Sprite,
  type Texture,
} from "three";
import { STATION } from "../../../lib/station/stationRig";
import type { StationSceneState } from "../../../lib/station/stationState";
import { createBulkhead, createCollar, createHullBody, createHullRib, worldUvs } from "../../../lib/station/stationGeometry";
import { createGateBrandTexture, createHazardTexture, GATE_BRAND_ASPECT } from "../../../lib/station/stationTextures";
import { STATION_GATE_BRAND } from "../../../lib/station/stationContent";
import { spillFragment, uvVertex } from "../../../lib/station/stationShaders";
import type { StationMaterials } from "./useStationMaterials";

export const GATEWAY_URL = "/assets/station/models/gateway-core.meshopt.glb";

const { opening, hull } = STATION;
const RIB_Z = [-3.4, -9.8, -16.2, -22.6, -29, -35.1];
const RING = { center: new Vector3(0, 2.3, -52), radius: 17, tube: 1.25 };
const GUIDE_LIGHTS = 12;
/** Brand display across both doors; sized to stay inside the visible opening. */
const BRAND_W = opening.halfW * 2 - 0.2;
const BRAND_H = BRAND_W / GATE_BRAND_ASPECT;

const _m = new Matrix4();
const _o = new Object3D();
const _c = new Color();

interface StationExteriorProps {
  state: StationSceneState;
  materials: StationMaterials;
  glow: Texture;
  reduceMotion: boolean;
  isMobile: boolean;
}

function useDisposable<T extends { dispose(): void }>(factory: () => T, deps: unknown[] = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  const value = useMemo(factory, deps);
  useEffect(() => () => value.dispose(), [value]);
  return value;
}

/** Hull windows on both flanks; instance colour mixes warm cabins, cool labs and dark rooms. */
function HullWindows({ isMobile }: { isMobile: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useDisposable(() => new BoxGeometry(0.06, 0.34, 0.62));
  const material = useDisposable(() => new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }));
  const slots = useMemo(() => {
    const out: Array<{ x: number; y: number; z: number; tone: number }> = [];
    const rows = isMobile ? [2.2] : [1.3, 3.1, 4.9];
    let k = 0;
    for (const side of [-1, 1])
      for (const y of rows)
        for (let z = -1.6; z > hull.back + 1; z -= 1.15) {
          if (RIB_Z.some((r) => Math.abs(r - z) < 0.75)) continue;
          k++;
          const tone = (Math.sin(k * 12.9898) * 43758.5453) % 1;
          out.push({ x: side * (hull.halfW + 0.02), y, z, tone: Math.abs(tone) });
        }
    return out;
  }, [isMobile]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    slots.forEach((slot, i) => {
      _o.position.set(slot.x, slot.y, slot.z);
      _o.updateMatrix();
      mesh.setMatrixAt(i, _o.matrix);
      const color = slot.tone < 0.18 ? "#11151b" : slot.tone < 0.62 ? "#ffd29a" : "#9fdfff";
      mesh.setColorAt(i, _c.set(color).multiplyScalar(slot.tone < 0.18 ? 1 : 1.25));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [slots]);

  return <instancedMesh ref={ref} args={[geometry, material, slots.length]} frustumCulled={false} />;
}

/** Symmetric service modules and vents along the roof: engineered rhythm, not scatter. */
function RoofModules({ materials }: { materials: StationMaterials }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useDisposable(() => worldUvs(new BoxGeometry(1, 1, 1), 0.5));
  const items = useMemo(() => {
    const out: Array<[number, number, number, number, number, number]> = [];
    for (let i = 0; i < 6; i++) {
      const z = -2.6 - i * 5.4;
      const w = i % 2 === 0 ? 2.6 : 1.8;
      out.push([-3.2, hull.top + 0.35, z, w, 0.7, 2.4]);
      out.push([3.2, hull.top + 0.35, z, w, 0.7, 2.4]);
      out.push([0, hull.top + 0.22, z - 1.6, 1.1, 0.44, 1.2]);
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach(([x, y, z, sx, sy, sz], i) => {
      _o.position.set(x, y, z);
      _o.scale.set(sx, sy, sz);
      _o.updateMatrix();
      mesh.setMatrixAt(i, _o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);
  return <instancedMesh ref={ref} args={[geometry, materials.gunmetal, items.length]} />;
}

function Antenna({ position, height, dish, materials }: { position: [number, number, number]; height: number; dish: number; materials: StationMaterials }) {
  const dishGeometry = useDisposable(() => {
    const points = Array.from({ length: 10 }, (_, i) => new Vector2((i / 9) * dish, (i / 9) ** 2 * dish * 0.35));
    return new LatheGeometry(points, 32);
  }, [dish]);
  return (
    <group position={position}>
      <mesh material={materials.aluminium} position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.07, 0.11, height, 10]} />
      </mesh>
      <mesh geometry={dishGeometry} material={materials.aluminium} position={[0, height, 0]} rotation={[-0.9, 0.3, 0]} />
      <mesh material={materials.gold} position={[0, height + 0.2, 0]}>
        <sphereGeometry args={[0.09, 12, 8]} />
      </mesh>
    </group>
  );
}

/** Lattice beam between two points (instanced struts on a square section). */
function Truss({ from, to, size, materials }: { from: Vector3; to: Vector3; size: number; materials: StationMaterials }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useDisposable(() => new CylinderGeometry(1, 1, 1, 6));
  const struts = useMemo(() => {
    const dir = to.clone().sub(from);
    const length = dir.length();
    dir.normalize();
    const side = new Vector3().crossVectors(dir, new Vector3(0, 1, 0)).normalize();
    if (side.lengthSq() < 0.5) side.set(1, 0, 0);
    const up = new Vector3().crossVectors(side, dir).normalize();
    const corners = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ].map(([a, b]) => side.clone().multiplyScalar(a * size).addScaledVector(up, b * size));
    const out: Array<[Vector3, Vector3, number]> = [];
    corners.forEach((c) => out.push([from.clone().add(c), to.clone().add(c), 0.07]));
    const bays = Math.max(2, Math.round(length / (size * 2.4)));
    for (let b = 0; b < bays; b++) {
      const t0 = b / bays;
      const t1 = (b + 1) / bays;
      const p0 = from.clone().lerp(to, t0);
      const p1 = from.clone().lerp(to, t1);
      for (let k = 0; k < 4; k++) {
        const a = corners[k];
        const n = corners[(k + 1) % 4];
        out.push([p0.clone().add(a), p0.clone().add(n), 0.045]);
        out.push([p0.clone().add(a), p1.clone().add(n), 0.035]);
      }
    }
    return out;
  }, [from, to, size]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const y = new Vector3(0, 1, 0);
    struts.forEach(([a, b, r], i) => {
      const d = b.clone().sub(a);
      _o.position.copy(a).add(b).multiplyScalar(0.5);
      _o.quaternion.setFromUnitVectors(y, d.clone().normalize());
      _o.scale.set(r, d.length(), r);
      _o.updateMatrix();
      mesh.setMatrixAt(i, _o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [struts]);

  return <instancedMesh ref={ref} args={[geometry, materials.aluminium, struts.length]} />;
}

/** Rotating habitat ring with spokes and lit cabin band. */
function HabitatRing({ materials, reduceMotion, isMobile }: { materials: StationMaterials; reduceMotion: boolean; isMobile: boolean }) {
  const group = useRef<Group>(null);
  const windows = useRef<InstancedMesh>(null);
  const torus = useDisposable(() => worldUvs(new TorusGeometry(RING.radius, RING.tube, 18, isMobile ? 96 : 160), 0.35), [isMobile]);
  const band = useDisposable(() => new TorusGeometry(RING.radius, RING.tube * 1.03, 4, isMobile ? 96 : 160, Math.PI * 2), [isMobile]);
  const windowGeometry = useDisposable(() => new BoxGeometry(0.5, 0.3, 0.08));
  const windowMaterial = useDisposable(() => new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }));
  const count = isMobile ? 64 : 120;

  useLayoutEffect(() => {
    const mesh = windows.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = RING.radius + RING.tube * 0.98;
      _o.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      _o.rotation.set(0, 0, a + Math.PI / 2);
      _o.updateMatrix();
      mesh.setMatrixAt(i, _o.matrix);
      const dark = (i * 7) % 11 === 0 || (i * 3) % 13 === 0;
      mesh.setColorAt(i, _c.set(dark ? "#141820" : i % 5 === 0 ? "#a6e6ff" : "#ffd9a6"));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame((_, delta) => {
    if (group.current && !reduceMotion) group.current.rotation.z += delta * 0.025;
  });

  return (
    <group position={RING.center}>
      <group ref={group}>
        <mesh geometry={torus} material={materials.hull} />
        <mesh geometry={band} material={materials.gunmetal} scale={[1, 1, 0.35]} />
        <instancedMesh ref={windows} args={[windowGeometry, windowMaterial, count]} frustumCulled={false} />
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={materials.aluminium} rotation={[0, 0, (i * Math.PI) / 3 + Math.PI / 6]}>
            <boxGeometry args={[RING.radius * 2, 0.42, 0.42]} />
          </mesh>
        ))}
      </group>
      <mesh material={materials.hull} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3.1, 3.1, 4.6, 32]} />
      </mesh>
      <mesh material={materials.gold} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.15, 0.12, 8, 48]} />
      </mesh>
    </group>
  );
}

/** NASA Gateway Core (public-domain NASA 3D Resources model), docked to the truss as the research wing. */
function GatewayComplex() {
  const gltf = useGLTF(GATEWAY_URL);
  const root = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.traverse((child) => {
      if (child instanceof Mesh) {
        const material = child.material as MeshStandardMaterial;
        material.envMapIntensity = 0.9;
        child.castShadow = false;
      }
    });
    return scene;
  }, [gltf]);
  return <primitive object={root} position={[19, 13, -66]} rotation={[0.25, -0.75, 0.35]} scale={0.62} />;
}

export default function StationExterior({ state, materials, glow, reduceMotion, isMobile }: StationExteriorProps) {
  const doorL = useRef<Group>(null);
  const doorR = useRef<Group>(null);
  const guide = useRef<InstancedMesh>(null);
  const beacons = useRef<Array<Sprite | null>>([]);
  const navLights = useRef<Array<Sprite | null>>([]);
  const gateLight = useRef<PointLight>(null);
  const seamMesh = useRef<Mesh>(null);
  const spillMesh = useRef<Mesh>(null);

  const body = useDisposable(createHullBody);
  const bulkhead = useDisposable(createBulkhead);
  const collar = useDisposable(createCollar);
  const rib = useDisposable(createHullRib);
  const doorW = opening.halfW + 0.4;
  const doorH = opening.top - opening.bottom + 0.5;
  const door = useDisposable(() => worldUvs(new BoxGeometry(doorW, doorH, 0.34), 0.35), [doorW, doorH]);
  const hazard = useDisposable(createHazardTexture);
  const seamMaterial = useDisposable(() => {
    hazard.repeat.set(1, 6);
    return new MeshStandardMaterial({ map: hazard, emissiveMap: hazard, emissive: new Color("#ffb347"), emissiveIntensity: 0.25, roughness: 0.6, metalness: 0.3 });
  }, [hazard]);
  const brandTexture = useDisposable(() => createGateBrandTexture(STATION_GATE_BRAND));
  const brandMaterial = useDisposable(() => new MeshBasicMaterial({ map: brandTexture, transparent: true, toneMapped: false }), [brandTexture]);
  const brandHalves = useDisposable(() => {
    const halves = [0, 0.5].map((offset) => {
      const geometry = new PlaneGeometry(BRAND_W / 2, BRAND_H);
      const uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5 + offset);
      return geometry;
    });
    return { left: halves[0], right: halves[1], dispose: () => halves.forEach((g) => g.dispose()) };
  });
  const lightGeometry = useDisposable(() => new BoxGeometry(0.28, 0.08, 0.28));
  const lightMaterial = useDisposable(() => new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }));
  const spill = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: uvVertex,
        fragmentShader: spillFragment,
        uniforms: { uIntensity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
  );
  const beaconMaterial = useDisposable(
    () => new SpriteMaterial({ map: glow, color: "#ffab3d", blending: AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }),
    [glow],
  );
  const navMaterials = useDisposable(
    () => {
      const make = (color: string) =>
        new SpriteMaterial({ map: glow, color, blending: AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
      const list = [make("#ff3b3b"), make("#3bff8a"), make("#ffffff")];
      return { list, dispose: () => list.forEach((m) => m.dispose()) };
    },
    [glow],
  );

  const ribMesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ribMesh.current;
    if (!mesh) return;
    RIB_Z.forEach((z, i) => {
      mesh.setMatrixAt(i, _m.makeTranslation(0, 0, z));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  const guideSlots = useMemo(() => {
    const out: Vector3[] = [];
    for (const side of [-1, 1])
      for (let i = 0; i < GUIDE_LIGHTS; i++) out.push(new Vector3(side * 5.45, opening.bottom - 0.68, STATION.collarZ + 0.6 + i * 0.95));
    return out;
  }, []);

  useLayoutEffect(() => {
    const mesh = guide.current;
    if (!mesh) return;
    guideSlots.forEach((p, i) => mesh.setMatrixAt(i, _m.makeTranslation(p.x, p.y, p.z)));
    mesh.instanceMatrix.needsUpdate = true;
  }, [guideSlots]);

  useFrame(({ clock }) => {
    const t = reduceMotion ? 0 : clock.elapsedTime;
    const { align, gate, entry } = state;

    // Doors: unlock (pull in), then slide into the bulkhead.
    const unlock = MathUtils.smoothstep(gate, 0, 0.18);
    const slide = MathUtils.smoothstep(gate, 0.15, 1);
    const travel = opening.halfW + 0.15;
    if (doorL.current) doorL.current.position.set(-doorW / 2 - slide * travel, (opening.top + opening.bottom) / 2, 0.42 - unlock * 0.1);
    if (doorR.current) doorR.current.position.set(doorW / 2 + slide * travel, (opening.top + opening.bottom) / 2, 0.42 - unlock * 0.1);
    if (seamMesh.current) (seamMesh.current.material as MeshStandardMaterial).emissiveIntensity = 0.25 + 1.6 * unlock * (1 - slide * 0.6);

    // Guidance runway: lights chase toward the bay once the ship is aligning.
    const power = MathUtils.smoothstep(align, 0, 0.6) * (1 - MathUtils.smoothstep(entry, 0.6, 1));
    const mesh = guide.current;
    if (mesh) {
      guideSlots.forEach((_, i) => {
        const k = i % GUIDE_LIGHTS;
        const chase = reduceMotion ? 0.6 : Math.pow(0.5 + 0.5 * Math.sin(t * 5 + k * 0.7), 6);
        const base = 0.12 + power * (0.35 + 0.9 * chase);
        mesh.setColorAt(i, _c.set(k > GUIDE_LIGHTS - 3 ? "#ffcf7a" : "#6fe2ff").multiplyScalar(base));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // Amber beacons rotate while the doors are moving.
    const moving = MathUtils.smoothstep(gate, 0, 0.05) * (1 - MathUtils.smoothstep(gate, 0.95, 1)) + 0.35 * power;
    beacons.current.forEach((sprite, i) => {
      if (!sprite) return;
      const pulse = reduceMotion ? 0.7 : 0.55 + 0.45 * Math.sin(t * 7 + i * Math.PI);
      sprite.material.opacity = Math.min(1, moving) * pulse;
      sprite.scale.setScalar(1.3 + 0.6 * pulse);
    });

    navLights.current.forEach((sprite, i) => {
      if (!sprite) return;
      const blink = reduceMotion ? 1 : (t * 0.8 + i * 0.33) % 1 < 0.12 ? 1 : 0.15;
      sprite.material.opacity = blink;
    });

    if (spillMesh.current) (spillMesh.current.material as ShaderMaterial).uniforms.uIntensity.value = MathUtils.smoothstep(gate, 0.1, 0.9) * (1 - MathUtils.smoothstep(entry, 0.25, 0.55)) * 0.9;
    if (gateLight.current) gateLight.current.intensity = (power * 18 + MathUtils.smoothstep(gate, 0.2, 1) * 30) * (1 - MathUtils.smoothstep(entry, 0.5, 0.9));
  });

  const midY = (opening.top + opening.bottom) / 2;
  const doorParts = (side: 1 | -1) => (
    <>
      <mesh geometry={door} material={materials.gunmetal} />
      <mesh ref={side === 1 ? seamMesh : undefined} material={seamMaterial} position={[side * (doorW / 2 - 0.16), 0, 0.18]}>
        <planeGeometry args={[0.3, doorH - 0.2]} />
      </mesh>
      <mesh material={materials.gold} position={[0, doorH / 2 - 0.45, 0.18]}>
        <boxGeometry args={[doorW - 0.8, 0.06, 0.02]} />
      </mesh>
      <mesh
        geometry={side === 1 ? brandHalves.left : brandHalves.right}
        material={brandMaterial}
        position={[side * (doorW / 2 - BRAND_W / 4), 0, 0.2]}
      />
    </>
  );
  const spineFrom = new Vector3(0, 2.3, hull.back);
  const trussFrom = useMemo(() => new Vector3(4.5, hull.top + 0.6, -30), []);
  const trussTo = useMemo(() => new Vector3(15.5, 12.4, -60), []);

  return (
    <group>
      <mesh geometry={body} material={[materials.hull, materials.hull]} />
      <mesh geometry={bulkhead} material={[materials.hull, materials.gunmetal]} />
      <mesh geometry={collar} material={[materials.gunmetal, materials.gunmetal]} />
      <instancedMesh ref={ribMesh} args={[rib, materials.gunmetal, RIB_Z.length]} />

      {/* Gold trim and cyan inner light strip around the opening. */}
      {[
        [0, opening.top + 1.18, opening.halfW * 2 + 2.6, 0.12],
        [0, opening.bottom - 1.18, opening.halfW * 2 + 2.6, 0.12],
      ].map(([x, y, w, h], i) => (
        <mesh key={`g${i}`} material={materials.gold} position={[x, y, STATION.collarZ - 0.05]}>
          <boxGeometry args={[w, h, 0.1]} />
        </mesh>
      ))}
      {[
        [0, opening.top + 0.06, opening.halfW * 2, 0.07, 0.07],
        [0, opening.bottom - 0.06, opening.halfW * 2, 0.07, 0.07],
        [-opening.halfW - 0.06, midY, 0.07, opening.top - opening.bottom, 0.07],
        [opening.halfW + 0.06, midY, 0.07, opening.top - opening.bottom, 0.07],
      ].map(([x, y, w, h, d], i) => (
        <mesh key={`c${i}`} material={materials.cyan} position={[x, y, STATION.collarZ - 0.1]}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      ))}

      {/* Doors. */}
      <group ref={doorL}>{doorParts(1)}</group>
      <group ref={doorR}>{doorParts(-1)}</group>
      <mesh ref={spillMesh} material={spill} position={[0, midY, -0.12]}>
        <planeGeometry args={[opening.halfW * 2, opening.top - opening.bottom]} />
      </mesh>
      <pointLight ref={gateLight} color="#9fe8ff" distance={22} decay={2} intensity={0} position={[0, midY, 4]} />

      {/* Guidance runway. */}
      {[-1, 1].map((side) => (
        <mesh key={side} material={materials.gunmetal} position={[side * 5.45, opening.bottom - 0.9, STATION.collarZ + 5.6]}>
          <boxGeometry args={[0.6, 0.32, 11.2]} />
        </mesh>
      ))}
      <instancedMesh ref={guide} args={[lightGeometry, lightMaterial, guideSlots.length]} frustumCulled={false} />

      {/* Warning beacons and navigation lights. */}
      {[-1, 1].map((side, i) => (
        <group key={side} position={[side * (opening.halfW + 1.25), opening.top + 1.25, STATION.collarZ + 0.1]}>
          <mesh material={materials.amber}>
            <cylinderGeometry args={[0.16, 0.2, 0.3, 12]} />
          </mesh>
          <sprite
            ref={(s) => {
              beacons.current[i] = s;
            }}
            material={beaconMaterial}
            scale={1.6}
          />
        </group>
      ))}
      {(
        [
          [-hull.halfW - 0.3, hull.top - 1.2, -1],
          [hull.halfW + 0.3, hull.top - 1.2, -1],
          [0, hull.top + 4.6, -26],
        ] as const
      ).map((p, i) => (
        <sprite
          key={i}
          ref={(s) => {
            navLights.current[i] = s;
          }}
          material={navMaterials.list[i]}
          position={p as unknown as [number, number, number]}
          scale={i === 2 ? 2.2 : 1.4}
        />
      ))}

      <HullWindows isMobile={isMobile} />
      <RoofModules materials={materials} />
      {[-1, 1].map((side) => (
        <mesh key={side} material={materials.aluminium} position={[side * (hull.halfW + 0.25), hull.bottom + 1.6, hull.back / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, -hull.back - 1, 12]} />
        </mesh>
      ))}
      <Antenna position={[-5.5, hull.top + 0.7, -20]} height={3.4} dish={1.4} materials={materials} />
      <Antenna position={[0, hull.top + 0.45, -26]} height={4.2} dish={0.8} materials={materials} />
      <Antenna position={[6, hull.top + 0.7, -12]} height={2.2} dish={1} materials={materials} />

      {/* Spine to the habitat ring, truss to the Gateway research wing. */}
      <mesh material={materials.hull} position={[0, spineFrom.y, (hull.back + RING.center.z - 6) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.2, 2.6, hull.back - (RING.center.z - 6), 28]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} material={materials.aluminium} position={[side * 8.5, 2.3, -43]}>
          <boxGeometry args={[11, 0.08, 4.2]} />
        </mesh>
      ))}
      <HabitatRing materials={materials} reduceMotion={reduceMotion} isMobile={isMobile} />
      <Truss from={trussFrom} to={trussTo} size={0.55} materials={materials} />
      <GatewayComplex />
    </group>
  );
}

useGLTF.preload(GATEWAY_URL);
