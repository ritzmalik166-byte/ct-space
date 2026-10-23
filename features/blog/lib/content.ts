import sanitizeHtml from "sanitize-html";
import { parseDocument } from "htmlparser2";
import { isTag, isText, type ChildNode, type Element } from "domhandler";

/**
 * Posts are written in Google Docs and pasted into CKEditor. That HTML wraps every run in styled spans
 * (`<strong style="font-weight:normal">`, inline black colours, Arial), leaves inline tags open across
 * tables and nests blocks inside headings. It is parsed into a tree and rebuilt as clean semantic HTML:
 * bold, italics, underline, strike-through and alignment are recovered from the styles, blocks are hoisted
 * out of inline wrappers, and everything else is dropped so the article inherits the site theme.
 * A strict sanitize-html pass runs last as the security boundary.
 */

export type TocEntry = { id: string; text: string; level: 2 | 3 };
export type PostContent = { html: string; toc: TocEntry[] };

type Format = { b: boolean; i: boolean; u: boolean; s: boolean };
type Ctx = Format & { heading: boolean; link: boolean; header: boolean };
type Block = { kind: "block"; html: string };
type Piece = { kind: "text"; text: string; fmt: Format } | { kind: "inline"; html: string } | Block;

const DROP = new Set([
  "script", "style", "noscript", "iframe", "frame", "frameset", "object", "embed", "template", "svg", "math",
  "form", "input", "button", "select", "textarea", "option", "head", "title", "meta", "link", "base", "colgroup", "col",
  "video", "audio", "source", "track", "canvas", "map", "area",
]);
const TRANSPARENT = new Set(["div", "section", "article", "header", "footer", "main", "aside", "nav", "center", "body", "html", "dl", "dd", "dt", "address", "details", "summary"]);
const BOLD_TAGS = new Set(["strong", "b"]);
const ITALIC_TAGS = new Set(["em", "i", "cite", "var", "dfn"]);
const UNDERLINE_TAGS = new Set(["u", "ins"]);
const STRIKE_TAGS = new Set(["s", "strike", "del"]);
const PLAIN: Format = { b: false, i: false, u: false, s: false };

