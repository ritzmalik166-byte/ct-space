import { createHeroMorphData } from "./heroParticles";
import { createGalaxyDetail } from "./particles/galaxyDetail";
import { createHumanDetail, loadHumanMesh } from "./particles/humanShape";
import { createRandom } from "./particles/shapeUtils";

export type HeroGenerateKind = "morph" | "galaxyDetail" | "humanDetail";
export type HeroGenerateRequest = { kind: HeroGenerateKind; count: number };

/** Shared by the worker and the main-thread fallback. */
export async function generateHeroData({ kind, count }: HeroGenerateRequest) {
  switch (kind) {
    case "morph":
      return createHeroMorphData(count, await loadHumanMesh());
    case "humanDetail":
      return createHumanDetail(count, createRandom(4242), await loadHumanMesh());
    case "galaxyDetail":
      return createGalaxyDetail(count);
  }
}
