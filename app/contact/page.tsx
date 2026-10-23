import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ContactForm } from "@/features/contact/components/ContactForm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact — Contenaissance",
  description: "Send Contenaissance a project brief. We reply within 24 hours to brand film, content, campaign and identity enquiries.",
};

const CHANNELS = [
  { label: "Write to us", value: "info@ritzmediaworld.com", href: "mailto:info@ritzmediaworld.com" },
  { label: "Call the studio", value: "+91 92205 16777", href: "tel:+919220516777" },
  {
    label: "Visit",
    value: "Corporate Park Tower A1, Sector 142, Noida",
    detail: "Unit 404, 4th Floor · Uttar Pradesh 201305",
    href: "https://www.google.com/maps/search/?api=1&query=Corporate+Park+Tower+A1+Sector+142+Noida",
  },
];

const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/contenaissance/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/contenaissance/" },
  { label: "YouTube", href: "https://www.youtube.com/@Contenaissance" },
  { label: "Facebook", href: "https://www.facebook.com/people/Contenaissance/61579738437856" },
  { label: "X", href: "https://x.com/contenaissance" },
];

const RISE = "animate-[rise_0.8s_cubic-bezier(0.22,1,0.36,1)_both]";
const delay = (step: number): CSSProperties => ({ animationDelay: `${0.09 * step}s` });

export default function ContactPage() {
  return (
    <main className="relative min-h-svh overflow-hidden px-6 pb-20 pt-28 sm:pt-32 lg:px-10">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[44rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgb(34_211_238/0.14),transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[22rem] h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent" />

      <div className="relative mx-auto max-w-4xl">
        <header className="text-center">
          <p className={`${RISE} inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-200 ring-1 ring-cyan-300/25`} style={delay(0)}>
            <span className="size-1.5 animate-[breathe_2.4s_ease-in-out_infinite] rounded-full bg-emerald-400" aria-hidden />
            Replies within 24 hours
          </p>
          <h1 className={`${RISE} mx-auto mt-6 max-w-3xl text-[clamp(2.6rem,7vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.045em]`} style={delay(1)}>
            Got a story worth <span className="italic text-cyan-200">launching?</span>
          </h1>
          <p className={`${RISE} mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg`} style={delay(2)}>
            Send us a short brief in three steps. A producer, not a bot, will read it and come back with ideas.
          </p>
        </header>

        <section
          aria-label="Project brief"
          className={`${RISE} relative mt-12 overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#08101d]/90 shadow-[0_50px_120px_-50px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.05)] sm:mt-14`}
          style={delay(3)}
        >
          <ContactForm />
        </section>

        <ul className="mt-16 grid gap-px overflow-hidden rounded-2xl bg-white/[0.06] sm:grid-cols-3">
          {CHANNELS.map((c, i) => (
            <li key={c.label} className={`${RISE} bg-space`} style={delay(4 + i)}>
              <Link
                href={c.href}
                {...(c.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group flex h-full flex-col p-6 transition-colors hover:bg-white/[0.02]"
              >
                <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  {c.label}
                  <svg viewBox="0 0 16 16" className="size-3 text-slate-600 transition-[color,translate] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-300" aria-hidden>
                    <path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="mt-4 text-lg font-semibold leading-snug text-white transition-colors group-hover:text-cyan-100">{c.value}</span>
                {c.detail && <span className="mt-1 text-xs text-slate-500">{c.detail}</span>}
              </Link>
            </li>
          ))}
        </ul>

        <nav aria-label="Social media" className={`${RISE} mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3`} style={delay(7)}>
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline font-mono text-xs uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-white"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </div>
    </main>
  );
}
