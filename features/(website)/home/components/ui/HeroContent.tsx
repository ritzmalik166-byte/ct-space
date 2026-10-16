import type { Ref } from "react";
import { HERO_STATES } from "../../lib/heroContent";
import HeroLayerContent from "./HeroLayerContent";
import HeroScrollProgress from "./HeroScrollProgress";

/** All three narrative layers stacked in one grid cell (no layout shift). */
export default function HeroContent({ ref }: { ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className="w-full max-w-[38rem]">
      <div className="grid w-full">
        {HERO_STATES.map((state, i) => (
          <HeroLayerContent key={state.id} content={state} index={i} />
        ))}
      </div>
      <HeroScrollProgress />
    </div>
  );
}
