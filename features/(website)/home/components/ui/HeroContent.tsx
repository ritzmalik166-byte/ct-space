import type { Ref } from "react";
import { HERO_STATES } from "../../lib/heroContent";
import HeroLayerContent from "./HeroLayerContent";

/** All three narrative layers stacked in one grid cell (no layout shift). */
export default function HeroContent({ ref }: { ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className="grid w-full max-w-[38rem]">
      {HERO_STATES.map((state, i) => (
        <HeroLayerContent key={state.id} content={state} index={i} />
      ))}
    </div>
  );
}
