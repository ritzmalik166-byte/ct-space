"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Plane, Raycaster, Vector2, Vector3, type Group, type PerspectiveCamera } from "three";
import type { HeroFxController } from "../../lib/heroSceneFx";
import type { HeroSceneState } from "../../lib/heroSceneState";
import { getHumanEyes } from "../../lib/particles/humanShape";
import { LOOK_PLANE_Z } from "../../lib/robotAwareness";
import type { ShipPose } from "../../lib/voyage/shipPose";
import type { VoyageLayout } from "../../lib/voyage/voyageLayout";

interface HeroRigProps {
  sceneState: HeroSceneState;
  fx: HeroFxController;
  reduceMotion: boolean;
  shipPose: ShipPose;
  layout: VoyageLayout;
  /** Placed with the character but never rotated, swayed or parallaxed by it. */
  environment?: ReactNode;
  children: ReactNode;
}

const BASE_CAM_Z = 11;
/** Approximate bounding radius shared by all three particle shapes. */
const SHAPE_RADIUS = 2.6;

/** Head-turn limits relative to the scroll keyframe (rad). Negative yaw = towards screen left. */
const YAW_MIN = -0.48;
const YAW_MAX = 0.3;
const PITCH_MIN = -0.12;
const PITCH_MAX = 0.16;
/** Share of a gaze shift taken by the head; the eyes cover the rest. */
const HEAD_SHARE = 0.75;
const AIM_SMOOTH = 0.34;
const RELEASE_SMOOTH = 0.45;

const EYE_Y = getHumanEyes().left.y;
const LOOK_PLANE = new Plane(new Vector3(0, 0, 1), -LOOK_PLANE_Z);
const aimRay = new Raycaster();
const aimNdc = new Vector2();
const aimPivot = new Vector3();
const aimPoint = new Vector3();
const voyageLook = new Vector3();

/** Critically damped spring (Unity-style SmoothDamp); continuous through retargeting. */
function smoothDamp(current: number, target: number, vel: { v: number }, smoothTime: number, dt: number) {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (vel.v + omega * change) * dt;
  vel.v = (vel.v - omega * temp) * exp;
  return target + (change + temp) * exp;
}

/**
 * Places the particle object in the right column (or upper area on mobile),
 * applies the scroll-driven orientation, a damped pointer parallax and, while
 * the character scans text, a head turn towards the hovered element.
 */
