"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { lockScroll } from "@/lib/scroll";
import { MenuOverlay } from "./MenuOverlay";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const LINKS = [
  { label: "Work", href: "/#archive" },
  { label: "Capabilities", href: "/#creative-services" },
  { label: "Our Approach", href: "/#how-we-think" },

];

/** Past this share of the viewport the full bar folds away and the hamburger takes over. */
const COMPACT_AT = 0.75;

const FOLD = "transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-0 group-data-[compact=true]/nav:opacity-0";

function ArrowUpRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Overlays the top of every page; pages leave that space free at the top. */
export function Navbar() {
  const root = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  const nav = useRef<HTMLElement>(null);
  const burger = useRef<HTMLButtonElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const locked = useRef(false);
  const [open, setOpen] = useState(false);

  const setMenu = useCallback((next: boolean) => {
    if (next === locked.current) return;
    locked.current = next;
    lockScroll(next);
    setOpen(next);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      burger.current?.focus();
    };
    // Capture on window runs before the document-level hash and contact handlers, so scrolling is unlocked when they act.
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest("[data-menu-link]")) setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick, true);
    };
  }, [open, setMenu]);

  useEffect(() => () => {
    if (locked.current) lockScroll(false);
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      const bar = header.current;
      const links = nav.current;
      const btn = burger.current;
      if (!el || !bar || !links || !btn) return;
      gsap.fromTo(bar, { y: -16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, delay: 0.25, ease: "power3.out" });
      gsap.fromTo(".js-burger-in", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, delay: 0.25 });

      const desktop = window.matchMedia("(min-width: 768px)");
      const setProgress = gsap.quickSetter(progress.current, "scaleX");
      let compact = false;
      const sync = () => {
        el.dataset.compact = String(compact);
        links.inert = compact;
        btn.inert = desktop.matches && !compact && !locked.current;
      };
      sync();
      desktop.addEventListener("change", sync);

      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          setProgress(self.progress);
          const y = self.scroll();
          const scrolled = String(y > 40);
          if (el.dataset.scrolled !== scrolled) el.dataset.scrolled = scrolled;
          const next = y > window.innerHeight * COMPACT_AT;
          if (next !== compact) {
            compact = next;
            sync();
          }
        },
      });
      return () => desktop.removeEventListener("change", sync);
    },
    { scope: root },
  );

  return (
    <div ref={root} data-scrolled="false" data-compact="false" data-open={open} className="group/nav">
      <div
        ref={progress}
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[45] h-[2px] origin-left scale-x-0 bg-gradient-to-r from-[#b8863f] via-[#e3b56a] to-[#f5d9a0] shadow-[0_0_10px_rgb(227_181_106/0.6)]"
      />
      <header ref={header} className="js-reveal fixed inset-x-0 top-0 z-30 group-data-[compact=true]/nav:pointer-events-none">
        <div
          aria-hidden
          className="absolute inset-0 border-b border-white/[0.06] bg-space/85 opacity-0 transition-opacity duration-500 group-data-[scrolled=true]/nav:opacity-100 group-data-[compact=true]/nav:opacity-0! md:bg-space/60 md:backdrop-blur-md"
        />
        <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4 [perspective:900px] lg:px-12">
          <Link
            href="/"
            aria-label="Contenaissance home"
            className="pointer-events-auto shrink-0 origin-left transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-0 group-data-[compact=true]/nav:scale-[0.85]"
          >
            <Image src="/images/contenaissance-logo.webp" width={274} height={133} alt="Contenaissance — Ritz GenAI Storytelling Studios" preload className="h-12 w-auto lg:h-[72px] lg:w-[148px]" />
          </Link>

          <nav ref={nav} aria-label="Main" className="hidden items-center gap-6 md:flex lg:gap-9">
            {LINKS.map((link, i) => (
              <Link
                key={link.label}
                href={link.href}
                style={{ transitionDelay: `${i * 60}ms` }}
                className={`link-underline origin-top font-sans text-base font-semibold capitalize leading-none tracking-normal text-[#F0F2EF] ${FOLD} hover:text-white group-data-[compact=true]/nav:[transform:rotateX(90deg)_translateY(-30%)]`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contact"
              data-open-contact=""
              aria-haspopup="dialog"
              style={{ transitionDelay: `${LINKS.length * 60}ms` }}
              className={`group inline-flex origin-top items-center gap-2 font-sans text-base font-semibold capitalize leading-none tracking-normal text-[#DAAF25] ${FOLD} hover:text-[#f0c94a] group-data-[compact=true]/nav:[transform:rotateX(90deg)_translateY(-30%)]`}
            >
              Start a mission
              <ArrowUpRight className="size-3.5 transition-[translate] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </nav>
          <span aria-hidden className="size-10 md:hidden" />
        </div>
      </header>

      <MenuOverlay open={open} links={LINKS} />

      <button
        ref={burger}
        type="button"
        onClick={() => setMenu(!open)}
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="group/burger fixed right-6 top-5 z-50 grid size-10 place-items-center rounded-full bg-black/50 ring-1 ring-white/15 backdrop-blur-md transition-[transform,opacity,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:ring-[#F4C542]/70 group-data-[open=true]/nav:bg-transparent group-data-[open=true]/nav:ring-[#F4C542]/60 md:top-4 md:size-12 md:pointer-events-none md:opacity-0 md:[transform:perspective(600px)_rotateY(90deg)_scale(0.6)] md:group-data-[compact=true]/nav:pointer-events-auto md:group-data-[compact=true]/nav:opacity-100 md:group-data-[compact=true]/nav:[transform:perspective(600px)_rotateY(0deg)_scale(1)] md:group-data-[open=true]/nav:pointer-events-auto md:group-data-[open=true]/nav:opacity-100 md:group-data-[open=true]/nav:[transform:perspective(600px)_rotateY(0deg)_scale(1)] lg:right-[max(3rem,calc((100vw-80rem)/2+3rem))] lg:top-7"
      >
        <span className="js-burger-in relative block h-3 w-[18px] md:w-5">
          {["top-0 group-data-[open=true]/nav:top-1/2 group-data-[open=true]/nav:rotate-45", "top-1/2 group-data-[open=true]/nav:scale-x-0 group-data-[open=true]/nav:opacity-0", "top-full group-data-[open=true]/nav:top-1/2 group-data-[open=true]/nav:-rotate-45"].map((line) => (
            <span
              key={line}
              aria-hidden
              className={`absolute left-0 h-[1.5px] w-full -translate-y-1/2 rounded-full bg-white transition-[top,rotate,scale,opacity] duration-300 ${line}`}
            />
          ))}
        </span>
      </button>
    </div>
  );
}
