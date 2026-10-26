"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SectionHeading } from "@/features/home/components/SectionHeading";
import { journalTimeline } from "./timeline";
import type { JournalPost } from "./types";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const Arrow = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Latest two journal posts, with a link through to the full blog. Renders nothing when no posts load. */
export function Journal({ posts }: { posts: JournalPost[] }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (root.current) journalTimeline(root.current);
    },
    { scope: root, dependencies: [posts.length] },
  );

  if (!posts.length) return null;

  return (
    <section id="journal" ref={root} aria-labelledby="journal-title" className="pointer-events-none relative -mt-[130svh] h-[340svh]">
      <div className="js-jr-panel invisible sticky top-0 h-svh overflow-hidden">
        <div
          aria-hidden
          className="js-jr-veil absolute inset-0 bg-white"
        />

        <div className="relative mx-auto flex h-full w-full max-w-[1280px] flex-col items-center justify-center px-5 sm:px-8 lg:px-10">
          <SectionHeading
            id="journal-title"
            title="From the journal"
            subtitle="Ideas, playbooks and stories from our studio"
            tone="light"
            start="top top"
            className="js-jr-head"
          />

          {/* Width is capped by viewport height so the heading, both cards and the button fit the pinned frame. */}
          <ul className="js-jr-grid pointer-events-auto mt-8 grid w-full max-w-[min(1100px,calc((100svh-23rem)*3.5))] gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:gap-6">
            {posts.map((post) => (
              <li key={post.slug} className="js-jr-card">
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex h-full items-center gap-3 rounded-[14px] bg-black p-3 text-white transition-[background-color,box-shadow] duration-300 hover:bg-[#1A1A1A] hover:shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] sm:flex-col sm:items-stretch sm:gap-0 sm:p-[30px]"
                >
                  {/* 16:9 matches the blog covers, so they show uncropped. Phones lay the card out as a row to fit both. */}
                  <span className="js-jr-frame relative block aspect-video w-[42%] shrink-0 overflow-hidden rounded-[10px] bg-[#94A3B8] sm:w-full">
                    {post.coverImage && (
                      <Image
                        src={post.coverImage}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 520px, (min-width: 640px) 45vw, 40vw"
                        className="object-cover transition-[scale] duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    )}
                  </span>

                  <span className="flex min-w-0 flex-1 items-start justify-between gap-4 sm:mt-5">
                    <span className="flex min-w-0 flex-col gap-1.5">
                      <span className="js-jr-line flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80">
                        {post.topic && <span>{post.topic}</span>}
                        {post.topic && <span aria-hidden className="size-0.5 rounded-full bg-white/60" />}
                        <time dateTime={post.publishedAt} className="text-white/60">
                          {post.publishedLabel}
                        </time>
                      </span>
                      <span className="js-jr-line line-clamp-2 font-heading text-sm font-bold leading-snug text-white sm:text-[20px]">{post.title}</span>
                    </span>
                    <span className="js-jr-line mt-1 hidden size-9 shrink-0 place-items-center rounded-full bg-white text-black transition-[rotate] duration-300 group-hover:rotate-45 sm:grid">
                      <Arrow className="size-4" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/blog"
            className="js-jr-cta group pointer-events-auto mt-8 flex h-[46px] items-center justify-between gap-6 rounded-[100px] bg-black py-[9px] pl-[19px] pr-[9px] font-sans text-base font-semibold text-white transition-[scale] duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:mt-12"
          >
            View all blogs
            <span className="grid size-7 place-items-center rounded-full bg-white text-black">
              <Arrow className="size-4 transition-transform duration-500 group-hover:rotate-45" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