export default function HeroRig({ sceneState, fx, reduceMotion, shipPose, layout: voyage, environment, children }: HeroRigProps) {
  const stage = useRef<Group>(null);
  const layout = useRef<Group>(null);
  const orient = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const motion = useRef({ rx: 0, ry: 0, rz: 0, bob: 0, vx: { v: 0 }, vy: { v: 0 }, spring: false });
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
    if (sceneState.launch <= 0.001) {
      camera.position.set(0, 0, sceneState.camZ);
      camera.quaternion.identity();
      camera.up.set(0, 1, 0);
    }

    const { width, height } = state.size;
    const visibleH = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * BASE_CAM_Z;
    const visibleW = visibleH * (width / height);
    const mobile = width < 768;

    const fit = mobile
      ? Math.min(visibleW * 0.36, visibleH * 0.19)
      : Math.min(visibleH * 0.4, visibleW * 0.215);
    const x = mobile ? 0 : visibleW * 0.235;
    const y = mobile ? visibleH * 0.215 : 0;
    const scale = fit / SHAPE_RADIUS;

    const p = pointer.current;
    const dt = Math.min(delta, 0.1);
    p.sx = MathUtils.damp(p.sx, p.x, 2.5, dt);
    p.sy = MathUtils.damp(p.sy, p.y, 2.5, dt);

    // Idle motion: a very restrained head sway for the robot, a hover and bank for the ship.
    const t = state.clock.elapsedTime;
    const idle = reduceMotion ? 0 : 1;
    const robot = fx.robotWeight * idle;
    const forming = 1 - MathUtils.smoothstep(sceneState.shipForm, 0.15, 0.85);
    const ship = MathUtils.smoothstep(sceneState.progress, 0.6, 1) * idle * forming;

    // Rotation offsets on top of the scroll keyframe. While text is being
    // scanned the parallax/idle goal is replaced by a turn towards the text;
    // one spring drives both, so switching targets never restarts or fights.
    let goalX = p.sy * 0.12 + Math.sin(t * 0.23 + 1.1) * 0.015 * robot;
    let goalY = p.sx * 0.22 + Math.sin(t * 0.31) * 0.035 * robot;
    let bobGoal = Math.sin(t * 0.9) * 0.06 * ship + Math.sin(t * 0.55) * 0.025 * robot;
    const looking = fx.lookActive && !reduceMotion;
    if (looking) {
      const rect = state.gl.domElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Head pivot at eye height; the camera ray through the text centre
        // meets the shared look plane in front of the character.
        aimPivot.set(x, y + EYE_Y * scale, 0);
        aimNdc.set(((fx.lookX - rect.left) / rect.width) * 2 - 1, -((fx.lookY - rect.top) / rect.height) * 2 + 1);
        aimRay.setFromCamera(aimNdc, camera);
        if (aimRay.ray.intersectPlane(LOOK_PLANE, aimPoint)) {
          const d = aimPoint.sub(aimPivot).normalize();
          // Euler ZXY applies Y then X, so local +z maps to
          // (sin y, -cos y·sin x, cos y·cos x); invert for the face direction d.
          const yaw = Math.asin(MathUtils.clamp(d.x, -1, 1));
          const pitch = Math.atan2(-d.y, d.z);
          goalY = MathUtils.clamp((yaw - sceneState.rotY) * HEAD_SHARE, YAW_MIN, YAW_MAX);
          goalX = MathUtils.clamp((pitch - sceneState.rotX) * HEAD_SHARE, PITCH_MIN, PITCH_MAX);
          bobGoal = 0;
        }
      }
    }

    const m = motion.current;
    const k = 1 - Math.exp(-4 * dt);
    if (looking) m.spring = true;
    else if (m.spring && Math.abs(goalX - m.rx) + Math.abs(goalY - m.ry) < 0.004) m.spring = false;
    if (m.spring) {
      const smooth = looking ? AIM_SMOOTH : RELEASE_SMOOTH;
      m.rx = smoothDamp(m.rx, goalX, m.vx, smooth, dt);
      m.ry = smoothDamp(m.ry, goalY, m.vy, smooth, dt);
    } else {
      // Original parallax easing; its velocity seeds the spring when a scan starts.
      m.vx.v = ((goalX - m.rx) * k) / Math.max(dt, 1e-4);
      m.vy.v = ((goalY - m.ry) * k) / Math.max(dt, 1e-4);
      m.rx += (goalX - m.rx) * k;
      m.ry += (goalY - m.ry) * k;
    }
    m.rz += (Math.sin(t * 0.5) * 0.03 * ship - m.rz) * k;
    m.bob += (bobGoal - m.bob) * k;

    if (stage.current) {
      stage.current.position.set(x, y, 0);
      stage.current.scale.setScalar(scale);
    }
    if (layout.current) {
      layout.current.position.set(x, y + m.bob, 0);
      layout.current.scale.setScalar(scale);
    }
    if (orient.current) {
      // ZXY: rotY = heading, rotX = tilt towards camera, rotZ = on-screen roll.
      orient.current.rotation.set(sceneState.rotX + m.rx, sceneState.rotY + m.ry, sceneState.rotZ + m.rz, "ZXY");
      shipPose.copyFrom(orient.current);
    }

    if (sceneState.launch > 0.001) {
      const blend = MathUtils.smoothstep(sceneState.launch, 0.08, 1);
      camera.position.set(0, 0, sceneState.camZ).lerp(voyage.cameraPosition, blend);
      voyageLook.set(0, 0, 0).lerp(voyage.cameraTarget, blend);
      camera.up.set(0, 1, 0);
      camera.lookAt(voyageLook);
    }
  });

  return (
    <>
      <group ref={stage}>{environment}</group>
      <group ref={layout}>
        <group ref={orient}>{children}</group>
      </group>
    </>
  );
}
