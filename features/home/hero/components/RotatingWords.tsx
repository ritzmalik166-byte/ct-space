"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function RotatingWords({ words, delay = 0 }: { words: string[]; delay?: number }) {
  const root = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>(".js-rot", root.current);
      gsap.set(items, { yPercent: 110, autoAlpha: 0 });
      const tl = gsap.timeline({ repeat: -1, delay });
      items.forEach((item) => {
        tl.to(item, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out" }).to(
          item,
          { yPercent: -110, autoAlpha: 0, duration: 0.5, ease: "power3.in" },
          "+=2.2",
        );
      });
    },
    { scope: root },
  );

  return (
    <span ref={root} className="relative inline-grid overflow-hidden pb-[0.12em] align-bottom">
      {words.map((word) => (
        <span
          key={word}
          className="js-rot col-start-1 row-start-1 whitespace-nowrap font-heading font-semibold italic text-cyan-200"
        >
          {word}
        </span>
      ))}
    </span>
  );
}
