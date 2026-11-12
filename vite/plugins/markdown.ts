// Shared Markdown parsing for article chunks, static pages and RSS.
import fs from "node:fs";
import path from "node:path";

import { katex } from "@mdit/plugin-katex";
import Shiki from "@shikijs/markdown-it";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";

import type Token from "markdown-it/lib/token.mjs";
import type { Post, PostMeta, TocItem } from "../../src/types/post";
import { parseWeekendCalendar } from "../../shared/weekend-calendar";

export interface ResolvedImage {
  src: string;
  width?: number;
  height?: number;
}
export interface RenderOptions {
  resolveImage?: (
    src: string
  ) => string | ResolvedImage | Promise<string | ResolvedImage>;
  rssUrl?: string;
}
export interface ParsedPage {
  title: string;
  description: string;
  html: string;
}
export interface PostSource {
  md: MarkdownIt;
  data: Record<string, unknown>;
  content: string;
  marker: string;
  meta: PostMeta;
}
export interface RenderedPost {
  post: Post;
  rssHtml: string;
}
interface RenderEnvironment {
  images?: Map<string, string | ResolvedImage>;
  codeControls?: boolean;
  fenceHtml?: Map<Token, string>;
  absoluteUrl?: string;
}

let markdownPromise: Promise<MarkdownIt> | undefined;

const codeControls =
  '<button type="button" class="code-copy-button" aria-label="复制代码" title="复制代码" data-pagefind-ignore="all"></button><span class="sr-only" role="status" data-pagefind-ignore="all"></span>';

export function getMarkdown() {
  markdownPromise ??= createMarkdown();
  return markdownPromise;
}

async function createMarkdown() {
  const md = new MarkdownIt({ html: true, linkify: true });

  md.use(katex);
  md.use(anchor, { slugify: text => slugify(text) || "section" });
  md.use(
    await Shiki({
      themes: { light: "vitesse-light", dark: "vitesse-dark" },
      defaultColor: false,
    })
  );

  // Let callers rewrite image srcs (e.g. relative paths) via env.resolveImage.
  const defaultImage =
    md.renderer.rules.image ??
    ((tokens, idx, options, env, self) =>
      self.renderToken(tokens, idx, options));
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
    const image = src ? env?.images?.get(src) : undefined;
    if (image) {
      token.attrSet("src", typeof image === "string" ? image : image.src);
      if (typeof image !== "string") {
        if (image.width) token.attrSet("width", String(image.width));
        if (image.height) token.attrSet("height", String(image.height));
      }
    }
    if (env.absoluteUrl)
      token.attrSet(
        "src",
        new URL(token.attrGet("src")!, env.absoluteUrl).href
      );
    return defaultImage(tokens, idx, options, env, self);
  };

  md.renderer.rules.link_open = (
    tokens,
    idx,
    options,
    env: RenderEnvironment,
    self
  ) => {
    const href = tokens[idx].attrGet("href");
    if (href && env.absoluteUrl)
      tokens[idx].attrSet("href", new URL(href, env.absoluteUrl).href);
    return self.renderToken(tokens, idx, options);
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
    let pre = env.fenceHtml?.get(tokens[idx]);
    if (!pre) {
      pre = defaultFence(tokens, idx, options, env, self).replace(
        /<pre(?=[\s>])/,
        `<pre data-language="${language}"`
      );
      env.fenceHtml?.set(tokens[idx], pre);
    }
    return `<div class="code-block" data-language="${language}">${pre}${env?.codeControls === false ? "" : codeControls}</div>\n`;
  };

  return md;
}

// github-slugger-like slugify that keeps CJK characters.
export function slugify(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function validateWeekendCalendar(input: unknown, slug: string) {
  try {
    return parseWeekendCalendar(input);
  } catch (error) {
    throw new TypeError(
      `Invalid weekendCalendar in post "${slug}": ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
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

  const marker = "<!-- excerpt -->";
  const markerIndex = content.indexOf(marker);
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
    md,
    data,
    content,
    marker,
    meta: {
      slug,
      title: String(data.title ?? slug),
      pubDatetime: toIsoDatetime(data.pubDatetime, slug),
      description: String(data.description ?? ""),
      tags: normalizeTags(data.tags),
      excerpt,
    },
  };
}

export async function renderPost(
  source: PostSource,
  { resolveImage, rssUrl }: RenderOptions = {}
): Promise<RenderedPost> {
  const { md, data, content, marker, meta } = source;
  const body = content.replace(marker, "");
  const env: RenderEnvironment = { images: new Map(), fenceHtml: new Map() };
  const tokens = md.parse(body, env);
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
      if (src) env.images!.set(src, await resolveImage(src));
    }
  }
  const html = md.renderer.render(tokens, md.options, env);
  const post: Post = {
    ...meta,
    html,
    ...readingStats(tokens),
    toc: extractToc(tokens),
    weekendCalendar:
      data.weekendCalendar != null
        ? validateWeekendCalendar(data.weekendCalendar, meta.slug)
        : null,
  };
  const rssHtml = md.renderer.render(tokens, md.options, {
    ...env,
    codeControls: false,
    absoluteUrl: rssUrl,
  });
  return { post, rssHtml };
}

export async function parsePage(filePath: string): Promise<ParsedPage> {
  const md = await getMarkdown();
  const { data, content } = matter(fs.readFileSync(filePath, "utf8"));
  return {
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    html: md.render(content, {}),
  };
}
