import Link from "next/link";
import type { ReactNode } from "react";
import { BlogCard, FeaturedCard } from "./BlogCard";
import { toSearchString, type BlogPage, type BlogQuery } from "../lib/query";

/** Page numbers with gaps, e.g. 1 … 4 5 6 … 12. */
function pageList(page: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ["gap" as const, p] : [p]));
}

/**
 * Featured story, grid and pagination. Renders on the server as the crawlable first page and in the
 * browser for filtered views, so pagination uses real links in both cases.
 */
export function BlogResults({
  result,
  query,
  onPage,
  onClear,
}: {
  result: BlogPage;
  query: BlogQuery;
  onPage?: () => void;
  onClear?: () => void;
}) {
  const href = (page: number) => `/blog${toSearchString({ ...query, page })}`;
  const filtered = Boolean(query.q || query.topic || query.year);

  return (
    <>
      {result.featured && <FeaturedCard post={result.featured} />}

      <div className={`flex items-baseline justify-between gap-4 ${result.featured ? "mt-12" : ""}`}>
        <h2 className="font-heading text-lg font-semibold tracking-tight text-white">{filtered ? "Results" : "Latest articles"}</h2>
        <p aria-live="polite" className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {result.total ? `${result.total} ${result.total === 1 ? "article" : "articles"}` : "No matches"}
        </p>
      </div>

      {result.items.length > 0 ? (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {result.items.map((post, i) => (
            <li key={post.id}>
              <BlogCard post={post} eager={result.page === 1 && !result.featured && i < 3} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
          <p className="text-base text-white">Nothing in the journal matches that yet.</p>
          <p className="mt-2 text-sm text-slate-400">Try a different word or clear the filters.</p>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="mt-6 min-h-11 rounded-full px-5 text-sm text-white ring-1 ring-white/15 transition-colors hover:bg-white hover:text-space"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {result.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-6">
          <PageLink href={href(result.page - 1)} disabled={result.page === 1} onPage={onPage} label="Previous page" wide>
            <Arrow className="rotate-180" />
            <span className="hidden sm:inline">Previous</span>
          </PageLink>

          <div className="flex items-center gap-1">
            {pageList(result.page, result.totalPages).map((p, i) =>
              p === "gap" ? (
                <span key={`gap-${i}`} aria-hidden className="w-6 text-center text-slate-600">
                  …
                </span>
              ) : (
                <PageLink key={p} href={href(p)} current={p === result.page} onPage={onPage} label={`Page ${p}`}>
                  {p}
                </PageLink>
              ),
            )}
          </div>

          <PageLink href={href(result.page + 1)} disabled={result.page === result.totalPages} onPage={onPage} label="Next page" wide>
            <span className="hidden sm:inline">Next</span>
            <Arrow />
          </PageLink>
        </nav>
      )}
    </>
  );
}

function PageLink({
  href,
  label,
  current,
  disabled,
  wide,
  onPage,
  children,
}: {
  href: string;
  label: string;
  current?: boolean;
  disabled?: boolean;
  wide?: boolean;
  onPage?: () => void;
  children: ReactNode;
}) {
  const base = `inline-flex h-10 items-center justify-center gap-2 rounded-full text-sm transition-colors ${wide ? "min-w-10 px-3 sm:px-4" : "min-w-10 px-1"}`;
  if (disabled) {
    return (
      <span aria-disabled className={`${base} text-slate-600`}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onPage}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={`${base} ${
        current ? "bg-white font-medium text-space" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
      } ${wide && !current ? "ring-1 ring-white/10 hover:ring-cyan-400/40" : ""}`}
    >
      {children}
    </Link>
  );
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-3.5 ${className}`} aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
