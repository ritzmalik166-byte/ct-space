"use client";

import { useEffect, useState } from "react";
import { createHeroMorphData, type HeroMorphData } from "./heroParticles";

/**
 * Generates the morph buffers off the main thread (the robot's SDF sampling
 * is too heavy to run during hydration). Falls back to synchronous generation
 * where module workers are unavailable.
 */
export function useHeroMorphData(count: number): HeroMorphData | null {
  const [data, setData] = useState<HeroMorphData | null>(null);

  useEffect(() => {
    let cancelled = false;
    let worker: Worker | null = null;
    const deliver = (result: HeroMorphData) => {
      if (!cancelled) setData(result);
    };
    const fallback = () => {
      worker?.terminate();
      worker = null;
      setTimeout(() => deliver(createHeroMorphData(count)), 0);
    };

    try {
      worker = new Worker(new URL("./heroParticles.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<HeroMorphData>) => {
        deliver(event.data);
        worker?.terminate();
        worker = null;
      };
      worker.onerror = fallback;
      worker.postMessage({ count });
    } catch {
      fallback();
    }

    return () => {
      cancelled = true;
      worker?.terminate();
    };
  }, [count]);

  return data?.count === count ? data : null;
}
