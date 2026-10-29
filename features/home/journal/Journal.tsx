"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SectionHeading } from "@/features/home/components/SectionHeading";
import { journalTimeline } from "./timeline";
import type { JournalPost } from "./types";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const Arrow = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M7 17 17 7M9 7h8v8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FALLBACK_POSTS: JournalPost[] = [
  {
    slug: "top-5-creative-agency-in-india",
    title: "Top 5 Creative Agency in India for 2026: Full Comparison",
    excerpt: "Explore the leading creative and AI production agencies driving exponential brand growth in 2026.",
    coverImage: "https://contenaissance.blob.core.windows.net/ct-assets/creative-agency-cover.webp",
    publishedAt: "2026-10-27T00:00:00.000Z",
    publishedLabel: "27 OCT 2026",
    readMinutes: 6,
    topic: "CREATIVE AGENCY",
  },
  {
    slug: "ai-video-production-agency-in-india",
    title: "AI Video Production Agency vs Traditional: Which Wins?",
    excerpt: "Breaking down production speed, cost efficiency, and creative fidelity across modern video workflows.",
    coverImage: "https://contenaissance.blob.core.windows.net/ct-assets/ai-video-cover.webp",
    publishedAt: "2026-10-23T00:00:00.000Z",
    publishedLabel: "23 OCT 2026",
    readMinutes: 5,
    topic: "AI FILMS",
  },
    {
    slug: "ai-video-production-agency-in-india",
    title: "AI Video Production Agency vs Traditional: Which Wins?",
    excerpt: "Breaking down production speed, cost efficiency, and creative fidelity across modern video workflows.",
    coverImage: "https://contenaissance.blob.core.windows.net/ct-assets/ai-video-cover.webp",
    publishedAt: "2026-10-23T00:00:00.000Z",
    publishedLabel: "23 OCT 2026",
    readMinutes: 5,
    topic: "AI FILMS",
  },
];

