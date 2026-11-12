// Shared markdown rendering pipeline for the blog.
// Used by the Vite content plugin (vite/plugins/content.ts) and by
// scripts/generate-rss.mjs, so both render posts exactly the same way.
import fs from "node:fs";
import path from "node:path";

import { katex } from "@mdit/plugin-katex";
import Shiki from "@shikijs/markdown-it";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";

import { parseWeekendCalendar } from "../../shared/weekend-calendar.mjs";

let markdownPromise;

const codeControls =
  '<button type="button" class="code-copy-button" aria-label="复制代码" title="复制代码" data-pagefind-ignore="all"><svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><svg class="copied-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button><span class="sr-only" role="status" data-pagefind-ignore="all"></span>';

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
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    token.attrSet("loading", "lazy");
    token.attrSet("decoding", "async");
    const src = token.attrGet("src");
    if (src && env?.images?.has(src)) {
      const image = env.images.get(src);
      token.attrSet("src", typeof image === "string" ? image : image.src);
      if (typeof image !== "string") {
        if (image.width) token.attrSet("width", String(image.width));
        if (image.height) token.attrSet("height", String(image.height));
      }
    }
    return defaultImage(tokens, idx, options, env, self);
  };

  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const language = md.utils.escapeHtml(
      tokens[idx].info.trim().split(/\s+/)[0] || "text"
    );
    const pre = defaultFence(tokens, idx, options, env, self).replace(
      /<pre(?=[\s>])/,
      `<pre data-language="${language}"`
    );
    return `<div class="code-block" data-language="${language}">${pre}${env?.codeControls === false ? "" : codeControls}</div>\n`;
  };

  return md;
}

// github-slugger-like slugify that keeps CJK characters.
export function slugify(text) {
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
function inlineText(tokens, separator = "", excerpt = false) {
  const parts = [];
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
export function extractToc(tokens) {
  const toc = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "heading_open" || !["h2", "h3"].includes(token.tag))
      continue;
    const inline = tokens[index + 1];
    const text = inlineText(inline?.children ?? []).trim();
    toc.push({
      depth: Number(token.tag.slice(1)),
      id: token.attrGet("id"),
      text,
    });
  }
  return toc;
}

function toIsoDatetime(value, slug) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid pubDatetime in post "${slug}": ${value}`);
  }
  return date.toISOString();
}

function normalizeTags(tags) {
  if (tags == null) return [];
  const list = Array.isArray(tags) ? tags : [tags];
  return list.map(tag => String(tag).trim()).filter(Boolean);
}

function validateWeekendCalendar(input, slug) {
  try {
    return parseWeekendCalendar(input);
  } catch (error) {
    throw new TypeError(
      `Invalid weekendCalendar in post "${slug}": ${error.message}`,
      { cause: error }
    );
  }
}

// Count CJK characters individually and Latin words as units, excluding markup.
export function readingStats(tokens) {
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

async function readPostSource(filePath) {
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

export async function parsePostMeta(filePath) {
  return (await readPostSource(filePath)).meta;
}

export async function parsePost(
  filePath,
  { resolveImage, codeControls = true } = {}
) {
  const { md, data, content, marker, meta } = await readPostSource(filePath);
  const body = content.replace(marker, "");
  const env = { images: new Map(), codeControls };
  const tokens = md.parse(body, env);
  if (resolveImage) {
    const sources = new Set();
    const collectImages = tokens => {
      for (const token of tokens) {
        if (token.type === "image") sources.add(token.attrGet("src"));
        if (token.children) collectImages(token.children);
      }
    };
    collectImages(tokens);
    for (const src of sources) {
      if (src) env.images.set(src, await resolveImage(src));
    }
  }
  const html = md.renderer.render(tokens, md.options, env);
  return {
    ...meta,
    html,
    ...readingStats(tokens),
    toc: extractToc(tokens),
    weekendCalendar:
      data.weekendCalendar != null
        ? validateWeekendCalendar(data.weekendCalendar, meta.slug)
        : null,
  };
}

export async function parsePage(filePath) {
  const md = await getMarkdown();
  const { data, content } = matter(fs.readFileSync(filePath, "utf8"));
  return {
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    html: md.render(content, {}),
  };
}
