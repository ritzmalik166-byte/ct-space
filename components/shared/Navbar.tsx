"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const LINKS = [
  { label: "Work", href: "/#archive" },
  { label: "Services", href: "/#disciplines" },
  { label: "Studio", href: "/#how-we-think" },
  { label: "Journal", href: "/blog" },
];

/** Below this scroll offset the bar always shows and stays transparent over the hero. */
const TOP_ZONE = 120;

/** Overlays the top of every page (3.75rem tall); pages leave that space free at the top. */
export function Navbar() {
  const root = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const menuOpen = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    menuOpen.current = open;
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useGSAP(
    () => {
      const bar = header.current;
      if (!bar) return;
      const reduced = prefersReducedMotion();
      gsap.fromTo(bar, { y: -16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, delay: 0.25, ease: "power3.out" });

      const setProgress = gsap.quickSetter(progress.current, "scaleX");
      let hidden = false;
      const show = (visible: boolean) => {
        if (hidden === !visible) return;
        hidden = !visible;
        gsap.to(bar, { yPercent: visible ? 0 : -130, duration: reduced ? 0 : 0.45, ease: visible ? "power3.out" : "power2.in", overwrite: "auto" });
      };

      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          setProgress(self.progress);
          const y = self.scroll();
          bar.dataset.scrolled = String(y > 40);
          if (y < TOP_ZONE || menuOpen.current) show(true);
          else show(self.direction < 0);
        },
      });
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      <div
        ref={progress}
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-cyan-500 via-cyan-300 to-cyan-200 shadow-[0_0_10px_rgb(34_211_238/0.6)]"
      />
      <header ref={header} data-scrolled="false" className="group/nav js-reveal fixed inset-x-0 top-0 z-30">
        <div
          aria-hidden
          className="absolute inset-0 border-b border-white/[0.06] bg-space/85 opacity-0 transition-opacity duration-500 group-data-[scrolled=true]/nav:opacity-100 md:bg-space/60 md:backdrop-blur-md"
        />
        <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-6 pb-3 pt-4 lg:px-10">
          <Link href="/" aria-label="Contenaissance home" className="shrink-0">
            <Image src="/images/contenaissance-logo.webp" width={274} height={133} alt="Contenaissance — Ritz GenAI Storytelling Studios" preload className="h-10 w-auto lg:h-13" />
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

          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              data-open-contact=""
              aria-haspopup="dialog"
              className="hidden rounded-full bg-white/[0.06] px-4 py-2 text-sm text-white ring-1 ring-white/15 transition-colors hover:bg-white hover:text-space md:inline-flex"
            >
              Say hello
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="relative grid size-10 place-items-center rounded-full bg-white/[0.06] ring-1 ring-white/15 md:hidden"
            >
              <span aria-hidden className={`absolute h-px w-4 bg-white transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-[3px]"}`} />
              <span aria-hidden className={`absolute h-px w-4 bg-white transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-[3px]"}`} />
            </button>
          </div>
        </div>

        <nav
          id="mobile-menu"
          aria-label="Mobile"
          inert={!open}
          className={`absolute inset-x-4 top-full rounded-2xl border border-white/10 bg-space/95 p-2 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.8)] transition-[opacity,transform] duration-300 md:hidden ${
            open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
          }`}
        >
          <ul>
            {LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center rounded-xl px-4 text-base text-slate-300 transition-colors active:bg-white/[0.06] active:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-1 border-t border-white/[0.06] p-2 pt-3">
              <Link
                href="/contact"
                data-open-contact=""
                aria-haspopup="dialog"
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center justify-center rounded-full bg-white text-sm font-medium text-space transition-colors active:bg-cyan-100"
              >
                Say hello
              </Link>
            </li>
          </ul>
        </nav>
      </header>
    </div>
  );
}
