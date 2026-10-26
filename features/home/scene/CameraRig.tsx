"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { fades, journey, motion, NET_TRAVEL, pointer, view } from "../lib/store";
import {
  FLOW_CENTER,
  FLOW_FILL,
  FLOW_SCREEN_Y,
  flowHalfWidth,
  JOURNEY_PATH,
  LOOK_AHEAD,
  PATH_START,
} from "./journeyPath";

const INTRO_SECONDS = 3.2;
const ARCH_PULLBACK = new THREE.Vector3(0, 2.4, 8);
const ARCH_LOOK_DROP = new THREE.Vector3(0, -1.2, 0);
const IMPACT_PULLBACK = new THREE.Vector3(0, 3, 9);
const REVIEW_DRIFT = new THREE.Vector3(0, 2, -12);
const { clamp, damp, lerp, smoothstep } = THREE.MathUtils;
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

export function CameraRig() {
  const width = useThree((s) => s.size.width);
  const sway = useRef({ x: 0, y: 0 });

  const pathPoint = useMemo(() => new THREE.Vector3(), []);
  const aheadPoint = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const flowCamera = useMemo(() => new THREE.Vector3(), []);
  const flowLook = useMemo(() => new THREE.Vector3(), []);
  const impactLook = useMemo(() => new THREE.Vector3(), []);

  const isDesktop = width >= 1024;
  const isMobile = width < 640;
  const offsetX = isDesktop ? 3.6 : 0;
  const restZ = isDesktop ? 9 : isMobile ? 13 : 11;

  useFrame((state, delta) => {
    view.dive = damp(view.dive, journey.dive, 4.5, delta);
    view.net = damp(view.net, journey.net, 3.5, delta);
    view.tv = damp(view.tv, journey.tv, 3.5, delta);
    view.flow = damp(view.flow, journey.flow, 3, delta);
    view.arch = damp(view.arch, journey.arch, 3, delta);
    view.impact = damp(view.impact, journey.impact, 3, delta);
    view.review = damp(view.review, journey.review, 3, delta);
    const tvEase = easeInOutCubic(clamp(view.tv, 0, 1));
    const flowEase = easeInOutCubic(smoothstep(view.flow, 0.03, 0.26));

    const d = clamp(view.dive, 0, 1);
    const dEase = easeInOutCubic(d);
    const net = easeInOutSine(clamp(view.net, 0, 1)) * Math.min(NET_TRAVEL, 1 - LOOK_AHEAD);

    fades.network.value = smoothstep(d, 0.45, 1) * (1 - tvEase * 0.45 * (1 - flowEase)) * (1 - flowEase * 0.6);
    fades.flow.value = smoothstep(view.flow, 0.05, 0.22);

    const fov = 42 + Math.sin(Math.PI * d) * 16 + dEase * 8;

    const intro = motion.reduced ? 1 : easeOutCubic(Math.min(state.clock.elapsedTime / INTRO_SECONDS, 1));
    const introZ = lerp(26, restZ, intro);
    const zDive = lerp(introZ, PATH_START.z, dEase);

    JOURNEY_PATH.getPointAt(net, pathPoint);
    JOURNEY_PATH.getPointAt(net + LOOK_AHEAD, aheadPoint);

    const swayAmount = lerp(1, 0.35, dEase);
    sway.current.x = damp(sway.current.x, pointer.x * 0.7 * swayAmount, 2.2, delta);
    sway.current.y = damp(sway.current.y, pointer.y * 0.45 * swayAmount, 2.2, delta);

    const cam = state.camera as THREE.PerspectiveCamera;
    cam.position.set(
      pathPoint.x + sway.current.x,
      pathPoint.y + sway.current.y,
      zDive + (pathPoint.z - PATH_START.z),
    );
    if (tvEase > 0) {
      forward.subVectors(aheadPoint, pathPoint).normalize();
      cam.position.addScaledVector(forward, tvEase * 2.5);
    }

    lookTarget.set(offsetX * 0.35, 0, 0).lerp(aheadPoint, dEase);

    if (flowEase > 0) {
      // Distance at which the timeline spans FLOW_FILL of the viewport, so 3D nodes align with the DOM columns.
      const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov / 2));
      const dist = flowHalfWidth(cam.aspect) / (FLOW_FILL * tanHalf * cam.aspect);
      flowCamera.set(FLOW_CENTER.x, FLOW_CENTER.y - FLOW_SCREEN_Y * dist * tanHalf, FLOW_CENTER.z + dist);
      flowLook.set(flowCamera.x, flowCamera.y, FLOW_CENTER.z);
      cam.position.lerp(flowCamera, flowEase);
      lookTarget.lerp(flowLook, flowEase);

      // Development Archive: pull up and back so the blueprint floor opens out beneath the gallery.
      const archEase = easeInOutCubic(smoothstep(view.arch, 0.02, 0.3));
      if (archEase > 0) {
        cam.position.lerp(flowCamera.add(ARCH_PULLBACK), archEase);
        lookTarget.lerp(flowLook.add(ARCH_LOOK_DROP), archEase);
      }

      // Our Impact: pull back and tilt up to the horizon over the blueprint floor.
      const impactEase = easeInOutCubic(smoothstep(view.impact, 0.02, 0.3));
      if (impactEase > 0) {
        cam.position.lerp(flowCamera.add(IMPACT_PULLBACK), impactEase);
        lookTarget.lerp(impactLook.set(FLOW_CENTER.x, FLOW_CENTER.y + 1.5, FLOW_CENTER.z - 12), impactEase);
      }

      // Client reviews: glide out over the skyline towards the open sky the transmission comes from.
      const reviewEase = easeInOutCubic(smoothstep(view.review, 0.02, 0.3));
      if (reviewEase > 0) {
        cam.position.lerp(flowCamera.add(REVIEW_DRIFT), reviewEase);
        lookTarget.lerp(impactLook.set(FLOW_CENTER.x, FLOW_CENTER.y + 4, FLOW_CENTER.z - 30), reviewEase);
      }
    }
    cam.lookAt(lookTarget);

    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
