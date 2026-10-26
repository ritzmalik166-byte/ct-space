"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { COUNTS, motion, pointer, scene, SCENE_READY_EVENT, type Quality } from "../lib/store";
import { CameraRig } from "./CameraRig";
import { Starfield } from "./Starfield";
import { NeuralNetwork } from "@/features/home/how-we-think/scene/NeuralNetwork";
import { FlowTimeline } from "@/features/home/blueprint/scene/FlowTimeline";

function detectQuality(): Quality {
  const cores = navigator.hardwareConcurrency ?? 4;
  return window.innerWidth < 768 || cores <= 4 ? "low" : "high";
}

/** Announces readiness after a few rendered frames, by which point the first shader compile is done. */
function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    if (scene.ready || ++frames.current < 3) return;
    scene.ready = true;
    window.dispatchEvent(new Event(SCENE_READY_EVENT));
  });
  return null;
}

export default function HeroCanvas() {
  const [quality] = useState<Quality>(detectQuality);
  const [maxDpr] = useState(() => Math.min(window.devicePixelRatio, quality === "high" ? 1.75 : 1.25));
  const [dpr, setDpr] = useState(maxDpr);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotion = () => {
      motion.reduced = media.matches;
      motion.speed = media.matches ? 0.25 : 1;
    };
    applyMotion();
    media.addEventListener("change", applyMotion);

    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      media.removeEventListener("change", applyMotion);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  const counts = COUNTS[quality];

  return (
    <div
      aria-hidden
      className={`absolute inset-0 transition-opacity duration-[1800ms] ease-out ${ready ? "opacity-100" : "opacity-0"}`}
    >
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 0, 26], fov: 42, near: 0.05, far: 200 }}
        gl={{ antialias: false, alpha: true, stencil: false, powerPreference: "high-performance" }}
        onCreated={() => setReady(true)}
      >
        <PerformanceMonitor
          flipflops={3}
          onIncline={() => setDpr(maxDpr)}
          onDecline={() => setDpr(1)}
          onFallback={() => setDpr(1)}
        />
        <ReadySignal />
        <Starfield count={counts.stars} />
        <CameraRig />
        <NeuralNetwork nodes={counts.network} dust={counts.dust} glows={counts.glows} />
        <FlowTimeline />
      </Canvas>
    </div>
  );
}
