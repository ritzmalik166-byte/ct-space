"use client";

import Link from "next/link";
import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/media";
import { scrollToY } from "@/lib/scroll";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const EMAIL = "hello@contenaissance.com";
const PHONE = { label: "+971 4 800 2872", href: "tel:+97148002872" };
const LOCATION = "Greater Noida, India";
const MAX_MESSAGE = 1000;

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#disciplines" },
  { label: "Portfolio", href: "/#archive" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/#contact" },
];

const SOCIALS: { label: string; href: string; icon: ReactNode }[] = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/contenaissance",
    icon: (
      <path d="M20.45 2H3.55C2.7 2 2 2.7 2 3.55v16.9C2 21.3 2.7 22 3.55 22h16.9c.85 0 1.55-.7 1.55-1.55V3.55C22 2.7 21.3 2 20.45 2ZM8.06 19.04H5.09V9.5h2.97v9.54ZM6.58 8.2a1.72 1.72 0 1 1 0-3.44 1.72 1.72 0 0 1 0 3.44Zm12.46 10.84h-2.96v-4.64c0-1.1-.02-2.53-1.54-2.53-1.55 0-1.78 1.2-1.78 2.45v4.72H9.8V9.5h2.84v1.3h.04c.4-.75 1.37-1.54 2.81-1.54 3 0 3.56 1.98 3.56 4.55v5.23Z" />
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/contenaissance",
    icon: (
      <path d="M16.5 2h-9A5.5 5.5 0 0 0 2 7.5v9A5.5 5.5 0 0 0 7.5 22h9a5.5 5.5 0 0 0 5.5-5.5v-9A5.5 5.5 0 0 0 16.5 2ZM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm5.6-9.6a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/contenaissance",
    icon: (
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    ),
  },
];

const LEGAL = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookies Policy", href: "/cookies" },
];

const BUILD_YEAR = 2026;

function ColumnTitle({ children }: { children: ReactNode }) {
  return <p className="font-heading text-sm font-semibold text-white">{children}</p>;
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
      gsap.fromTo(
        ".js-ft-item",
        { autoAlpha: 0, y: reduced ? 0 : 24 },
        {
          autoAlpha: 1,
          y: 0,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "center bottom", scrub: 0.6 },
        },
      );
    },
    { scope: root },
  );

  const send = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const field = e.currentTarget.elements.namedItem("message") as HTMLInputElement;
    const message = field.value.trim().slice(0, MAX_MESSAGE);
    if (!message) return;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent("Hello from the website")}&body=${encodeURIComponent(message)}`;
    field.value = "";
  };

  return (
    <footer ref={root} className="relative z-10 overflow-hidden bg-black font-sans">
      <div className="mx-auto max-w-6xl px-6 pt-12 sm:pt-14 lg:px-12">
        <div className="js-ft-item flex flex-col items-center gap-6 lg:flex-row lg:justify-between">
          <h2 className="font-heading text-[clamp(2rem,3.6vw,2.6rem)] font-extrabold uppercase leading-none tracking-[-0.01em] text-white [text-shadow:0_4px_18px_rgb(255_255_255/0.45)]">
            Let&apos;s connect
          </h2>
          <form onSubmit={send} className="flex w-full max-w-xl items-center gap-4 lg:w-auto lg:flex-1 lg:justify-end">
            <label className="min-w-0 flex-1 lg:max-w-[20rem]">
              <span className="sr-only">Your message</span>
              <input
                name="message"
                required
                maxLength={MAX_MESSAGE}
                autoComplete="off"
                placeholder="Write your message here...."
                className="h-11 w-full rounded-full bg-[#d9d9d9] px-5 text-base text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#f07a22] sm:text-sm"
              />
            </label>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-full bg-white px-6 text-base font-semibold text-[#f07a22] transition-colors hover:bg-[#f07a22] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f07a22]"
            >
              Send
            </button>
          </form>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl gap-10 pb-16 text-center sm:grid-cols-3 sm:gap-6 sm:text-left">
          <nav aria-label="Quick links" className="js-ft-item">
            <ColumnTitle>Quick Links</ColumnTitle>
            <ul className="mt-2.5 space-y-1.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-xs uppercase tracking-[0.04em] text-white transition-colors hover:text-[#f07a22]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="js-ft-item flex flex-col items-center">
            <ColumnTitle>Follow us</ColumnTitle>
            <ul className="mt-3 flex items-center gap-3">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="grid size-10 place-items-center text-white transition-[color,translate] duration-300 hover:-translate-y-0.5 hover:text-[#f07a22]"
                  >
                    <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden>
                      {social.icon}
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => scrollToY(0)}
              className="group mt-7 flex h-9 items-center gap-3 rounded-full py-1 pl-4 pr-1 text-xs text-[#f07a22] ring-1 ring-[#f07a22]/80 transition-colors duration-300 hover:bg-[#f07a22]/10 focus-visible:outline-none focus-visible:ring-2"
            >
              Scroll to top
              <span className="grid size-7 place-items-center rounded-full bg-[#f5d3b8] text-white">
                <span className="grid size-5 place-items-center rounded-full bg-[#f07a22]">
                  <svg viewBox="0 0 16 16" className="size-3 transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden>
                    <path d="M8 13V3M4 7l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </span>
            </button>
          </div>

          <div className="js-ft-item sm:justify-self-end">
            <ColumnTitle>Contact</ColumnTitle>
            <ul className="mt-2.5 space-y-3 text-xs text-white">
              <li>
                <a href={`mailto:${EMAIL}`} className="transition-colors hover:text-[#f07a22]">
                  {EMAIL}
                </a>
              </li>
              <li>
                <a href={PHONE.href} className="transition-colors hover:text-[#f07a22]">
                  {PHONE.label}
                </a>
              </li>
              <li>{LOCATION}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-[linear-gradient(to_bottom,#000_0%,#f08b3f_30%,#f28a3e_55%,#f06a08_100%)] pb-8 pt-12 sm:pt-14">
        <p
          aria-hidden
          className="js-ft-item select-none whitespace-nowrap text-center font-heading text-[clamp(2rem,8.4vw,6.5rem)] font-extrabold leading-none tracking-[-0.01em] text-black"
        >
          CONTENAISSANCE
        </p>

        <div className="mt-10 flex flex-col items-center gap-5 px-6 text-xs text-neutral-900">
          <ul className="flex flex-wrap items-center justify-center gap-y-2 divide-x divide-neutral-900/60">
            {LEGAL.map((link) => (
              <li key={link.label} className="px-2 py-1">
                <Link href={link.href} className="transition-colors hover:text-black hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="px-2 py-1">
              Website by{" "}
              <a href="https://www.ritzmediaworld.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-black">
                ritzmediaworld
              </a>
            </li>
          </ul>
          <p>
            © <span ref={year}>{BUILD_YEAR}</span>&nbsp; Contenaissance. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
