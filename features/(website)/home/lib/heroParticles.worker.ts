import { createHeroMorphData, type HeroMorphData } from "./heroParticles";

self.onmessage = (event: MessageEvent<{ count: number }>) => {
  const data = createHeroMorphData(event.data.count);
  const buffers = Object.values(data)
    .filter((value): value is Float32Array => value instanceof Float32Array)
    .map((array) => array.buffer);
  (self as unknown as Worker).postMessage(data satisfies HeroMorphData, buffers);
};
