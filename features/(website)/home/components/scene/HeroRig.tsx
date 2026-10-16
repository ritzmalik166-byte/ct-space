"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group, type PerspectiveCamera } from "three";
import type { HeroFxController } from "../../lib/heroSceneFx";
import type { HeroSceneState } from "../../lib/heroSceneState";

interface HeroRigProps {
  sceneState: HeroSceneState;
  fx: HeroFxController;
  reduceMotion: boolean;
  children: ReactNode;
}

const BASE_CAM_Z = 11;
/** Approximate bounding radius shared by all three particle shapes. */
const SHAPE_RADIUS = 2.6;

/**
 * Places the particle object in the right column (or upper area on mobile),
 * applies the scroll-driven orientation and a damped pointer parallax.
 */
export default function HeroRig({ sceneState, fx, reduceMotion, children }: HeroRigProps) {
  const layout = useRef<Group>(null);
  const orient = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });

  useEffect(() => {
    if (reduceMotion || window.matchMedia("(pointer: coarse)").matches) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduceMotion]);

  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera;
    camera.position.z = sceneState.camZ;

    const { width, height } = state.size;
    const visibleH = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * BASE_CAM_Z;
    const visibleW = visibleH * (width / height);
    const mobile = width < 768;

    const fit = mobile
      ? Math.min(visibleW * 0.36, visibleH * 0.19)
      : Math.min(visibleH * 0.4, visibleW * 0.215);
    const x = mobile ? 0 : visibleW * 0.235;
    const y = mobile ? visibleH * 0.215 : 0;

    const p = pointer.current;
    const dt = Math.min(delta, 0.1);
    p.sx = MathUtils.damp(p.sx, p.x, 2.5, dt);
    p.sy = MathUtils.damp(p.sy, p.y, 2.5, dt);

    // Idle motion: a slow head sway for the robot, a hover and bank for the ship.
    const t = state.clock.elapsedTime;
    const idle = reduceMotion ? 0 : 1;
    const robot = fx.robotWeight * idle;
    const ship = MathUtils.smoothstep(sceneState.progress, 0.6, 1) * idle;
    const bob = Math.sin(t * 0.9) * 0.06 * ship + Math.sin(t * 0.55) * 0.035 * robot;

    if (layout.current) {
      layout.current.position.set(x, y + bob, 0);
      layout.current.scale.setScalar(fit / SHAPE_RADIUS);
    }
    if (orient.current) {
      // ZXY: rotY = heading, rotX = tilt towards camera, rotZ = on-screen roll.
      orient.current.rotation.set(
        sceneState.rotX + p.sy * 0.12 + Math.sin(t * 0.23 + 1.1) * 0.025 * robot,
        sceneState.rotY + p.sx * 0.22 + Math.sin(t * 0.31) * 0.06 * robot,
        sceneState.rotZ + Math.sin(t * 0.5) * 0.03 * ship,
        "ZXY",
      );
    }
  });

  return (
    <group ref={layout}>
      <group ref={orient}>{children}</group>
    </group>
  );
}
