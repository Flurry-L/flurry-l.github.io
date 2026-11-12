// Shared Markdown parsing for article chunks, static pages and RSS.
import fs from "node:fs";
import path from "node:path";

import { katex } from "@mdit/plugin-katex";
import Shiki from "@shikijs/markdown-it";
import matter from "gray-matter";
import { slug as slugify } from "github-slugger";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import cjkBreaks from "markdown-it-cjk-breaks";

import type Token from "markdown-it/lib/token.mjs";
import siteConfig from "../../site.config.json";
import type {
  Post,
  PostMeta,
  TocItem,
  WeekendCalendarInput,
} from "../../src/types/post";

export interface ResolvedImage {
  src: string;
  width?: number;
  height?: number;
}
export interface RenderOptions {
  resolveImage?: (src: string) => Promise<ResolvedImage>;
}
export interface ParsedPage {
  title: string;
  description: string;
  html: string;
}
export interface PostSource {
  data: Record<string, unknown>;
  content: string;
  meta: PostMeta;
}
interface RenderEnvironment {
  images?: Map<string, ResolvedImage>;
}

let markdownPromise: Promise<MarkdownIt> | undefined;
const EXCERPT_MARKER = "<!-- excerpt -->";

const codeControls =
  '<button type="button" class="code-copy-button" aria-label="复制代码" title="复制代码" data-code-controls data-pagefind-ignore="all"></button><span class="sr-only" role="status" data-code-controls data-pagefind-ignore="all"></span>';

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: siteConfig.site.timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function publicationDate(iso: string) {
  const parts = Object.fromEntries(
    dateFormatter
      .formatToParts(new Date(iso))
      .map(part => [part.type, part.value])
  );
  return {
    dateLabel: `${parts.year}年${Number(parts.month)}月${Number(parts.day)}日`,
    archiveDate: `${parts.month}-${parts.day}`,
    year: Number(parts.year),
  };
}

export function getMarkdown() {
  markdownPromise ??= createMarkdown();
  return markdownPromise;
}

async function createMarkdown() {
  const md = new MarkdownIt({ html: true, linkify: true });

  md.use(cjkBreaks);
  md.use(katex);
  md.use(anchor, { slugify: text => slugify(text) || "section" });
  md.use(
    await Shiki({
      themes: { light: "vitesse-light", dark: "vitesse-dark" },
      defaultColor: false,
    })
  );

  // Image assets are resolved before rendering.
  const defaultImage = md.renderer.rules.image!;
  md.renderer.rules.image = (
    tokens,
    idx,
    options,
    env: RenderEnvironment,
    self
  ) => {
    const token = tokens[idx];
    token.attrSet("loading", "lazy");
    token.attrSet("decoding", "async");
    const src = token.attrGet("src");
    const image = src ? env.images?.get(src) : undefined;
    if (image) {
      token.attrSet("src", image.src);
      if (image.width) token.attrSet("width", String(image.width));
      if (image.height) token.attrSet("height", String(image.height));
    }
    return defaultImage(tokens, idx, options, env, self);
  };

  const defaultFence = md.renderer.rules.fence!;
  md.renderer.rules.fence = (
    tokens,
    idx,
    options,
    env: RenderEnvironment,
    self
  ) => {
    const language = md.utils.escapeHtml(
      tokens[idx].info.trim().split(/\s+/)[0] || "text"
    );
    const pre = defaultFence(tokens, idx, options, env, self).replace(
      /<pre(?=[\s>])/,
      `<pre data-language="${language}"`
    );
    return `<div class="code-block" data-language="${language}">${pre}${codeControls}</div>\n`;
  };

  return md;
}

// Keep prose token boundaries for reading counts, but join visible inline text
// naturally for headings and excerpts. Only excerpts include image alt/math.
function inlineText(tokens: Token[], separator = "", excerpt = false) {
  const parts: string[] = [];
  for (const token of tokens) {
    if (
      token.type === "text" ||
      token.type === "code_inline" ||
      (excerpt && token.type === "math_inline")
    ) {
      parts.push(token.content);
    } else if (token.type === "softbreak" || token.type === "hardbreak") {
      parts.push(" ");
    } else if (excerpt && token.type === "image") {
      parts.push(inlineText(token.children ?? [], "", true));
    }
  }
  return parts.join(separator);
}

