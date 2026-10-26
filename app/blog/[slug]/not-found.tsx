import Link from "next/link";

export default function BlogPostNotFound() {
  return (
    <main className="grid min-h-svh place-items-center px-6 py-32 text-center">
      <div className="max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-400/80">404 · Signal lost</p>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">This article isn&apos;t in the journal</h1>
        <p className="mt-4 text-slate-400">It may have been unpublished or the link is mistyped.</p>
        <Link
          href="/blog"
          className="mt-8 inline-flex min-h-11 items-center rounded-full bg-white px-6 text-sm font-medium text-space transition-colors hover:bg-cyan-100"
        >
          Browse all articles
        </Link>
      </div>
    </main>
  );
}
