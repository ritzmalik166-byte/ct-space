"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { BrandLogo } from "./BrandLogo";
gsap.registerPlugin(useGSAP);

const LINKS = [
  { label: "Work", href: "/#work" },
  { label: "Services", href: "/#services" },
  { label: "Studio", href: "/#studio" },
  { label: "Journal", href: "/#journal" },
];

/** Overlays the top of every page (3.75rem tall); pages leave that space free at the top. */
export function Navbar() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(root.current, { y: -16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, delay: 0.25, ease: "power3.out" });
    },
    { scope: root },
  );

  return (
    <header
      ref={root}
      className="js-reveal absolute inset-x-0 top-0 z-30 mx-auto flex w-full max-w-7xl items-center justify-between px-6 pt-6 lg:px-10"
    >
      <Link href="/" aria-label="Contenaissance home">
        <BrandLogo variant="inline" />
      </Link>

      <nav className="hidden items-center gap-8 md:flex">
        {LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="link-underline text-sm text-slate-400 transition-colors hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-5">
        <Link
          href="/#contact"
          className="rounded-full bg-white/[0.06] px-4 py-2 text-sm text-white ring-1 ring-white/15 transition-colors hover:bg-white hover:text-space"
        >
          Say hello
        </Link>
      </div>
    </header>
  );
}
