// Generates dist/rss.xml and dist/sitemap.xml after `vite build`.
// Renders posts with the same markdown pipeline as the site itself.
import fs from "node:fs";
import path from "node:path";

import siteConfig from "../site.config.json" with { type: "json" };
import { parsePost } from "../vite/plugins/markdown.mjs";

const { site, posts: postsConfig, editPost } = siteConfig;

// Relative images cannot resolve inside RSS readers; point them at the raw
// files in the GitHub repository instead.
const rawContentBase = editPost.url
  .replace("github.com", "raw.githubusercontent.com")
  .replace("/edit/", "/");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value) {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

function siteUrl(pathname = "") {
  return new URL(pathname, site.url).href;
}

async function loadPosts() {
  const postsDir = path.join("src", "content", "posts");
  const files = fs
    .readdirSync(postsDir)
    .filter(file => file.endsWith(".md"))
    .sort();

  const now = Date.now();
  const posts = [];
  for (const file of files) {
    const post = await parsePost(path.join(postsDir, file), {
      resolveImage: src =>
        src.startsWith("./") || src.startsWith("../")
          ? rawContentBase +
            `src/content/posts/${path.basename(file, ".md")}/` +
            src.replace(/^\.\//, "")
          : src,
    });
    if (
      new Date(post.pubDatetime).getTime() <=
      now + postsConfig.scheduledPostMargin
    ) {
      posts.push(post);
    }
  }

  return posts.sort(
    (a, b) => new Date(b.pubDatetime) - new Date(a.pubDatetime)
  );
}

function buildRss(posts) {
  const items = posts
    .map(post => {
      const link = siteUrl(`posts/${post.slug}`);
      const categories = post.tags
        .map(tag => `      <category>${escapeXml(tag)}</category>`)
        .join("\n");
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(post.pubDatetime).toUTCString()}</pubDate>
      <description>${escapeXml(post.description || post.excerpt)}</description>
${categories ? `${categories}\n` : ""}      <content:encoded>${cdata(post.html)}</content:encoded>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${siteUrl()}</link>
    <description>${escapeXml(site.description)}</description>
    <language>${site.lang}</language>
    <atom:link href="${siteUrl("rss.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

function buildSitemap(posts) {
  const staticPaths = ["/", "/archives", "/tags", "/about", "/links"];
  const tags = [...new Set(posts.flatMap(post => post.tags))];
  for (const tag of tags) {
    staticPaths.push(`/tags/${encodeURIComponent(tag)}`);
  }

  const urls = [
    ...staticPaths.map(
      pathname =>
        `  <url><loc>${siteUrl(pathname.replace(/^\//, ""))}</loc></url>`
    ),
    ...posts.map(
      post => `  <url>
    <loc>${siteUrl(`posts/${post.slug}`)}</loc>
    <lastmod>${post.pubDatetime.slice(0, 10)}</lastmod>
  </url>`
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

const posts = await loadPosts();
fs.writeFileSync(path.join("dist", "rss.xml"), buildRss(posts));
fs.writeFileSync(path.join("dist", "sitemap.xml"), buildSitemap(posts));
console.log(
  `generate-rss: dist/rss.xml and dist/sitemap.xml (${posts.length} posts)`
);
