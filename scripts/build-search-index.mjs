// Builds the Pagefind full-text search index into dist/pagefind.
// The site is an SPA with no crawlable static pages, so every post's rendered
// text is fed to Pagefind's Node API directly (same markdown pipeline as the
// site itself).
import fs from "node:fs";
import path from "node:path";

import * as pagefind from "pagefind";

import siteConfig from "../site.config.json" with { type: "json" };
import {
  decodeEntities,
  parsePage,
  parsePost,
  stripTags,
} from "../vite/plugins/markdown.mjs";

const { posts: postsConfig } = siteConfig;
const now = Date.now();

function toPlainText(html) {
  return decodeEntities(stripTags(html)).replace(/\s+/g, " ").trim();
}

const { index } = await pagefind.createIndex({ language: "zh" });

const postsDir = "src/content/posts";
const files = fs
  .readdirSync(postsDir)
  .filter(file => file.endsWith(".md"))
  .sort();

let count = 0;
for (const file of files) {
  const post = await parsePost(path.join(postsDir, file));
  const published =
    new Date(post.pubDatetime).getTime() <=
    now + postsConfig.scheduledPostMargin;
  if (!published) continue;
  await index.addCustomRecord({
    url: `/posts/${post.slug}`,
    content: toPlainText(post.html),
    meta: { title: post.title },
    language: "zh",
  });
  count += 1;
}

const about = await parsePage("src/content/pages/about.md");
await index.addCustomRecord({
  url: "/about",
  content: toPlainText(about.html),
  meta: { title: about.title },
  language: "zh",
});
count += 1;

await index.writeFiles({ outputPath: "dist/pagefind" });
await pagefind.close();
console.log(`build-search-index: ${count} records → dist/pagefind`);
