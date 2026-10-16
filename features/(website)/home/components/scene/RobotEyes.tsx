"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Vector2, Vector4, type Points, type ShaderMaterial } from "three";
import type { HeroFxController } from "../../lib/heroSceneFx";
import { getHumanEyes } from "../../lib/particles/humanShape";
import { robotEyesFragment, robotEyesVertex } from "../../lib/shaders/morphParticles";

const UPPER_LID = 96;
const LOWER_LID = 48;

/**
 * Supplemental eye layer (blink lids, catchlight, glow) drawn in the character's local
 * space. Positions are computed in the shader from per-eye uniforms, so the
 * shared morph particles and their index correspondence are untouched.
 */
export default function RobotEyes({ fx }: { fx: HeroFxController }) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const { eye, kind, param } = useMemo(() => {
    const eyeArr: number[] = [];
    const kindArr: number[] = [];
    const paramArr: number[] = [];
    for (const side of [-1, 1]) {
      const add = (k: number, n: number, map: (i: number) => number) => {
        for (let i = 0; i < n; i++) {
          eyeArr.push(side);
          kindArr.push(k);
          paramArr.push(map(i));
        }
      };
      add(0, UPPER_LID, (i) => (i / (UPPER_LID - 1)) * 2 - 1);
      add(1, LOWER_LID, (i) => (i / (LOWER_LID - 1)) * 2 - 1);
      add(2, 1, () => 0);
      add(4, 1, () => 0);
    }
    return {
      eye: new Float32Array(eyeArr),
      kind: new Float32Array(kindArr),
      param: new Float32Array(paramArr),
    };
  }, []);

  const positions = useMemo(() => new Float32Array(eye.length * 3), [eye]);

  const uniforms = useMemo(() => {
    const { left, right } = getHumanEyes();
    return {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uVisible: { value: 0 },
      uOpacity: { value: 1 },
      uGlow: { value: 1 },
      uLeft: { value: new Vector4(left.x, left.y, left.z, left.rx) },
      uRight: { value: new Vector4(right.x, right.y, right.z, right.rx) },
      uRyUp: { value: left.ryUp },
      uRyLow: { value: left.ryLow },
      uBlink: { value: new Vector2() },
      uLidY: { value: new Vector2(left.lidY, right.lidY) },
      uGaze: { value: new Vector2() },
    };
  }, []);

  useFrame((state) => {
    const material = materialRef.current;
    const points = pointsRef.current;
    if (!material || !points) return;
    points.visible = fx.robotWeight > 0.01;
    if (!points.visible) return;
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = state.viewport.dpr;
    u.uVisible.value = fx.robotWeight;
    u.uGlow.value = fx.eyeGlow;
    (u.uBlink.value as Vector2).set(fx.blinkLeft, fx.blinkRight);
    (u.uGaze.value as Vector2).set(fx.gazeX, fx.gazeY);
  });

  return (
    <points ref={pointsRef} frustumCulled={false} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aEye" args={[eye, 1]} />
        <bufferAttribute attach="attributes-aKind" args={[kind, 1]} />
        <bufferAttribute attach="attributes-aParam" args={[param, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={robotEyesVertex}
        fragmentShader={robotEyesFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
