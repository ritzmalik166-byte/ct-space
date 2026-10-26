import type { TocEntry } from "./content";
import type { TopicId } from "./topics";

/** Listing card data: everything the index needs, without article HTML or author contact details. */
export type BlogSummary = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  author: string;
  /** ISO timestamp, used for sorting and `<time dateTime>`. */
  publishedAt: string;
  /** Display date, formatted on the server so it never differs between server and browser. */
  publishedLabel: string;
  year: number;
  readMinutes: number;
  topics: TopicId[];
  /** SEO keywords, matched by search but not displayed. */
  searchTerms: string;
};

export type BlogPost = BlogSummary & {
  /** Sanitized article HTML. */
  html: string;
  /** h2/h3 headings in reading order; their ids are set in `html`. */
  toc: TocEntry[];
  keywords: string[];
  metaDescription: string;
  updatedAt: string | null;
};
