import type { TopicId } from "./topics";
import type { BlogSummary } from "./types";

export const PAGE_SIZE = 9;
export const MAX_QUERY_LENGTH = 100;

export const SORTS = {
  newest: "Newest first",
  oldest: "Oldest first",
  az: "Title A–Z",
  quick: "Quickest read",
} as const;

export type SortKey = keyof typeof SORTS;

export type BlogQuery = { q: string; topic: TopicId | null; year: number | null; sort: SortKey; page: number };

export const DEFAULT_QUERY: BlogQuery = { q: "", topic: null, year: null, sort: "newest", page: 1 };

export type Facets = {
  topics: { id: TopicId; count: number }[];
  years: { year: number; count: number }[];
};

type Params = { get(name: string): string | null };

/** Reads untrusted URL params, falling back to defaults for anything unknown or malformed. */
export function parseQuery(params: Params, facets: Facets): BlogQuery {
  const q = (params.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const topic = facets.topics.find((t) => t.id === params.get("topic"))?.id ?? null;
  const yearParam = Number(params.get("year"));
  const year = facets.years.some((y) => y.year === yearParam) ? yearParam : null;
  const sortParam = params.get("sort");
  const sort = sortParam && sortParam in SORTS ? (sortParam as SortKey) : DEFAULT_QUERY.sort;
  const page = Number.parseInt(params.get("page") ?? "", 10);
  return { q, topic, year, sort, page: Number.isFinite(page) && page > 0 ? page : 1 };
}

/** Serialises only non-default values so shared URLs stay short. */
export function toSearchString(query: BlogQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.topic) params.set("topic", query.topic);
  if (query.year) params.set("year", String(query.year));
  if (query.sort !== DEFAULT_QUERY.sort) params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** Filters only expose values that exist in the data, sorted by size. */
export function buildFacets(posts: BlogSummary[]): Facets {
  const topics = new Map<TopicId, number>();
  const years = new Map<number, number>();
  for (const post of posts) {
    post.topics.forEach((t) => topics.set(t, (topics.get(t) ?? 0) + 1));
    years.set(post.year, (years.get(post.year) ?? 0) + 1);
  }
  return {
    topics: [...topics].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count),
    years: [...years].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year),
  };
}

function normalize(text: string) {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const COMPARE: Record<SortKey, (a: BlogSummary, b: BlogSummary) => number> = {
  newest: (a, b) => b.publishedAt.localeCompare(a.publishedAt),
  oldest: (a, b) => a.publishedAt.localeCompare(b.publishedAt),
  az: (a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
  quick: (a, b) => a.readMinutes - b.readMinutes || b.publishedAt.localeCompare(a.publishedAt),
};

export type BlogPage = { featured: BlogSummary | null; items: BlogSummary[]; total: number; page: number; totalPages: number };

/** The unfiltered, newest-first view leads with a featured story on its first page. */
export function isEditorialView(query: BlogQuery) {
  return !query.q && !query.topic && !query.year && query.sort === "newest";
}

/**
 * Every search word must appear in the title, excerpt, keywords or topic labels.
 * In the editorial view page 1 holds the featured story plus a full grid, so later pages shift by one.
 */
export function runQuery(posts: BlogSummary[], query: BlogQuery, topicLabels: Record<string, string>): BlogPage {
  const words = normalize(query.q).split(/\s+/).filter(Boolean);
  const matches = posts.filter((post) => {
    if (query.topic && !post.topics.includes(query.topic)) return false;
    if (query.year && post.year !== query.year) return false;
    if (!words.length) return true;
    const haystack = normalize(`${post.title} ${post.excerpt} ${post.searchTerms} ${post.topics.map((t) => topicLabels[t]).join(" ")}`);
    return words.every((word) => haystack.includes(word));
  });
  matches.sort(COMPARE[query.sort]);

  const lead = isEditorialView(query) && matches.length > 1 ? 1 : 0;
  const totalPages = Math.max(1, Math.ceil((matches.length - lead) / PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const start = page === 1 ? lead : lead + (page - 1) * PAGE_SIZE;
  return {
    featured: lead && page === 1 ? matches[0] : null,
    items: matches.slice(start, start + PAGE_SIZE),
    total: matches.length,
    page,
    totalPages,
  };
}
