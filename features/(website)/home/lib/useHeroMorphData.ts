"use client";

import { useEffect, useState } from "react";
import { generateHeroData, type HeroGenerateKind, type HeroGenerateRequest } from "./heroGenerate";
import type { HeroMorphData } from "./heroParticles";
import type { GalaxyDetailData } from "./particles/galaxyDetail";
import type { HumanDetailData } from "./particles/humanShape";

/**
 * Generates particle buffers off the main thread (sampling the human scan and
 * the dense galaxy detail are too heavy to run during hydration). Falls back
 * to main-thread generation where module workers are unavailable.
 */
function useGeneratedData<T extends { count: number }>(kind: HeroGenerateKind, count: number): T | null {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    if (count <= 0) return;
    let cancelled = false;
    let worker: Worker | null = null;
    const request: HeroGenerateRequest = { kind, count };
    const deliver = (result: T) => {
      if (!cancelled) setData(result);
    };
    const fallback = () => {
      worker?.terminate();
      worker = null;
      setTimeout(() => {
        generateHeroData(request)
          .then((result) => deliver(result as unknown as T))
          .catch(() => {});
      }, 0);
    };

    try {
      worker = new Worker(new URL("./heroParticles.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<T | { error: string }>) => {
        worker?.terminate();
        worker = null;
        if ("error" in event.data) fallback();
        else deliver(event.data);
      };
      worker.onerror = fallback;
      worker.postMessage(request);
    } catch {
      fallback();
    }

    return () => {
      cancelled = true;
      worker?.terminate();
    };
  }, [kind, count]);

  return data?.count === count ? data : null;
}

export function useHeroMorphData(count: number): HeroMorphData | null {
  return useGeneratedData<HeroMorphData>("morph", count);
}

export function useGalaxyDetailData(count: number): GalaxyDetailData | null {
  return useGeneratedData<GalaxyDetailData>("galaxyDetail", count);
}

export function useHumanDetailData(count: number): HumanDetailData | null {
  return useGeneratedData<HumanDetailData>("humanDetail", count);
}
