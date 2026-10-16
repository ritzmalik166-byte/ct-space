import { generateHeroData, type HeroGenerateRequest } from "./heroGenerate";

self.onmessage = async (event: MessageEvent<HeroGenerateRequest>) => {
  try {
    const data = await generateHeroData(event.data);
    const buffers = Object.values(data)
      .filter((value): value is Float32Array => value instanceof Float32Array)
      .map((array) => array.buffer);
    (self as unknown as Worker).postMessage(data, buffers);
  } catch (error) {
    (self as unknown as Worker).postMessage({ error: String(error) });
  }
};
