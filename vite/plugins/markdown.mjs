// Shared markdown rendering pipeline for the blog.
// Used by the Vite content plugin (vite/plugins/content.ts) and by
// scripts/generate-rss.mjs, so both render posts exactly the same way.
import fs from "node:fs";
import path from "node:path";

import { katex } from "@mdit/plugin-katex";
import Shiki from "@shikijs/markdown-it";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";

let markdownPromise;

export function getMarkdown() {
  markdownPromise ??= createMarkdown();
  return markdownPromise;
}

async function createMarkdown() {
  const md = new MarkdownIt({ html: true, linkify: true });

  md.use(katex);
  md.use(headingAnchorPlugin);
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
    const src = token.attrGet("src");
    if (src && typeof env?.resolveImage === "function") {
      token.attrSet("src", env.resolveImage(src));
    }
    return defaultImage(tokens, idx, options, env, self);
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

function headingAnchorPlugin(md) {
  md.core.ruler.push("heading_anchor", state => {
    const seen = new Map();
    for (let i = 0; i < state.tokens.length - 1; i += 1) {
      const token = state.tokens[i];
      if (token.type !== "heading_open") continue;
      const inline = state.tokens[i + 1];
      if (inline?.type !== "inline") continue;
      const base = slugify(inline.content);
      if (!base) continue;
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      token.attrSet("id", count === 0 ? base : `${base}-${count}`);
    }
  });
}

export function stripTags(html) {
  return html.replace(/<[^>]*>/g, "");
}

export function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function extractToc(html) {
  const toc = [];
  const pattern = /<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    toc.push({
      depth: Number(match[1]),
      id: match[2],
      text: decodeEntities(stripTags(match[3])).trim(),
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

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value) {
  if (!CALENDAR_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Mirrors src/features/weekend-calendar/schema.ts (kept dependency-free so
// both the Vite plugin and plain Node scripts can use it).
function validateWeekendCalendar(input, slug) {
  const fail = reason => {
    throw new Error(`Invalid weekendCalendar in post "${slug}": ${reason}`);
  };
  if (typeof input?.summary !== "string" || input.summary.trim() === "") {
    fail("summary must be a non-empty string");
  }
  if (!Array.isArray(input.events) || input.events.length === 0) {
    fail("events must be a non-empty array");
  }
  const events = input.events.map((event, index) => {
    if (typeof event?.date !== "string" || !isValidCalendarDate(event.date)) {
      fail(`events[${index}].date must be a valid YYYY-MM-DD date`);
    }
    if (typeof event?.text !== "string" || event.text.trim() === "") {
      fail(`events[${index}].text must be a non-empty string`);
    }
    return { date: event.date, text: event.text.trim() };
  });
  return { summary: input.summary.trim(), events };
}

export async function parsePost(filePath, { resolveImage } = {}) {
  const md = await getMarkdown();
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const slug = path.basename(filePath, ".md");

  const marker = "<!-- excerpt -->";
  const markerIndex = content.indexOf(marker);
  // Only the author's explicit <!-- excerpt --> truncation becomes the
  // excerpt; never fall back to an auto-generated first-paragraph summary.
  const excerptSource = markerIndex >= 0 ? content.slice(0, markerIndex) : "";
  const excerpt = decodeEntities(stripTags(md.render(excerptSource, {})))
    .replace(/\s+/g, " ")
    .trim();

  const body = markerIndex >= 0 ? content.replace(marker, "") : content;
  const html = md.render(body, { resolveImage });

  return {
    slug,
    title: String(data.title ?? slug),
    pubDatetime: toIsoDatetime(data.pubDatetime, slug),
    description: String(data.description ?? ""),
    tags: normalizeTags(data.tags),
    excerpt,
    html,
    toc: extractToc(html),
    weekendCalendar: data.weekendCalendar
      ? validateWeekendCalendar(data.weekendCalendar, slug)
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
