import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogExplorer } from "@/features/blog/components/BlogExplorer";
import { BlogResults } from "@/features/blog/components/BlogResults";
import { getBlogList } from "@/features/blog/lib/api";
import { buildFacets, DEFAULT_QUERY, runQuery } from "@/features/blog/lib/query";
import { TOPIC_LABELS } from "@/features/blog/lib/topics";

export const metadata: Metadata = {
  title: "Journal — Contenaissance",
  description: "Guides and insights on creative strategy, real estate marketing, AI films and advertising from the Contenaissance studio.",
};

export default async function BlogPage() {
  const posts = await getBlogList();
  const facets = buildFacets(posts);

  return (
    <main className="relative mx-auto min-h-svh max-w-7xl px-6 pb-20 pt-28 sm:pt-32 lg:px-10">
      <header className="grid gap-4 border-b border-white/[0.06] pb-8 lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-end lg:gap-12">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-400/80">Journal</p>
          <h1 className="mt-3 text-[clamp(2.1rem,4.4vw,3.5rem)] font-bold leading-[1.04] tracking-[-0.035em]">
            Notes from the <span className="italic text-cyan-200">studio</span>
          </h1>
        </div>
        <p className="text-[15px] leading-relaxed text-slate-400 lg:pb-1.5">
          Field guides on creative strategy, real estate launches, AI films and the craft behind them.
        </p>
      </header>

      <div className="mt-8">
        {/* URL-driven filters need the browser; until then the default first page is served as static HTML. */}
        <Suspense
          fallback={
            <div>
              <div aria-hidden className="flex flex-wrap gap-3 sm:flex-nowrap">
                <div className="h-11 basis-full rounded-full border border-white/10 bg-[#070b14]/60 sm:flex-1 sm:basis-auto" />
                <div className="h-11 flex-1 rounded-full border border-white/10 bg-[#070b14]/60 sm:w-44 sm:flex-none" />
              </div>
              {facets.topics.length > 1 && <div aria-hidden className="mt-4 h-11" />}
              <div className="mt-8">
                <BlogResults result={runQuery(posts, DEFAULT_QUERY, TOPIC_LABELS)} query={DEFAULT_QUERY} />
              </div>
            </div>
          }
        >
          <BlogExplorer posts={posts} facets={facets} />
        </Suspense>
      </div>
    </main>
  );
}
