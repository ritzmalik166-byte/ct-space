import Image from "next/image";
import Link from "next/link";
import { TOPIC_LABELS } from "../lib/topics";
import type { BlogSummary } from "../lib/types";

function Meta({ post, className = "" }: { post: BlogSummary; className?: string }) {
  return (
    <p className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 ${className}`}>
      <time dateTime={post.publishedAt}>{post.publishedLabel}</time>
      <span aria-hidden className="size-0.5 rounded-full bg-slate-600" />
      <span>{post.readMinutes} min read</span>
    </p>
  );
}

/** Compact grid card; the stretched title link makes the whole card clickable. */
export function BlogCard({ post, eager = false }: { post: BlogSummary; eager?: boolean }) {
  const topic = post.topics[0];
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#0a1322]/80 transition-[border-color,box-shadow,translate] duration-300 ease-out hover:-translate-y-0.5 hover:border-cyan-400/30 hover:shadow-[0_20px_40px_-28px_rgb(34_211_238/0.6)] focus-within:border-cyan-400/50">
      <div className="relative aspect-[16/9] overflow-hidden bg-[#0d1a2b]">
        {post.coverImage && (
          <Image
            src={post.coverImage}
            alt=""
            fill
            preload={eager}
            sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {topic && <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300/90">{TOPIC_LABELS[topic]}</p>}
        <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-white">
          <Link href={`/blog/${post.slug}`} className="outline-none after:absolute after:inset-0 after:content-['']">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">{post.excerpt}</p>
        <Meta post={post} className="mt-auto pt-4" />
      </div>
    </article>
  );
}

/** Large horizontal lead story for the first page of the journal. */
export function FeaturedCard({ post }: { post: BlogSummary }) {
  return (
    <article className="group relative grid overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1322]/80 transition-[border-color,box-shadow] duration-300 hover:border-cyan-400/30 hover:shadow-[0_30px_60px_-36px_rgb(34_211_238/0.55)] focus-within:border-cyan-400/50 lg:grid-cols-[1.25fr_1fr] lg:items-center">
      <div className="relative aspect-[16/9] overflow-hidden bg-[#0d1a2b]">
        {post.coverImage && (
          <Image
            src={post.coverImage}
            alt=""
            fill
            preload
            sizes="(min-width: 1280px) 700px, (min-width: 1024px) 55vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        )}
      </div>

      <div className="flex flex-col justify-center p-6 sm:p-8 lg:py-6 xl:px-10">
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-cyan-300 px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-space">Featured</span>
          {post.topics.slice(0, 2).map((topic) => (
            <span key={topic} className="rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-400 ring-1 ring-white/10">
              {TOPIC_LABELS[topic]}
            </span>
          ))}
        </p>
        <h2 className="mt-4 line-clamp-3 text-[clamp(1.5rem,2.2vw,2rem)] font-bold leading-[1.15] tracking-[-0.025em] text-white">
          <Link href={`/blog/${post.slug}`} className="outline-none after:absolute after:inset-0 after:content-['']">
            {post.title}
          </Link>
        </h2>
        <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-slate-400 lg:line-clamp-2 xl:line-clamp-3">{post.excerpt}</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <Meta post={post} />
          <span aria-hidden className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300">
            Read article
            <svg viewBox="0 0 16 16" className="size-3.5 transition-transform duration-300 group-hover:translate-x-1">
              <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </article>
  );
}
