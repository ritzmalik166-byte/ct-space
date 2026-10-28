"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";
import { scrollToY } from "@/lib/scroll";
import { CONNECT, EXPLORE, LEGAL, SOCIALS, type FooterLink } from "./footerLinks";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const BUILD_YEAR = 2026;
const GOLD = "#F4C542";

function ArrowUpRight({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Socials() {
  return (
    <ul className="mt-4 flex items-center gap-2.5">
      {SOCIALS.map((social) => (
        <li key={social.label}>
          <Link
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            className="grid size-9 place-items-center rounded-full text-white/85 ring-1 ring-white/15 transition-[color,background-color,translate] duration-300 hover:-translate-y-0.5 hover:bg-[#F4C542] hover:text-black hover:ring-[#F4C542]"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
              <path d={social.icon} />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LinkColumn({ title, links, badge = false, children }: { title: string; links: FooterLink[]; badge?: boolean; children?: ReactNode }) {
  return (
    <nav aria-label={title} className="js-ft-item">
      <p className="text-[10px] uppercase tracking-[0.14em] text-white/70">{title}</p>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="group inline-flex items-center gap-1.5 text-sm text-white/85 transition-colors hover:text-white"
            >
              {link.label}
              {badge && (
                <span className="grid size-3.5 place-items-center rounded-[3px] bg-sky-200/90 text-[#0B1220] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                  <ArrowUpRight className="size-2.5" />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {children}
    </nav>
  );
}

function Orbit() {
  return (
    <div aria-hidden className="js-ft-orbit-wrap relative hidden size-[min(18rem,24vw,calc(100svh-24rem))] shrink-0 lg:block">
      <span className="js-ft-ring absolute inset-0 rounded-full border border-white/15" />
      <span className="js-ft-ring absolute inset-[16%] rounded-full border border-white/15" />
      <span className="js-ft-orbit absolute inset-0 rotate-[38deg]">
        <span className="absolute left-1/2 top-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_14px_rgb(244_197_66/0.7)]" style={{ background: GOLD }} />
      </span>
      <span className="js-ft-arrow absolute inset-0 grid place-items-center" style={{ color: GOLD }}>
        <svg viewBox="0 0 64 64" className="size-[24%]">
          <path d="M8 56 56 8M20 8h36v36" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
        </svg>
      </span>
    </div>
  );
}

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
      // The footer ends the page, so reveals must complete by the bottom of the scroll or they stay half-played.
      const reveal = { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: 0.8 };

      gsap
        .timeline({ defaults: { ease: "power3.out" }, scrollTrigger: reveal })
        .fromTo(".js-ft-eyebrow", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0)
        .fromTo(".js-ft-line", { yPercent: 105, rotate: reduced ? 0 : 3 }, { yPercent: 0, rotate: 0, duration: 0.6, stagger: 0.12 }, 0.05)
        .fromTo(".js-ft-cta", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.08 }, 0.4)
        .fromTo(".js-ft-ring", { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, stagger: 0.1 }, 0.15)
        .fromTo(".js-ft-arrow", { scale: 0.4, rotate: -45, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 0.5, ease: "back.out(1.8)" }, 0.45);

      gsap.fromTo(
        ".js-ft-item",
        { autoAlpha: 0, y: reduced ? 0 : 20 },
        {
          autoAlpha: 1,
          y: 0,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: { trigger: ".js-ft-base", start: "top bottom", endTrigger: root.current, end: "bottom bottom", scrub: 0.6 },
        },
      );

      if (!reduced) {
        const spin = gsap.to(".js-ft-orbit", { rotation: "+=360", duration: 16, ease: "none", repeat: -1, paused: true });
        ScrollTrigger.create({ trigger: root.current, start: "top bottom", end: "bottom top", onToggle: (s) => (s.isActive ? spin.play() : spin.pause()) });
      }
    },
    { scope: root },
  );

  return (
<footer
  ref={root}
  className="relative z-20 -mt-[100svh] overflow-hidden bg-[#0F1014] font-sans shadow-[0_-24px_60px_rgb(0_0_0/0.55)]"
>
  <div aria-hidden className="h-[10svh] bg-transparent" />
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-10 px-6 py-14 sm:px-10 sm:py-16 lg:px-12">
        <div className="min-w-0">
          <p className="js-ft-eyebrow text-[10px] uppercase tracking-[0.08em] text-slate-400 sm:text-[11px]">10 / Open a new flight plan</p>
          {/* Gradient text only paints inside its own box, so each line is padded to include descenders (y, g). */}
          <h2 className="mt-4 font-heading text-[clamp(2.4rem,5.4vw,4.75rem)] font-extrabold leading-[1.05] tracking-[-0.02em]">
            {["What’s your", "next big story?"].map((line) => (
              <span key={line} className="-mb-[0.12em] block overflow-hidden">
                <span className="js-ft-line block origin-bottom-left bg-[linear-gradient(180deg,#FFFFFF_0%,#E2E8F0_45%,#94A3B8_100%)] bg-clip-text pb-[0.16em] text-transparent">
                  {line}
                </span>
              </span>
            ))}
          </h2>
          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <button
              type="button"
              data-open-contact
              className="js-ft-cta group flex h-12 w-fit items-center gap-8 rounded-[4px] px-5 text-sm font-semibold text-black transition-[scale,box-shadow] duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_-12px_rgb(244_197_66/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              style={{ background: GOLD }}
            >
              Let&apos;s make it happen
              <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
            <p className="js-ft-cta max-w-[15rem] text-sm leading-relaxed text-slate-400">Bring the spark. We&apos;ll help you find a world it can live in.</p>
          </div>
        </div>
        <Orbit />
      </div>

      <div className="js-ft-base border-t border-white/10">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-6 pb-8 pt-8 sm:grid-cols-[1fr_auto] sm:px-10 lg:px-12">
          <div className="js-ft-item flex flex-col items-start gap-4">
            <Link href="/" aria-label="Contenaissance home" className="block">
              <Image src="/images/contenaissance-logo.webp" width={274} height={133} alt="Contenaissance" className="h-14 w-auto" />
            </Link>
            <p className="text-sm text-white/90">Human stories. Uncharted possibilities.</p>
          </div>
          <div className="grid grid-cols-2 gap-12 sm:gap-20">
            <LinkColumn title="Explore" links={EXPLORE} />
            <LinkColumn title="Connect" links={CONNECT} badge>
              <Socials />
            </LinkColumn>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-6 pb-6 text-[10px] uppercase tracking-[0.06em] sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-12">
          <p className="js-ft-item text-white/80">
            © <span ref={year}>{BUILD_YEAR}</span> Contenaissance. All rights reserved.
          </p>
          <ul className="js-ft-item flex gap-6 normal-case tracking-normal">
            {LEGAL.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-xs text-white/80 transition-colors hover:text-white">
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