/** Read the final heading IDs from Markdown tokens, not rendered HTML. */
export function extractToc(tokens: Token[]): TocItem[] {
  const toc: TocItem[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "heading_open" || !["h2", "h3"].includes(token.tag))
      continue;
    const inline = tokens[index + 1];
    const text = inlineText(inline?.children ?? []).trim();
    toc.push({
      depth: Number(token.tag.slice(1)),
      id: token.attrGet("id")!,
      text,
    });
  }
  return toc;
}

function toIsoDatetime(value: unknown, slug: string) {
  const date =
    value instanceof Date
      ? value
      : new Date(typeof value === "number" ? value : String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid pubDatetime in post "${slug}": ${value}`);
  }
  return date.toISOString();
}

function normalizeTags(tags: unknown) {
  if (tags == null) return [];
  const list = Array.isArray(tags) ? tags : [tags];
  return list.map(tag => String(tag).trim()).filter(Boolean);
}

// Count CJK characters individually and Latin words as units, excluding markup.
export function readingStats(tokens: Token[]) {
  const text = tokens
    .map(token =>
      token.type === "inline" ? inlineText(token.children ?? [], " ") : ""
    )
    .join(" ");
  const cjk =
    text.match(
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu
    ) ?? [];
  const words =
    text
      .replace(
        /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
        " "
      )
      .match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
  return {
    wordCount: cjk.length + words.length,
    readingMinutes: Math.max(
      1,
      Math.ceil(cjk.length / 400 + words.length / 200)
    ),
  };
}

export async function readPostSource(filePath: string): Promise<PostSource> {
  const md = await getMarkdown();
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const slug = path.basename(filePath, ".md");
  const pubDatetime = toIsoDatetime(data.pubDatetime, slug);

  const markerIndex = content.indexOf(EXCERPT_MARKER);
  // Only the author's explicit <!-- excerpt --> truncation becomes the
  // excerpt; never fall back to an auto-generated first-paragraph summary.
  const excerptSource = markerIndex >= 0 ? content.slice(0, markerIndex) : "";
  const excerpt = (excerptSource ? md.parse(excerptSource, {}) : [])
    .map(token => {
      if (token.type === "inline")
        return inlineText(token.children ?? [], "", true);
      if (["fence", "code_block", "math_block"].includes(token.type))
        return token.content;
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    data,
    content,
    meta: {
      slug,
      title: String(data.title ?? slug),
      pubDatetime,
      ...publicationDate(pubDatetime),
      description: String(data.description ?? ""),
      tags: normalizeTags(data.tags),
      excerpt,
    },
  };
}

export async function renderPost(
  source: PostSource,
  options: RenderOptions = {}
): Promise<Post> {
  const { data, content, meta } = source;
  const body = content.replace(EXCERPT_MARKER, "");
  const { html, tokens } = await renderMarkdown(body, options);
  return {
    ...meta,
    html,
    ...readingStats(tokens),
    toc: extractToc(tokens),
    weekendCalendar:
      (data.weekendCalendar as WeekendCalendarInput | undefined) ?? null,
  };
}

async function renderMarkdown(
  content: string,
  { resolveImage }: RenderOptions
) {
  const md = await getMarkdown();
  const images = new Map<string, ResolvedImage>();
  const env: RenderEnvironment = { images };
  const tokens = md.parse(content, env);
  if (resolveImage) {
    const sources = new Set<string>();
    const collectImages = (tokens: Token[]) => {
      for (const token of tokens) {
        if (token.type === "image") sources.add(token.attrGet("src")!);
        if (token.children) collectImages(token.children);
      }
    };
    collectImages(tokens);
    for (const src of sources) {
      if (src) images.set(src, await resolveImage(src));
    }
  }
  return {
    html: md.renderer.render(tokens, md.options, env),
    tokens,
  };
}

export async function parsePage(
  filePath: string,
  options: RenderOptions = {}
): Promise<ParsedPage> {
  const { data, content } = matter(fs.readFileSync(filePath, "utf8"));
  const { html } = await renderMarkdown(content, options);
  return {
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    html,
  };
}
