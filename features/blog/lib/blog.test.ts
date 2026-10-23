import { describe, expect, it } from "vitest";
import { readingMinutes, renderPostContent } from "./content";
import { buildFacets, DEFAULT_QUERY, PAGE_SIZE, parseQuery, runQuery, toSearchString } from "./query";
import { deriveTopics, TOPIC_LABELS } from "./topics";
import type { BlogSummary } from "./types";

function post(i: number, patch: Partial<BlogSummary> = {}): BlogSummary {
  const day = String((i % 28) + 1).padStart(2, "0");
  return {
    id: i,
    slug: `post-${i}`,
    title: `Post ${String(i).padStart(2, "0")}`,
    excerpt: "An excerpt",
    coverImage: null,
    author: "Team",
    publishedAt: `2026-0${(i % 9) + 1}-${day}T00:00:00.000Z`,
    publishedLabel: "",
    year: 2026,
    readMinutes: (i % 7) + 1,
    topics: ["creative-agency"],
    searchTerms: "",
    ...patch,
  };
}

const params = (search: string) => new URLSearchParams(search);

describe("blog query", () => {
  const posts = [
    ...Array.from({ length: 20 }, (_, i) => post(i + 1)),
    post(21, { title: "Real estate launch films", topics: ["real-estate", "ai-films"], year: 2025, publishedAt: "2025-05-01T00:00:00.000Z" }),
    post(22, { title: "Lead engines", searchTerms: "real estate lead generation agency in Noida", topics: ["lead-generation"] }),
  ];
  const facets = buildFacets(posts);

  it("leads the default view with a featured post and clamps out-of-range pages", () => {
    const first = runQuery(posts, DEFAULT_QUERY, TOPIC_LABELS);
    expect(first).toMatchObject({ total: 22, page: 1, totalPages: 3 });
    expect(first.featured).not.toBeNull();
    expect(first.items).toHaveLength(PAGE_SIZE);
    const second = runQuery(posts, { ...DEFAULT_QUERY, page: 2 }, TOPIC_LABELS);
    expect(second.featured).toBeNull();
    const last = runQuery(posts, { ...DEFAULT_QUERY, page: 99 }, TOPIC_LABELS);
    expect(last.page).toBe(3);
    expect(last.items).toHaveLength(22 - 1 - PAGE_SIZE * 2);
    const seen = [first.featured!, ...first.items, ...second.items, ...last.items].map((p) => p.id);
    expect(new Set(seen).size).toBe(22);
  });

  it("drops the featured slot for filtered views", () => {
    const filtered = runQuery(posts, { ...DEFAULT_QUERY, sort: "az" }, TOPIC_LABELS);
    expect(filtered.featured).toBeNull();
    expect(filtered.items).toHaveLength(PAGE_SIZE);
  });

  it("searches title, excerpt and keywords with every word required, ignoring case", () => {
    expect(runQuery(posts, { ...DEFAULT_QUERY, q: "REAL launch" }, TOPIC_LABELS).items.map((p) => p.id)).toEqual([21]);
    expect(runQuery(posts, { ...DEFAULT_QUERY, q: "noida" }, TOPIC_LABELS).items.map((p) => p.id)).toEqual([22]);
    expect(runQuery(posts, { ...DEFAULT_QUERY, q: "nothing-here" }, TOPIC_LABELS)).toMatchObject({ total: 0, totalPages: 1 });
  });

  it("filters by topic and year", () => {
    expect(runQuery(posts, { ...DEFAULT_QUERY, topic: "ai-films" }, TOPIC_LABELS).total).toBe(1);
    expect(runQuery(posts, { ...DEFAULT_QUERY, year: 2025 }, TOPIC_LABELS).items[0].id).toBe(21);
  });

  it("sorts newest, oldest, title and read time", () => {
    const ids = (sort: typeof DEFAULT_QUERY.sort) => runQuery(posts, { ...DEFAULT_QUERY, sort }, TOPIC_LABELS).items.map((p) => p.id);
    expect(ids("oldest")[0]).toBe(21);
    expect(ids("az")[0]).toBe(22);
    const quick = runQuery(posts, { ...DEFAULT_QUERY, sort: "quick" }, TOPIC_LABELS).items;
    expect(quick.every((p, i) => i === 0 || quick[i - 1].readMinutes <= p.readMinutes)).toBe(true);
  });

  it("only exposes filter values present in the data", () => {
    expect(facets.topics.map((t) => t.id)).toEqual(expect.arrayContaining(["creative-agency", "real-estate", "ai-films", "lead-generation"]));
    expect(facets.years.map((y) => y.year)).toEqual([2026, 2025]);
  });

  it("parses untrusted URL params safely and round-trips non-defaults", () => {
    expect(parseQuery(params("topic=hacked&year=1999&sort=evil&page=-3"), facets)).toEqual(DEFAULT_QUERY);
    expect(parseQuery(params(`q=${"x".repeat(500)}`), facets).q).toHaveLength(100);
    const query = parseQuery(params("q=film&topic=ai-films&year=2025&sort=az&page=2"), facets);
    expect(query).toEqual({ q: "film", topic: "ai-films", year: 2025, sort: "az", page: 2 });
    expect(toSearchString(query)).toBe("?q=film&topic=ai-films&year=2025&sort=az&page=2");
    expect(toSearchString(DEFAULT_QUERY)).toBe("");
  });
});

