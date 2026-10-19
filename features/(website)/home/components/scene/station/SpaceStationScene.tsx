"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { MathUtils, PMREMGenerator, type DirectionalLight, type PerspectiveCamera, type Texture } from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { gsap } from "@/lib/gsap";
import { StationRig } from "../../../lib/station/stationRig";
import type { StationInteraction, StationSceneState } from "../../../lib/station/stationState";
import { createGlowTexture } from "../../../lib/station/stationTextures";
import SpaceEnvironment from "../SpaceEnvironment";
import DockingShip from "./DockingShip";
import ProjectorRig from "./ProjectorRig";
import StationExterior from "./StationExterior";
import StationInterior from "./StationInterior";
import StationScreens from "./StationScreens";
import StationSky, { SUN_DIRECTION } from "./StationSky";
import { useStationMaterials } from "./useStationMaterials";

/** Poly Haven CC0 HDRI, used only for interior reflections. */
const INTERIOR_HDR = "/assets/station/hdr/empty_warehouse_01_1k.hdr";

interface SpaceStationSceneProps {
  state: StationSceneState;
  interaction: StationInteraction;
  reduceMotion: boolean;
  isMobile: boolean;
  maxDpr: number;
  onReady: () => void;
}

/** Same pattern as the hero: GSAP's ticker renders frames so Lenis, ScrollTrigger and WebGL share one rAF. */
function TickerDriver({ activeRef }: { activeRef: RefObject<boolean> }) {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    const tick = (time: number) => {
      if (activeRef.current) advance(time);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [advance, activeRef]);
  return null;
}

function RigDriver({ rig, state, reduceMotion }: { rig: StationRig; state: StationSceneState; reduceMotion: boolean }) {
  useFrame((frame) => {
    const camera = frame.camera as PerspectiveCamera;
    rig.update(state, reduceMotion);
    camera.position.copy(rig.camPos);
    camera.lookAt(rig.camTarget);
    if (camera.fov !== rig.fov) {
      camera.fov = rig.fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();  }, -2);
  return null;
}

/** Swaps the procedural space environment for the CC0 interior HDRI once the camera is inside. */
function InteriorEnvironment({ state }: { state: StationSceneState }) {
  const gl = useThree((s) => s.gl);
  const hdr = useLoader(HDRLoader, INTERIOR_HDR);
  const env = useMemo(() => {
    const pmrem = new PMREMGenerator(gl);
    const texture = pmrem.fromEquirectangular(hdr).texture;
    pmrem.dispose();
    return texture;
  }, [gl, hdr]);
  const exterior = useRef<Texture | null>(null);
  useEffect(() => () => env.dispose(), [env]);

  useFrame(({ scene }) => {
    const inside = state.entry > 0.62;
    if (inside && scene.environment !== env) {
      exterior.current = scene.environment;
      scene.environment = env;
    } else if (!inside && scene.environment === env) {
      scene.environment = exterior.current;
    }
    scene.environmentIntensity = inside ? 0.6 : 0.75;
  });
  return null;
}

function Lights({ state }: { state: StationSceneState }) {
  const sun = useRef<DirectionalLight>(null);
  const rim = useRef<DirectionalLight>(null);
  useFrame(() => {
    const outside = 1 - MathUtils.smoothstep(state.entry, 0.5, 0.85) * 0.88;
    if (sun.current) sun.current.intensity = 3.4 * outside;
    if (rim.current) rim.current.intensity = 1.5 * outside;
  });
  return (
    <>
      <ambientLight color="#26324a" intensity={0.55} />
      <directionalLight ref={sun} color="#fff2df" intensity={3.4} position={SUN_DIRECTION.clone().multiplyScalar(60)} />
      <directionalLight ref={rim} color="#7fb8ff" intensity={1.5} position={[-40, 12, -50]} />
    </>
  );
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

function Station({ state, interaction, reduceMotion, isMobile, onReady, rig }: Omit<SpaceStationSceneProps, "maxDpr"> & { rig: StationRig }) {
  const size = useThree((s) => s.size);
  // Layout is idempotent; running it during render keeps slots valid for children on resize.
  rig.layout(size.width, size.height);
  const materials = useStationMaterials();
  const glow = useMemo(() => createGlowTexture(), []);
  useEffect(() => () => glow.dispose(), [glow]);

  return (
    <>
      <StationSky isMobile={isMobile} glow={glow} />
      <StationExterior state={state} materials={materials} glow={glow} reduceMotion={reduceMotion} isMobile={isMobile} />
      <StationInterior state={state} rig={rig} materials={materials} glow={glow} reduceMotion={reduceMotion} isMobile={isMobile}>
        <StationScreens rig={rig} state={state} interaction={interaction} materials={materials} glow={glow} reduceMotion={reduceMotion} />
        <ProjectorRig rig={rig} state={state} interaction={interaction} materials={materials} glow={glow} reduceMotion={reduceMotion} />
      </StationInterior>
      <DockingShip rig={rig} state={state} glow={glow} reduceMotion={reduceMotion} isMobile={isMobile} />
      <InteriorEnvironment state={state} />
      <Ready onReady={onReady} />
    </>
  );
}

export default function SpaceStationScene(props: SpaceStationSceneProps) {
  const { state, reduceMotion, maxDpr } = props;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const rig = useMemo(() => new StationRig(), []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      activeRef.current = entries[entries.length - 1].isIntersecting;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} aria-hidden className="absolute inset-0">
      <Canvas
        frameloop="never"
        dpr={[1, maxDpr]}
        camera={{ fov: 40, position: [36, 13, 92], near: 0.1, far: 1500 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => gl.setClearColor(0x02030a, 1)}
      >
        <TickerDriver activeRef={activeRef} />
        <RigDriver rig={rig} state={state} reduceMotion={reduceMotion} />
        <SpaceEnvironment />
        <Lights state={state} />
        <Suspense fallback={null}>
          <Station {...props} rig={rig} />
        </Suspense>
      </Canvas>
    </div>
  );
}
