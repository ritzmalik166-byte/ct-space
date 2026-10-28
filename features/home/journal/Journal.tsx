
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
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
  >
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

export function Journal({ posts }: { posts: JournalPost[] }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (root.current && posts.length > 0) {
        journalTimeline(root.current);
      }
    },
    {
      scope: root,
      dependencies: [posts.length],
      revertOnUpdate: true,
    },
  );

  if (!posts.length) return null;

  return (
    <section
      id="journal"
      ref={root}
      aria-labelledby="journal-title"
      className="relative z-10 w-full bg-white py-20 text-black sm:py-24"
    >
      <div className="relative mx-auto flex w-full max-w-[1280px] flex-col items-center px-5 sm:px-8 lg:px-10">
        <SectionHeading
          id="journal-title"
          title="From the journal"
          subtitle="Ideas, playbooks and stories from our studio"
          tone="light"
          className="js-jr-head w-full"
        />

        <ul className="js-jr-grid mt-8 grid w-full gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:gap-6">
          {posts.map((post) => (
            <li key={post.slug} className="js-jr-card min-w-0">
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full items-center gap-3 rounded-[14px] bg-black p-3 text-white transition-[background-color,box-shadow] duration-300 hover:bg-[#1A1A1A] hover:shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] sm:flex-col sm:items-stretch sm:gap-0 sm:p-[30px]"
              >
                <span className="js-jr-frame relative block aspect-video w-[42%] shrink-0 overflow-hidden rounded-[10px] bg-[#94A3B8] sm:w-full">
                  {post.coverImage && (
                    <Image
                      src={post.coverImage}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 520px, (min-width: 640px) 45vw, 40vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                  )}
                </span>

                <span className="flex min-w-0 flex-1 items-start justify-between gap-4 sm:mt-5">
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="js-jr-line flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80">
                      {post.topic && <span>{post.topic}</span>}

                      {post.topic && (
                        <span
                          aria-hidden="true"
                          className="size-0.5 rounded-full bg-white/60"
                        />
                      )}

                      <time
                        dateTime={post.publishedAt}
                        className="text-white/60"
                      >
                        {post.publishedLabel}
                      </time>
                    </span>

                    <span className="js-jr-line line-clamp-2 font-heading text-sm font-bold leading-snug text-white sm:text-[20px]">
                      {post.title}
                    </span>
                  </span>

                  <span className="js-jr-line mt-1 hidden size-9 shrink-0 place-items-center rounded-full bg-white text-black transition-transform duration-300 group-hover:rotate-45 sm:grid">
                    <Arrow className="size-4" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/blog"
          className="js-jr-cta group mt-8 flex h-[46px] items-center justify-between gap-6 rounded-full bg-black py-[9px] pl-[19px] pr-[9px] font-sans text-base font-semibold text-white transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:mt-12"
        >
          View all blogs

          <span className="grid size-7 place-items-center rounded-full bg-white text-black">
            <Arrow className="size-4 transition-transform duration-500 group-hover:rotate-45" />
          </span>
        </Link>
      </div>
    </section>
  );
}
