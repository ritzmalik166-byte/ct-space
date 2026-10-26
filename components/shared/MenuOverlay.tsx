"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";
import { SOCIALS, type FooterLink } from "./footerLinks";

gsap.registerPlugin(useGSAP);

/** Centre of the hamburger button, where the backdrop grows from. */
const ORIGIN = "calc(100% - 48px) 44px";
const clip = (radius: number) => `circle(${radius}% at ${ORIGIN})`;

type Props = { open: boolean; links: FooterLink[] };

/** Full-screen site menu. Links carry `data-menu-link` so the Navbar can close it before they act. */
export function MenuOverlay({ open, links }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const t = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
      t.fromTo(root.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 });

      if (prefersReducedMotion()) {
        t.fromTo(q(".js-menu-bg"), { opacity: 0 }, { opacity: 1, duration: 0.25 });
      } else {
        t.fromTo(q(".js-menu-veil"), { clipPath: clip(0) }, { clipPath: clip(150), duration: 0.7, ease: "power3.inOut" })
          .fromTo(q(".js-menu-bg"), { clipPath: clip(0) }, { clipPath: clip(150), duration: 0.75, ease: "power3.inOut" }, 0.08)
          .fromTo(
            q(".js-menu-stage"),
            { rotationX: 14, z: -220, transformPerspective: 1400, transformOrigin: "50% 0%" },
            { rotationX: 0, z: 0, duration: 0.9 },
            0.3,
          )
          .fromTo(
            q(".js-menu-link"),
            { rotationX: -95, yPercent: 40, autoAlpha: 0, transformPerspective: 900, transformOrigin: "50% 100%" },
            { rotationX: 0, yPercent: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08, ease: "power4.out" },
            0.38,
          )
          .fromTo(q(".js-menu-meta"), { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.06 }, 0.55);
      }
      tl.current = t;
    },
    { scope: root },
  );

  useEffect(() => {
    const t = tl.current;
    if (!t) return;
    if (open) {
      t.timeScale(1).play();
      const focus = gsap.delayedCall(0.1, () => root.current?.querySelector<HTMLElement>(".js-menu-link a")?.focus());
      return () => {
        focus.kill();
      };
    }
    t.timeScale(1.6).reverse();
  }, [open]);

  return (
    <div
      ref={root}
      id="site-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      inert={!open}
      data-lenis-prevent=""
      className="invisible fixed inset-0 z-40 overflow-hidden"
    >
      <div aria-hidden className="js-menu-veil absolute inset-0 bg-[#F4C542]" />
      <div
        aria-hidden
        className="js-menu-bg absolute inset-0 bg-space bg-[radial-gradient(ellipse_at_80%_10%,rgb(244_197_66/0.14),transparent_55%),radial-gradient(ellipse_at_10%_90%,rgb(90_120_255/0.1),transparent_50%)]"
      />

      <div className="js-menu-stage relative mx-auto flex h-full w-full max-w-7xl flex-col overflow-y-auto overscroll-contain px-6 pb-8 pt-5 md:pt-4 lg:px-12 lg:pt-4">
        <Link href="/" data-menu-link="" aria-label="Contenaissance home" className="js-menu-meta w-fit">
          <Image src="/images/contenaissance-logo.webp" width={274} height={133} alt="" className="h-12 w-auto lg:h-[72px]" />
        </Link>

        <nav aria-label="Main" className="my-auto py-6">
          <ul className="flex flex-col gap-1 sm:gap-2">
            {links.map((link, i) => (
              <li key={link.label} className="js-menu-link">
                <Link
                  href={link.href}
                  data-menu-link=""
                  className="group flex items-baseline gap-4 font-heading text-[clamp(1.6rem,min(6vw,6.5svh),3.5rem)] font-bold leading-[1.15] text-white transition-colors duration-300 hover:text-[#F4C542] focus-visible:text-[#F4C542] focus-visible:outline-none"
                >
                  <span className="w-7 shrink-0 font-sans text-xs font-semibold tracking-[0.2em] text-white/40 transition-colors group-hover:text-[#F4C542]/70">
                    0{i + 1}
                  </span>
                  <span className="transition-[translate] duration-500 group-hover:translate-x-2">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-6 border-t border-white/10 pt-6">
          <Link
            href="/contact"
            data-open-contact=""
            data-menu-link=""
            aria-haspopup="dialog"
            className="js-menu-meta inline-flex min-h-12 items-center gap-2 rounded-full bg-[#F4C542] px-7 font-sans text-base font-semibold text-black transition-colors hover:bg-[#ffd75e]"
          >
            Start a mission
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              <path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <ul className="js-menu-meta flex items-center gap-2.5">
            {SOCIALS.map((social) => (
              <li key={social.label}>
                <Link
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="grid size-11 place-items-center rounded-full text-white/85 ring-1 ring-white/15 transition-[color,background-color,translate] duration-300 hover:-translate-y-0.5 hover:bg-[#F4C542] hover:text-black hover:ring-[#F4C542]"
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
                    <path d={social.icon} />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
