
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const TONES = {
  dark: {
    title: "text-white",
    subtitle: "text-white",
  },
  light: {
    title: "text-black",
    subtitle: "text-black",
  },
};

type Props = {
  id: string;
  title: string;
  subtitle: string;
  tone?: keyof typeof TONES;
  start?: string;
  className?: string;
};

export function SectionHeading({
  id,
  title,
  subtitle,
  tone = "dark",
  start = "top 45%",
  className = "",
}: Props) {
  const root = useRef<HTMLElement>(null);
  const styles = TONES[tone];

  useGSAP(
    () => {
      const trigger = root.current?.closest("section") ?? root.current;
      if (!trigger) return;

      const tl = gsap.timeline({ paused: true });

      if (prefersReducedMotion()) {
        tl.fromTo(
          [".js-sh-word", ".js-sh-sub"],
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 0.8,
            stagger: 0.2,
          },
        );
      } else {
        tl.fromTo(
          ".js-sh-word",
          {
            yPercent: 100,
            rotateX: -80,
            autoAlpha: 0,
            transformOrigin: "50% 100%",
          },
          {
            yPercent: 0,
            rotateX: 0,
            autoAlpha: 1,
            duration: 1.6,
            stagger: 0.14,
            ease: "power3.out",
          },
          0.25,
        ).fromTo(
          ".js-sh-sub",
          {
            y: 24,
            autoAlpha: 0,
          },
          {
            y: 0,
            autoAlpha: 1,
            duration: 1.4,
            ease: "power2.out",
          },
          0.9,
        );
      }

      ScrollTrigger.create({
        trigger,
        start,
        onEnter: () => tl.timeScale(1).play(),
        onLeaveBack: () => tl.timeScale(1.8).reverse(),
      });
    },
    { scope: root, dependencies: [start] },
  );

  return (
    <header
      ref={root}
      className={`mx-auto flex max-w-[740px] flex-col items-center text-center ${className}`}
    >
      <h2
        id={id}
        className="font-heading text-[30px] font-extrabold uppercase leading-tight tracking-[-0.6px] sm:text-[38px]"
      >
        {title.split(" ").map((word, i) => (
          <span
            key={i}
            className="mr-[0.22em] inline-block pb-[0.1em] align-top last:mr-0"
          >
            <span className="inline-block overflow-hidden pb-[0.05em] align-top [perspective:600px]">
              <span
                className={`js-sh-word invisible inline-block font-extrabold ${styles.title}`}
              >
                {word}
              </span>
            </span>
          </span>
        ))}
      </h2>

<p
  className={`js-sh-sub invisible -mt-1 max-w-[540px] font-sans text-base font-normal leading-snug tracking-[-0.3px] sm:text-lg ${styles.subtitle}`}
>
  {subtitle}
</p>
    </header>
  );
}