export function Journal({ posts }: { posts: JournalPost[] }) {
  const root = useRef<HTMLElement>(null);
  const displayPosts = posts && posts.length > 0 ? posts : FALLBACK_POSTS;

  useGSAP(
    () => {
      if (root.current && displayPosts.length > 0) {
        const cleanup = journalTimeline(root.current);
        return cleanup;
      }
    },
    {
      scope: root,
      dependencies: [displayPosts.length],
      revertOnUpdate: true,
    },
  );

  return (
    <section
      id="journal"
      ref={root}
      aria-labelledby="journal-title"
      className="relative w-full overflow-hidden bg-[#fff] py-24 text-white sm:py-32 lg:py-36"
    >
      {/* Background ambient glowing orbs */}
      <div
        aria-hidden
        className="js-jr-orb pointer-events-none absolute -left-32 top-1/4 size-[480px] rounded-full bg-[#DAAF25]/[0.06] blur-[150px]"
      />
      <div
        aria-hidden
        className="js-jr-orb pointer-events-none absolute -right-32 bottom-1/4 size-[520px] rounded-full bg-cyan-500/[0.04] blur-[160px]"
      />

      {/* Subtle radial depth gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(218,175,37,0.05)_0%,transparent_60%)]"
      />

      <div className="relative mx-auto flex w-full max-w-[1280px] flex-col items-center px-5 sm:px-8 lg:px-10">
        {/* Section Header */}
        <div className="js-jr-head flex flex-col items-center">

          <SectionHeading
            id="journal-title"
            title="From the journal"
            subtitle="Ideas, playbooks and stories from our studio"
            tone="light"
            className="w-full"
          />
        </div>

        {/* 3D Interactive Article Grid */}
        <ul className="js-jr-grid mt-10 grid w-full grid-cols-1 gap-6 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:gap-8">
          {displayPosts.map((post, idx) => (
            <li key={post.slug} className="js-jr-card min-w-0 [perspective:1200px]">
              <Link
                href={`/blog/${post.slug}`}
                className="js-jr-card-inner group relative block h-full overflow-hidden rounded-[20px] border border-white/10 bg-[#0F131D]/90 p-5 backdrop-blur-md transition-all duration-500 hover:border-[#DAAF25]/50 hover:shadow-[0_25px_60px_-15px_rgba(218,175,37,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] sm:p-7"
              >
                {/* Dynamic Cursor Spotlight Effect */}
                <div
                  aria-hidden
                  className="js-jr-spotlight pointer-events-none absolute -inset-px rounded-[20px] opacity-0 transition-opacity duration-300"
                  style={{
                    background:
                      "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(218, 175, 37, 0.14), transparent 45%)",
                  }}
                />

                {/* Cover Image Frame with Shutter Reveal and Parallax Image */}
                <div className="js-jr-frame relative block aspect-video w-full shrink-0 overflow-hidden rounded-[14px] bg-[#1a202c]">
                  {post.coverImage && (
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      sizes="(min-width: 1024px) 560px, (min-width: 640px) 45vw, 92vw"
                      className="js-jr-img object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  )}

                  {/* Vignette Overlay */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20"
                  />

                  {/* Top-Right Read Time Pill */}
                  <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white/90 backdrop-blur-md">
                    <span className="size-1.5 rounded-full bg-[#DAAF25] animate-ping" />
                    <span>{post.readMinutes || 5} MIN READ</span>
                  </div>
                </div>

                {/* Content Metadata & Title */}
                <div className="mt-5 flex min-w-0 flex-1 flex-col justify-between sm:mt-6">
                  <div>
                    {/* Category & Date */}
                    <div className="js-jr-line flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/80">
                      <span className="flex items-center gap-1.5 font-semibold text-[#DAAF25]">
                        <span className="size-1.5 rounded-full bg-[#DAAF25]" />
                        {post.topic || "FEATURE"}
                      </span>
                      <span aria-hidden="true" className="text-white/30">
                        /
                      </span>
                      <time dateTime={post.publishedAt} className="text-white/60">
                        {post.publishedLabel}
                      </time>
                    </div>

                    {/* Article Title */}
                    <h3 className="js-jr-line mt-2.5 line-clamp-2 font-heading text-lg font-bold leading-snug text-white transition-colors duration-300 group-hover:text-[#F7E7B4] sm:text-[22px]">
                      {post.title}
                    </h3>

                    {/* Excerpt */}
                    {/* {post.excerpt && (
                      <p className="js-jr-line mt-2 line-clamp-2 font-sans text-sm font-normal leading-relaxed text-white/60">
                        {post.excerpt}
                      </p>
                    )} */}
                  </div>

                  {/* Card Footer with Magnetic Arrow Button */}
                  <div className="js-jr-line mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="font-mono text-xs uppercase tracking-wider text-white/70 transition-colors duration-300 group-hover:text-white flex items-center gap-1.5">
                      Explore Story
                      <span className="text-[#DAAF25] transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </span>

                    <span className="js-jr-arrow grid size-9 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all duration-300 group-hover:border-[#DAAF25] group-hover:bg-[#DAAF25] group-hover:text-black group-hover:scale-110 sm:size-10">
                      <Arrow className="size-4 transition-transform duration-500 group-hover:rotate-45" />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* View All Blogs CTA */}
        <Link
          href="/blog"
          className="js-jr-cta group mt-12 flex h-[50px] items-center justify-between gap-6 rounded-full border border-black bg-black py-[10px] pl-6 pr-2.5 font-sans text-base font-semibold text-white backdrop-blur-md transition-all duration-300 hover:border-[#DAAF25]/50 hover:bg-[#DAAF25]/10 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] sm:mt-16"
        >
          <span>View all stories</span>

          <span className="grid size-8 place-items-center rounded-full bg-[#DAAF25] text-black transition-transform duration-500 group-hover:rotate-45">
            <Arrow className="size-4" />
          </span>
        </Link>
      </div>
    </section>
  );
}
