import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BlogCard } from "@/features/blog/components/BlogCard";
import { TableOfContents } from "@/features/blog/components/TableOfContents";
import { getBlogList, getBlogPost } from "@/features/blog/lib/api";
import type { TocEntry } from "@/features/blog/lib/content";
import { TOPIC_LABELS } from "@/features/blog/lib/topics";
import type { BlogSummary } from "@/features/blog/lib/types";

// Unlisted slugs render fully before responding, so a missing post returns a real 404 on the first request too.
export const ensureStatic = "navigation";
export const instant = false;

export async function generateStaticParams() {
  const posts = await getBlogList();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Article not found — Contenaissance" };

  const description = post.metaDescription || post.excerpt;
  const images = post.coverImage ? [{ url: post.coverImage, alt: post.title }] : undefined;
  return {
    title: `${post.title} — Contenaissance`,
    description,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    openGraph: {
      type: "article",
      title: post.title,
      description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? undefined,
      authors: [post.author],
      images,
    },
    twitter: { card: images ? "summary_large_image" : "summary", title: post.title, description, images: post.coverImage ? [post.coverImage] : undefined },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    image: post.coverImage ?? undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "Contenaissance" },
    keywords: post.keywords.join(", ") || undefined,
  };

  const toc = outline(post.toc);
  const related = relatedPosts(post, await getBlogList());

  return (
    <main className="relative min-h-svh px-6 pb-20 pt-28 sm:pt-32 lg:px-10">
      <article className="mx-auto max-w-6xl">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
          <BackLink>Journal</BackLink>
          {post.topics[0] && (
            <>
              <span aria-hidden>/</span>
              <Link href={`/blog?topic=${post.topics[0]}`} className="truncate transition-colors hover:text-white">
                {TOPIC_LABELS[post.topics[0]]}
              </Link>
            </>
          )}
        </nav>

        <header className="mt-5 max-w-3xl">
          {post.topics.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {post.topics.map((topic) => (
                <li key={topic}>
                  <Link
                    href={`/blog?topic=${topic}`}
                    className="inline-flex rounded-full border border-cyan-400/25 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-300 transition-colors hover:border-cyan-400/60"
                  >
                    {TOPIC_LABELS[topic]}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <h1 className="mt-4 text-balance text-[clamp(1.9rem,4.2vw,3.1rem)] font-bold leading-[1.1] tracking-[-0.03em]">{post.title}</h1>
          {post.excerpt && <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">{post.excerpt}</p>}
          <div className="mt-6 flex items-center gap-3">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-cyan-300/10 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-300/25">
              {initials(post.author)}
            </span>
            <p className="text-sm leading-tight">
              <span className="block font-medium text-slate-200">{post.author}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                <time dateTime={post.publishedAt}>{post.publishedLabel}</time> · {post.readMinutes} min read
              </span>
            </p>
          </div>
        </header>

        {post.coverImage && (
          <div className="relative mt-8 aspect-[16/9] max-w-4xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1a2b]">
            <Image src={post.coverImage} alt="" fill preload sizes="(min-width: 896px) 896px, 100vw" className="object-cover" />
          </div>
        )}

        <div className={`mt-10 lg:mt-12 ${toc.length ? "lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_16rem] xl:gap-16" : ""}`}>
          <div className="min-w-0">
            {toc.length > 0 && (
              <details className="group/toc mb-8 rounded-xl border border-white/[0.08] bg-white/[0.02] lg:hidden">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium text-white [&::-webkit-details-marker]:hidden">
                  On this page
                  <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 text-slate-400 transition-transform group-open/toc:rotate-180">
                    <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div className="max-h-72 overflow-y-auto border-t border-white/[0.06] px-4 py-3">
                  <TableOfContents entries={toc} compact />
                </div>
              </details>
            )}

            <div className="blog-prose mx-auto max-w-3xl lg:mx-0 lg:max-w-none" dangerouslySetInnerHTML={{ __html: post.html }} />

            <aside className="mx-auto mt-12 flex max-w-3xl flex-col items-start gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-cyan-400/[0.07] to-transparent p-6 sm:flex-row sm:items-center sm:justify-between lg:mx-0 lg:max-w-none">
              <div>
                <p className="font-heading text-lg font-semibold text-white">Planning a launch of your own?</p>
                <p className="mt-1 text-sm text-slate-400">Tell us about it and we&apos;ll map out the mission.</p>
              </div>
              <Link
                href="/#contact"
                className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-white px-6 text-sm font-medium text-space transition-colors hover:bg-cyan-100"
              >
                Start a mission
              </Link>
            </aside>
          </div>

          {toc.length > 0 && (
            <aside aria-label="On this page" className="hidden lg:block">
              <div className="sticky top-28 max-h-[calc(100svh-9rem)] overflow-y-auto pb-4 [scrollbar-width:thin]">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">On this page</p>
                <TableOfContents entries={toc} />
              </div>
            </aside>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mx-auto mt-16 max-w-6xl border-t border-white/[0.06] pt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="related-heading" className="text-xl font-semibold tracking-tight">
              Keep reading
            </h2>
            <BackLink>All articles</BackLink>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {related.map((item) => (
              <li key={item.id}>
                <BlogCard post={item} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length === 0 && (
        <div className="mx-auto mt-12 max-w-6xl">
          <BackLink>Back to all articles</BackLink>
        </div>
      )}
    </main>
  );
}

const MIN_TOC_ENTRIES = 4;
const MAX_TOC_ENTRIES = 14;

/** Long articles get an outline; very long ones list only their main sections when there are enough. */
function outline(toc: TocEntry[]) {
  if (toc.length < MIN_TOC_ENTRIES) return [];
  const sections = toc.filter((entry) => entry.level === 2);
  return toc.length > MAX_TOC_ENTRIES && sections.length >= MIN_TOC_ENTRIES ? sections : toc;
}

/** Shared topics first, then recency. */
function relatedPosts(post: BlogSummary, posts: BlogSummary[]) {
  return posts
    .filter((p) => p.id !== post.id)
    .map((p) => ({ p, score: p.topics.filter((t) => post.topics.includes(t)).length }))
    .sort((a, b) => b.score - a.score || b.p.publishedAt.localeCompare(a.p.publishedAt))
    .slice(0, 3)
    .map(({ p }) => p);
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "C"
  );
}

function BackLink({ children }: { children: ReactNode }) {
  return (
    <Link href="/blog" className="group inline-flex min-h-11 shrink-0 items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white">
      <svg viewBox="0 0 16 16" className="size-3.5 rotate-180 transition-transform group-hover:-translate-x-0.5" aria-hidden>
        <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </Link>
  );
}
