import { TOPIC_LABELS } from "@/features/blog/lib/topics";
import type { BlogSummary } from "@/features/blog/lib/types";

/** Only what the home cards render, so the client payload stays small. */
export type JournalPost = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: string;
  publishedLabel: string;
  readMinutes: number;
  topic: string | null;
};

export function toJournalPost(post: BlogSummary): JournalPost {
  const topic = post.topics[0];
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    publishedAt: post.publishedAt,
    publishedLabel: post.publishedLabel,
    readMinutes: post.readMinutes,
    topic: topic ? TOPIC_LABELS[topic] : null,
  };
}