const escapeText = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (text: string) => escapeText(text).replace(/"/g, "&quot;");

function styleOf(el: Element) {
  const map = new Map<string, string>();
  for (const decl of (el.attribs.style ?? "").split(";")) {
    const at = decl.indexOf(":");
    if (at > 0) map.set(decl.slice(0, at).trim().toLowerCase(), decl.slice(at + 1).trim().toLowerCase());
  }
  return map;
}

/**
 * Tags switch formatting on (a `<strong>` is bold unless its own style says normal, which is how Docs marks
 * its wrapper). Spans only switch it on: Docs writes `font-weight:400` on every run, which must not cancel
 * a bold applied around it in CKEditor.
 */
function formatFor(el: Element, ctx: Ctx): Ctx {
  const style = styleOf(el);
  const weight = style.get("font-weight") ?? "";
  const heavy = /^(bold|bolder|[6-9]00)$/.test(weight);
  const light = /^(normal|lighter|[1-5]00)$/.test(weight);
  const decoration = `${style.get("text-decoration") ?? ""} ${style.get("text-decoration-line") ?? ""}`;
  return {
    ...ctx,
    b: BOLD_TAGS.has(el.name) ? !light : ctx.b || heavy,
    i: ctx.i || ITALIC_TAGS.has(el.name) || style.get("font-style") === "italic",
    u: ctx.u || UNDERLINE_TAGS.has(el.name) || decoration.includes("underline"),
    s: ctx.s || STRIKE_TAGS.has(el.name) || decoration.includes("line-through"),
  };
}

function alignClass(el: Element) {
  const align = styleOf(el).get("text-align") ?? el.attribs.align?.toLowerCase();
  return align === "center" || align === "right" || align === "justify" ? ` class="ta-${align}"` : "";
}

/** Accepts web, mail and phone links plus same-site paths; unwraps Google Docs redirect links. */
function safeHref(raw: string | undefined) {
  const href = (raw ?? "").replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
  if (!href) return null;
  if (href.startsWith("#") || (href.startsWith("/") && !href.startsWith("//"))) return href;
  if (/^(mailto|tel):/i.test(href)) return href;
  try {
    let url = new URL(href);
    // Docs exports some links as google.com/url?q=<target> redirects.
    if (/(^|\.)google\.[a-z.]+$/.test(url.hostname) && url.pathname === "/url" && url.searchParams.get("q")) {
      url = new URL(url.searchParams.get("q")!);
    }
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function wrap(text: string, fmt: Format, ctx: Ctx) {
  let html = escapeText(text);
  if (fmt.s) html = `<s>${html}</s>`;
  if (fmt.u && !ctx.link) html = `<u>${html}</u>`;
  if (fmt.i) html = `<em>${html}</em>`;
  if (fmt.b && !ctx.heading && !ctx.header) html = `<strong>${html}</strong>`;
  return html;
}

/** Joins inline pieces, wrapping consecutive text with identical formatting in a single tag set. */
function renderInline(pieces: Piece[], ctx: Ctx) {
  let html = "";
  let run = "";
  let runFmt: Format | null = null;
  const flush = () => {
    if (runFmt && run) html += wrap(run, runFmt, ctx);
    run = "";
    runFmt = null;
  };
  for (const piece of pieces) {
    if (piece.kind === "text") {
      const same = runFmt && runFmt.b === piece.fmt.b && runFmt.i === piece.fmt.i && runFmt.u === piece.fmt.u && runFmt.s === piece.fmt.s;
      if (!same) flush();
      runFmt = piece.fmt;
      run += piece.text;
    } else {
      flush();
      html += piece.html;
    }
  }
  flush();
  return trimBreaks(html);
}

const trimBreaks = (html: string) => html.replace(/^(?:\s|&nbsp;|<br>)+|(?:\s|&nbsp;|<br>)+$/g, "");
const hasText = (html: string) => /<img\b/.test(html) || html.replace(/<[^>]+>/g, "").replace(/&nbsp;|\u00a0/g, "").trim().length > 0;

/** Splits mixed content into inline runs (wrapped by `asBlock`) and hoisted blocks, preserving order. */
function blocksFrom(pieces: Piece[], ctx: Ctx, asBlock: (inner: string) => string) {
  const out: Block[] = [];
  let inline: Piece[] = [];
  const flush = () => {
    const inner = renderInline(inline, ctx);
    if (hasText(inner)) out.push({ kind: "block", html: asBlock(inner) });
    inline = [];
  };
  for (const piece of pieces) {
    if (piece.kind === "block") {
      flush();
      out.push(piece);
    } else inline.push(piece);
  }
  flush();
  return out;
}

/** Content of containers that may hold both text and blocks (list items, cells, quotes). */
function mixed(pieces: Piece[], ctx: Ctx) {
  if (!pieces.some((p) => p.kind === "block")) return renderInline(pieces, ctx);
  const blocks = blocksFrom(pieces, ctx, (inner) => `<p>${inner}</p>`).map((p) => p.html);
  // A cell or item holding one paragraph (the Docs default) renders without the extra margin.
  const only = blocks.length === 1 && /^<p>([\s\S]*)<\/p>$/.exec(blocks[0]);
  return only ? only[1] : blocks.join("");
}

function textOf(node: ChildNode): string {
  if (isText(node)) return node.data;
  return isTag(node) && !DROP.has(node.name) ? node.children.map(textOf).join("") : "";
}

/** True when every visible character in the element is bold, used to promote a Docs header row to `<th>`. */
function allBold(node: ChildNode, ctx: Ctx): boolean {
  if (isText(node)) return !node.data.trim() || ctx.b;
  if (!isTag(node) || DROP.has(node.name)) return true;
  const next = formatFor(node, ctx);
  return node.children.every((child) => allBold(child, next));
}

class Builder {
  toc: TocEntry[] = [];
  private ids = new Set<string>();
  private sawBlock = false;

  private headingId(text: string) {
    const base =
      text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "section";
    let id = base;
    for (let n = 2; this.ids.has(id); n++) id = `${base}-${n}`;
    this.ids.add(id);
    return id;
  }

  walk(nodes: ChildNode[], ctx: Ctx): Piece[] {
    return nodes.flatMap((node) => this.node(node, ctx));
  }

  private node(node: ChildNode, ctx: Ctx): Piece[] {
    if (isText(node)) return node.data ? [{ kind: "text", text: node.data, fmt: { b: ctx.b, i: ctx.i, u: ctx.u, s: ctx.s } }] : [];
    if (!isTag(node) || DROP.has(node.name)) return [];
    const el = node;
    const tag = el.name;

    if (/^h[1-6]$/.test(tag)) return this.heading(el, ctx);
    switch (tag) {
      case "p":
      case "pre": {
        const pieces = this.walk(el.children, formatFor(el, ctx));
        const open = tag === "pre" ? "<pre>" : `<p${alignClass(el)}>`;
        return this.mark(blocksFrom(pieces, ctx, (inner) => `${open}${inner}</${tag}>`));
      }
      case "ul":
      case "ol":
        return this.list(el, ctx);
      case "table":
        return this.table(el, ctx);
      case "blockquote": {
        const inner = mixed(this.walk(el.children, ctx), ctx);
        return hasText(inner) ? this.mark([{ kind: "block", html: `<blockquote>${inner}</blockquote>` }]) : [];
      }
      case "figure": {
        const inner = mixed(this.walk(el.children, ctx), ctx);
        return hasText(inner) ? this.mark([{ kind: "block", html: `<figure>${inner}</figure>` }]) : [];
      }
      case "figcaption": {
        const inner = renderInline(this.walk(el.children, ctx), ctx);
        return hasText(inner) ? [{ kind: "block", html: `<figcaption>${inner}</figcaption>` }] : [];
      }
      case "hr":
        return this.mark([{ kind: "block", html: "<hr>" }]);
      case "br":
        return /Apple-interchange-newline/.test(el.attribs.class ?? "") ? [] : [{ kind: "inline", html: "<br>" }];
      case "img":
        return this.image(el);
      case "code":
        return [{ kind: "inline", html: `<code>${escapeText(textOf(el))}</code>` }];
      case "a":
        return this.link(el, ctx);
    }
    if (TRANSPARENT.has(tag)) return this.walk(el.children, ctx);
    // Spans, strong, em, u, font, mark…: formatting is carried on the text, so blocks inside them stay valid.
    return this.walk(el.children, formatFor(el, ctx));
  }

  private mark<T extends Piece>(pieces: T[]) {
    if (pieces.length) this.sawBlock = true;
    return pieces;
  }

  private heading(el: Element, ctx: Ctx): Piece[] {
    const level = Number(el.name[1]);
    const inner = this.walk(el.children, { ...formatFor(el, ctx), heading: true });
    const textual = renderInline(inner.filter((p) => p.kind !== "block"), { ...ctx, heading: true });
    const blocks = inner.filter((p) => p.kind === "block");
    // Docs exports the document title as an h1 that repeats the page title.
    if (level === 1 && !this.sawBlock) return this.mark(blocks);
    if (!hasText(textual)) return this.mark(blocks);

    const out = level <= 2 ? 2 : level === 3 ? 3 : 4;
    let attrs = alignClass(el);
    if (out <= 3) {
      const text = textual.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
      const id = this.headingId(text);
      this.toc.push({ id, text, level: out as 2 | 3 });
      attrs = ` id="${id}"${attrs}`;
    }
    return this.mark([{ kind: "block", html: `<h${out}${attrs}>${textual}</h${out}>` }, ...blocks]);
  }

  private list(el: Element, ctx: Ctx): Block[] {
    const items: string[] = [];
    for (const child of el.children) {
      if (isTag(child) && child.name === "li") {
        const inner = mixed(this.walk(child.children, formatFor(child, ctx)), ctx);
        if (hasText(inner)) items.push(`<li>${inner}</li>`);
      } else if (isTag(child) && (child.name === "ul" || child.name === "ol")) {
        // Docs sometimes emits a nested list as a sibling of the item it belongs to.
        const nested = this.list(child, ctx).map((p) => p.html).join("");
        if (!nested) continue;
        if (items.length) items[items.length - 1] = items[items.length - 1].replace(/<\/li>$/, `${nested}</li>`);
        else items.push(`<li>${nested}</li>`);
      } else {
        const inner = renderInline(this.walk([child], ctx), ctx);
        if (hasText(inner)) items.push(`<li>${inner}</li>`);
      }
    }
    return items.length ? this.mark<Block>([{ kind: "block", html: `<${el.name}>${items.join("")}</${el.name}>` }]) : [];
  }

  private table(el: Element, ctx: Ctx): Piece[] {
    const rows: { el: Element; head: boolean }[] = [];
    const collect = (parent: Element, head: boolean) => {
      for (const child of parent.children) {
        if (!isTag(child)) continue;
        if (child.name === "tr") rows.push({ el: child, head });
        else if (child.name === "thead") collect(child, true);
        else if (child.name === "tbody" || child.name === "tfoot") collect(child, head);
      }
    };
    collect(el, false);
    if (!rows.length) return [];

    const cellsOf = (row: Element) => row.children.filter((c): c is Element => isTag(c) && (c.name === "td" || c.name === "th"));
    const first = cellsOf(rows[0].el);
    const promote =
      !rows.some((r) => r.head) &&
      rows.length > 1 &&
      first.length > 1 &&
      first.every((cell) => cell.name === "th" || (textOf(cell).trim() && allBold(cell, { ...ctx, ...PLAIN })));
    if (promote) rows[0].head = true;

    const span = (value: string | undefined) => {
      const n = Number(value);
      return Number.isInteger(n) && n > 1 && n <= 20 ? n : 0;
    };
    const renderRow = (row: Element, head: boolean) => {
      const cells = cellsOf(row).map((cell) => {
        const tag = head || cell.name === "th" ? "th" : "td";
        const inner = mixed(this.walk(cell.children, { ...ctx, header: tag === "th" }), { ...ctx, header: tag === "th" });
        const colspan = span(cell.attribs.colspan);
        const rowspan = span(cell.attribs.rowspan);
        const attrs = `${colspan ? ` colspan="${colspan}"` : ""}${rowspan ? ` rowspan="${rowspan}"` : ""}${alignClass(cell)}`;
        return `<${tag}${attrs}>${inner}</${tag}>`;
      });
      return cells.length ? `<tr>${cells.join("")}</tr>` : "";
    };

    const head = rows.filter((r) => r.head).map((r) => renderRow(r.el, true)).join("");
    const body = rows.filter((r) => !r.head).map((r) => renderRow(r.el, false)).join("");
    if (!head && !body) return [];
    const html = `<div class="table-wrap"><table>${head ? `<thead>${head}</thead>` : ""}${body ? `<tbody>${body}</tbody>` : ""}</table></div>`;
    return this.mark([{ kind: "block", html }]);
  }

  private image(el: Element): Piece[] {
    const src = (el.attribs.src ?? "").trim();
    if (!/^https:\/\//i.test(src)) return [];
    const size = (value: string | undefined) => (/^\d{1,4}$/.test(value ?? "") ? value : null);
    const width = size(el.attribs.width);
    const height = size(el.attribs.height);
    const html = `<img src="${escapeAttr(src)}" alt="${escapeAttr(el.attribs.alt ?? "")}"${width ? ` width="${width}"` : ""}${height ? ` height="${height}"` : ""} loading="lazy" decoding="async">`;
    return [{ kind: "inline", html }];
  }

  private link(el: Element, ctx: Ctx): Piece[] {
    const pieces = this.walk(el.children, { ...ctx, link: true });
    const href = safeHref(el.attribs.href);
    // Unsafe links and links wrapped around blocks (malformed) keep their content without the anchor.
    if (!href || pieces.some((p) => p.kind === "block")) return pieces;
    const inner = renderInline(pieces, { ...ctx, link: true });
    if (!hasText(inner)) return [];
    const external = /^https?:\/\//i.test(href) && !/^https?:\/\/(www\.)?contenaissance\.com(\/|$)/i.test(href);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return [{ kind: "inline", html: `<a href="${escapeAttr(href)}"${attrs}>${inner}</a>` }];
  }
}

const ALIGN = ["ta-center", "ta-right", "ta-justify"];

/** Security boundary: only the markup the builder emits survives, whatever the input was. */
const GUARD: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr", "ul", "ol", "li", "blockquote", "pre", "code",
    "strong", "em", "u", "s", "a", "img", "figure", "figcaption",
    "div", "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading", "decoding"],
    h2: ["id", "class"],
    h3: ["id", "class"],
    h4: ["class"],
    p: ["class"],
    th: ["colspan", "rowspan", "class"],
    td: ["colspan", "rowspan", "class"],
    div: ["class"],
  },
  allowedClasses: { h2: ALIGN, h3: ALIGN, h4: ALIGN, p: ALIGN, th: ALIGN, td: ALIGN, div: ["table-wrap"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
};

export function renderPostContent(raw: string): PostContent {
  const builder = new Builder();
  const ctx: Ctx = { ...PLAIN, heading: false, link: false, header: false };
  const pieces = builder.walk(parseDocument(raw, { decodeEntities: true }).children, ctx);
  const html = blocksFrom(pieces, ctx, (inner) => `<p>${inner}</p>`)
    .map((p) => p.html)
    .join("\n");
  return { html: sanitizeHtml(html, GUARD), toc: builder.toc };
}

/** Plain-text word count for reading time (200 wpm, minimum one minute). */
export function readingMinutes(html: string) {
  const text = parseDocument(html, { decodeEntities: true }).children.map(textOf).join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