describe("post content", () => {
  const render = (raw: string) => renderPostContent(raw).html;

  it("removes scripts, handlers, styles and unsafe URLs", () => {
    const html = render(
      `<p style="color:#000" onclick="x()">Hi<script>alert(1)</script></p><img src="https://x.test/a.png" onerror="alert(1)"><img src="http://x.test/b.png"><a href="javascript:alert(1)">x</a><a href="//evil.test">y</a><iframe src="https://x.test"></iframe>`,
    );
    expect(html).not.toMatch(/script|onclick|onerror|style=|javascript:|evil|iframe|http:\/\/x/);
    expect(html).toBe('<p>Hi</p>\n<p><img src="https://x.test/a.png" alt="" loading="lazy" decoding="async" />xy</p>');
  });

  it("recovers Google Docs formatting from styled spans", () => {
    const html = render(
      `<p><strong style="font-weight:normal" id="docs-internal-guid-1"><span style="font-weight:700">Bold</span> <span style="font-style:italic">it</span> <span style="text-decoration:underline">u</span> <span style="font-weight:400">plain</span></strong></p><p><strong style="font-weight:normal"></strong></p>`,
    );
    expect(html).toBe("<p><strong>Bold</strong> <em>it</em> <u>u</u> plain</p>");
  });

  it("drops the leading title h1, maps heading levels and builds unique TOC ids", () => {
    const { html, toc } = renderPostContent(`<h1>Doc title</h1><p>Intro</p><h1>Why</h1><h3>Why</h3><h5>Small</h5>`);
    expect(html).toBe('<p>Intro</p>\n<h2 id="why">Why</h2>\n<h3 id="why-2">Why</h3>\n<h4>Small</h4>');
    expect(toc).toEqual([
      { id: "why", text: "Why", level: 2 },
      { id: "why-2", text: "Why", level: 3 },
    ]);
  });

  it("hoists blocks out of inline wrappers and malformed nesting", () => {
    const html = render(`<strong style="font-weight:normal"><span><h4></h4></span></strong><span><h2><strong>Real</strong></h2><p>Text <ul><li>One</li></ul></p></span>`);
    expect(html).toBe('<h2 id="real">Real</h2>\n<p>Text</p>\n<ul><li>One</li></ul>');
  });

  it("keeps tables, promotes a bold first row to a header and preserves alignment", () => {
    const html = render(
      `<div align="center"><table><colgroup><col width="200"></colgroup><tbody><tr><td style="border:1px solid #000"><p><span style="font-weight:700">Plan</span></p></td><td><p><span style="font-weight:700">Price</span></p></td></tr><tr><td><p>Basic</p></td><td colspan="2" style="text-align:right"><p>₹10</p></td></tr></tbody></table></div>`,
    );
    expect(html).toBe(
      '<div class="table-wrap"><table><thead><tr><th>Plan</th><th>Price</th></tr></thead><tbody><tr><td>Basic</td><td colspan="2" class="ta-right">₹10</td></tr></tbody></table></div>',
    );
  });

  it("nests sibling lists into the previous item", () => {
    expect(render(`<ul><li>A</li><ul><li>B</li></ul><li></li></ul>`)).toBe("<ul><li>A<ul><li>B</li></ul></li></ul>");
  });

  it("opens external links safely, keeps internal ones and unwraps Docs redirects", () => {
    expect(render(`<a href="https://example.com">e</a>`)).toBe('<p><a href="https://example.com/" target="_blank" rel="noopener noreferrer">e</a></p>');
    expect(render(`<a href="https://www.contenaissance.com/services">c</a>`)).toBe('<p><a href="https://www.contenaissance.com/services">c</a></p>');
    expect(render(`<a href="https://www.google.com/url?q=https://www.contenaissance.com/&amp;sa=D">g</a>`)).toContain('href="https://www.contenaissance.com/"');
  });

  it("estimates reading time", () => {
    expect(readingMinutes(`<p>${"word ".repeat(1000)}</p>`)).toBe(5);
    expect(readingMinutes("")).toBe(1);
  });

  it("derives topics from keywords", () => {
    expect(deriveTopics("Real Estate Lead Generation Agency in Delhi NCR")).toEqual(["real-estate", "lead-generation", "delhi-ncr"]);
    expect(deriveTopics("AI brand films")).toEqual(["ai-films"]);
  });
});
