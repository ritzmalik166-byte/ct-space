"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/media";
import { BlogResults } from "./BlogResults";
import { DEFAULT_QUERY, MAX_QUERY_LENGTH, parseQuery, runQuery, SORTS, toSearchString, type BlogQuery, type Facets, type SortKey } from "../lib/query";
import { TOPIC_LABELS } from "../lib/topics";
import type { BlogSummary } from "../lib/types";

const SEARCH_DELAY_MS = 250;

/** Search, filters, sorting and pagination run in the browser over the cached listing; state lives in the URL. */
export function BlogExplorer({ posts, facets }: { posts: BlogSummary[]; facets: Facets }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const top = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const query = useMemo(() => parseQuery(params, facets), [params, facets]);
  const result = useMemo(() => runQuery(posts, query, TOPIC_LABELS), [posts, query]);

  // Keep the field in sync when the URL changes from outside (back/forward, clear filters).
  const [draft, setDraft] = useState(query.q);
  const [syncedQ, setSyncedQ] = useState(query.q);
  if (syncedQ !== query.q) {
    setSyncedQ(query.q);
    setDraft(query.q);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const go = (patch: Partial<BlogQuery>, mode: "push" | "replace" = "push") => {
    const next = `${pathname}${toSearchString({ ...query, page: 1, ...patch })}`;
    router[mode](next, { scroll: false });
  };

  const onSearch = (value: string) => {
    setDraft(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => go({ q: value.trim().slice(0, MAX_QUERY_LENGTH) }, "replace"), SEARCH_DELAY_MS);
  };

  const toTop = () => top.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });

  const filtered = query.q || query.topic || query.year || query.sort !== DEFAULT_QUERY.sort;

  return (
    <div ref={top} className="scroll-mt-24">
      <BlogControls>
        <label className="relative block min-w-0 basis-full sm:flex-1 sm:basis-auto">
          <span className="sr-only">Search articles</span>
          <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={draft}
            maxLength={MAX_QUERY_LENGTH}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search articles"
            className="h-11 w-full rounded-full border border-white/10 bg-[#070b14]/90 pl-11 pr-4 text-base text-white placeholder:text-slate-500 transition-colors focus:border-cyan-400/60 focus:outline-none sm:text-sm"
          />
        </label>

        <Select label="Sort by" value={query.sort} onChange={(v) => go({ sort: v as SortKey })}>
          {Object.entries(SORTS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>

        {facets.years.length > 1 && (
          <Select label="Year" value={query.year ? String(query.year) : ""} onChange={(v) => go({ year: v ? Number(v) : null })}>
            <option value="">All years</option>
            {facets.years.map(({ year, count }) => (
              <option key={year} value={year}>
                {year} ({count})
              </option>
            ))}
          </Select>
        )}
      </BlogControls>

      {facets.topics.length > 1 && (
        <div
          role="group"
          aria-label="Filter by topic"
          className="-mx-6 mt-4 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          <TopicChip active={!query.topic} onClick={() => go({ topic: null })}>
            All topics
          </TopicChip>
          {facets.topics.map(({ id, count }) => (
            <TopicChip key={id} active={query.topic === id} onClick={() => go({ topic: query.topic === id ? null : id })}>
              {TOPIC_LABELS[id]} <span className="opacity-60">{count}</span>
            </TopicChip>
          ))}
        </div>
      )}

      <div className="mt-8">
        <BlogResults result={result} query={query} onPage={toTop} onClear={filtered ? () => go(DEFAULT_QUERY) : undefined} />
      </div>
    </div>
  );
}

function BlogControls({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">{children}</div>;
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="relative block flex-1 sm:flex-none">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-full border border-white/10 bg-[#070b14]/90 pl-5 pr-11 text-sm text-white transition-colors focus:border-cyan-400/60 focus:outline-none sm:w-auto"
      >
        {children}
      </select>
      <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute right-4 top-1/2 size-3.5 -translate-y-1/2 text-slate-400">
        <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

function TopicChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm transition-colors ${
        active ? "bg-cyan-300 font-medium text-space" : "text-slate-300 ring-1 ring-white/10 hover:text-white hover:ring-cyan-400/40"
      }`}
    >
      {children}
    </button>
  );
}
