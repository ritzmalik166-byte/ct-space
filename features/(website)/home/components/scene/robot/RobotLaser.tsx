"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  type Group,
  type Object3D,
  type ShaderMaterial,
} from "three";
import type { HeroFxController } from "../../../lib/heroSceneFx";
import { RobotAwareness } from "../../../lib/robotAwareness";
import { ADDITIVE_GLOW } from "../../../lib/heroBlending";
import type { RobotInteraction } from "../../../lib/robotInteraction";
import {
  laserBeamFragment,
  laserBeamVertex,
  laserSparksFragment,
  laserSparksVertex,
} from "../../../lib/shaders/robotLaser";

const STREAM_PER_BEAM = 36;

function createBeamGeometry() {
  const position: number[] = [];
  const beam: number[] = [];
  const index: number[] = [];
  for (let b = 0; b < 2; b++) {
    const o = b * 4;
    position.push(0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0);
    beam.push(b, b, b, b);
    index.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(position), 3));
  geometry.setAttribute("aBeam", new BufferAttribute(new Float32Array(beam), 1));
  geometry.setIndex(index);
  return geometry;
}

function createSparkGeometry() {
  const beam: number[] = [];
  const kind: number[] = [];
  const seed: number[] = [];
  for (let b = 0; b < 2; b++) {
    for (let i = 0; i < STREAM_PER_BEAM; i++) {
      beam.push(b);
      kind.push(0);
      const h = Math.sin((b * STREAM_PER_BEAM + i + 1) * 12.9898) * 43758.5453;
      seed.push(h - Math.floor(h));
    }
    beam.push(b);
    kind.push(1);
    seed.push(0);
  }
  beam.push(0);
  kind.push(2);
  seed.push(0);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(beam.length * 3), 3));
  geometry.setAttribute("aBeam", new BufferAttribute(new Float32Array(beam), 1));
  geometry.setAttribute("aKind", new BufferAttribute(new Float32Array(kind), 1));
  geometry.setAttribute("aSeed", new BufferAttribute(new Float32Array(seed), 1));
  return geometry;
}

interface RobotLaserProps {
  fx: HeroFxController;
  interaction: RobotInteraction;
  anchorRef: RefObject<Object3D | null>;
  reduceMotion: boolean;
}

/**
 * Gaze + eye-laser driver. Must render after the rig so the eye anchor's
 * world matrix is current; it writes gaze back into `fx` for the eye shaders.
 */
export default function RobotLaser({ fx, interaction, anchorRef, reduceMotion }: RobotLaserProps) {
  const groupRef = useRef<Group>(null);
  const [awareness] = useState(() => new RobotAwareness());
  const beamGeometry = useMemo(() => createBeamGeometry(), []);
  const sparkGeometry = useMemo(() => createSparkGeometry(), []);

  const beamMaterialRef = useRef<ShaderMaterial>(null);
  const sparkMaterialRef = useRef<ShaderMaterial>(null);

  useEffect(
    () => () => {
      beamGeometry.dispose();
      sparkGeometry.dispose();
    },
    [beamGeometry, sparkGeometry],
  );

  // R3F clones the uniform wrappers on creation; share the controller's maps instead.
  useEffect(() => {
    if (beamMaterialRef.current && sparkMaterialRef.current) {
      awareness.bindMaterials(beamMaterialRef.current, sparkMaterialRef.current);
    }
  }, [awareness]);

  useFrame((state, delta) => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    awareness.update(
      {
        camera: state.camera,
        canvas: state.gl.domElement,
        anchor,
        time: state.clock.elapsedTime,
        delta,
        dpr: state.viewport.dpr,
        reduceMotion,
      },
      fx,
      interaction,
    );
    if (groupRef.current) groupRef.current.visible = awareness.visible;
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh geometry={beamGeometry} frustumCulled={false} renderOrder={20}>
        <shaderMaterial
          ref={beamMaterialRef}
          vertexShader={laserBeamVertex}
          fragmentShader={laserBeamFragment}
          uniforms={awareness.beamUniforms}
          side={DoubleSide}
          {...ADDITIVE_GLOW}
          depthTest={false}
        />
      </mesh>
      <points geometry={sparkGeometry} frustumCulled={false} renderOrder={21}>
        <shaderMaterial
          ref={sparkMaterialRef}
          vertexShader={laserSparksVertex}
          fragmentShader={laserSparksFragment}
          uniforms={awareness.sparkUniforms}
          {...ADDITIVE_GLOW}
          depthTest={false}
        />
      </points>
    </group>
  );
}
