import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { readingMinutes, renderPostContent } from "./content";
import { deriveTopics } from "./topics";
import type { BlogPost, BlogSummary } from "./types";

const REQUEST_TIMEOUT_MS = 10_000;
/** Some published slugs are capitalised (e.g. `Creative-Agency`), so case is preserved. */
const SLUG = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

/** Unknown keys (such as `author_email`) are stripped, so they never reach a page or the browser. */
const RawPost = z.object({
  id: z.number(),
  title: z.string().min(1),
  slug: z.string().regex(SLUG),
  excerpt: z.string().nullish(),
  blog_keywords: z.string().nullish(),
  blog_meta_description: z.string().nullish(),
  content: z.string().nullish(),
  cover_image: z.string().nullish(),
  author_name: z.string().nullish(),
  status: z.string(),
  published_at: z.string().nullish(),
  updated_at: z.string().nullish(),
});
type RawPost = z.infer<typeof RawPost>;

const Envelope = z.object({ success: z.boolean(), data: z.unknown() });

const DATE_LABEL = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function apiBase() {
  const raw = process.env.BLOG_API_BASE_URL;
  if (!raw) throw new Error("BLOG_API_BASE_URL is not set.");
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("BLOG_API_BASE_URL must use https.");
  return url.toString().replace(/\/+$/, "");
}

async function request(path: string) {
  return fetch(`${apiBase()}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

function isLive(post: RawPost): post is RawPost & { published_at: string } {
  return post.status === "published" && !!post.published_at && !Number.isNaN(Date.parse(post.published_at));
}

/** Must match `images.remotePatterns` in next.config.ts; other hosts would crash `next/image`. */
const COVER_ORIGIN = "https://contenaissance.blob.core.windows.net/ct-assets/";

function toSummary(post: RawPost & { published_at: string }): BlogSummary {
  const published = new Date(post.published_at);
  const cover = post.cover_image?.startsWith(COVER_ORIGIN) ? post.cover_image : null;
  return {
    id: post.id,
    slug: post.slug,
    title: post.title.trim(),
    excerpt: (post.excerpt ?? post.blog_meta_description ?? "").trim(),
    coverImage: cover,
    author: post.author_name?.trim() || "Contenaissance Team",
    publishedAt: published.toISOString(),
    publishedLabel: DATE_LABEL.format(published),
    year: Number(published.toLocaleString("en-IN", { year: "numeric", timeZone: "Asia/Kolkata" })),
    readMinutes: readingMinutes(post.content ?? ""),
    topics: deriveTopics(post.blog_keywords ?? "", post.title),
    searchTerms: post.blog_keywords ?? "",
  };
}

/** All published posts as lightweight cards. The upstream API has no pagination, so it is fetched once and cached. */
export async function getBlogList(): Promise<BlogSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("blogs");

  const res = await request("/blogs?status=published");
  if (!res.ok) throw new Error(`Blog listing request failed with ${res.status}.`);
  const body = Envelope.parse(await res.json());
  if (!body.success || !Array.isArray(body.data)) throw new Error("Blog listing returned an unexpected payload.");

  return body.data
    .map((item) => RawPost.safeParse(item))
    .flatMap((parsed) => (parsed.success && isLive(parsed.data) ? [toSummary(parsed.data)] : []))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** A published post with sanitized HTML and SEO fields, or null for unknown, malformed or unpublished slugs. */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("blogs", `blog:${slug}`);

  if (slug.length > 200 || !SLUG.test(slug)) return null;

  const res = await request(`/blogs/slug/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Blog detail request failed with ${res.status}.`);
  const body = Envelope.parse(await res.json());
  const parsed = RawPost.safeParse(body.data);
  if (!body.success || !parsed.success || !isLive(parsed.data) || parsed.data.slug.toLowerCase() !== slug.toLowerCase()) return null;

  const post = parsed.data;
  const content = renderPostContent(post.content ?? "");
  return {
    ...toSummary(post),
    html: content.html,
    toc: content.toc,
    keywords: (post.blog_keywords ?? "").split(",").map((k) => k.trim()).filter(Boolean),
    metaDescription: (post.blog_meta_description ?? post.excerpt ?? "").trim(),
    updatedAt: post.updated_at && !Number.isNaN(Date.parse(post.updated_at)) ? new Date(post.updated_at).toISOString() : null,
  };
}
