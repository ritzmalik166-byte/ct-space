"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";
import { BrandLogo } from "./BrandLogo";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const LINKS = [
  { label: "Services", href: "/#disciplines" },
  { label: "Portfolio", href: "/#archive" },
  { label: "Tours", href: "/#spaces" },
  { label: "Contact", href: "/#contact" },
  { label: "Instagram", href: "https://www.instagram.com/contenaissance", external: true },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/contenaissance", external: true },
  { label: "YouTube", href: "https://www.youtube.com/@contenaissance", external: true },
];

const BUILD_YEAR = 2026;

const LEGAL = [
  { label: "Privacy Protocol", href: "/privacy" },
  { label: "Cookies", href: "/cookies" },
];

export function Footer() {
  const root = useRef<HTMLElement>(null);
  const year = useRef<HTMLSpanElement>(null);

  // The page is prerendered, so the current year is only read in the browser.
  useEffect(() => {
    if (year.current) year.current.textContent = String(new Date().getFullYear());
  }, []);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      gsap.fromTo(
        ".js-ft-item",
        { autoAlpha: 0, y: reduced ? 0 : 24 },
        {
          autoAlpha: 1,
          y: 0,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: 0.6 },
        },
      );
    },
    { scope: root },
  );

  return (
    <footer ref={root} className="relative z-10 border-t border-white/[0.06] bg-space">
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-12 sm:pt-14 lg:px-10">
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
          <Link href="/" aria-label="Contenaissance home" className="js-ft-item">
            <BrandLogo />
          </Link>

          <nav aria-label="Footer" className="js-ft-item">
            <ul className="flex flex-wrap justify-center gap-x-7 gap-y-3 md:justify-end">
              {LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="link-underline text-xs text-slate-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="js-ft-item mt-10 flex flex-col items-center gap-3 border-t border-white/[0.06] pt-6 text-[11px] text-slate-500 sm:flex-row sm:justify-between">
          <p>
            ©<span ref={year}>{BUILD_YEAR}</span> Contenaissance. All rights reserved.
          </p>
          <ul className="flex items-center gap-3">
            {LEGAL.map((link, i) => (
              <li key={link.label} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden>•</span>}
                <Link href={link.href} className="transition-colors hover:text-white/70">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
