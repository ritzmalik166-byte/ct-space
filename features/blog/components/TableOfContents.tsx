"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { scrollToY } from "@/lib/scroll";
import type { TocEntry } from "../lib/content";
import Link from "next/link";

const NAV_OFFSET = 96;

/** Article outline; highlights the section being read and scrolls below the fixed navbar. */
export function TableOfContents({ entries, compact = false }: { entries: TocEntry[]; compact?: boolean }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (compact) return;
    const headings = entries.map((e) => document.getElementById(e.id)).filter((el): el is HTMLElement => el !== null);
    if (!headings.length) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          if (r.isIntersecting) visible.add(r.target.id);
          else visible.delete(r.target.id);
        }
        const first = headings.find((h) => visible.has(h.id));
        if (first) setActive(first.id);
      },
      { rootMargin: `-${NAV_OFFSET}px 0px -65% 0px` },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [entries, compact]);

  const onClick = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    e.currentTarget.closest("details")?.removeAttribute("open");
    scrollToY(target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET);
    history.replaceState(null, "", `#${id}`);
    setActive(id);
  };

  return (
    <ol className={compact ? "space-y-1" : "space-y-0.5 border-l border-white/[0.08]"}>
      {entries.map((entry) => {
        const current = active === entry.id;
        return (
          <li key={entry.id}>
            <Link
              href={`#${entry.id}`}
              onClick={(e) => onClick(e, entry.id)}
              aria-current={current ? "location" : undefined}
              className={`block py-1.5 text-[13px] leading-snug transition-colors ${
                compact ? `${entry.level === 3 ? "pl-4" : ""} text-slate-300 hover:text-white` : `-ml-px border-l pr-2 ${entry.level === 3 ? "pl-7" : "pl-4"} ${
                  current ? "border-cyan-300 text-white" : "border-transparent text-slate-400 hover:border-white/30 hover:text-slate-200"
                }`
              }`}
            >
              {entry.text}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
