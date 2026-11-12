import fs from "node:fs/promises";
import path from "node:path";

import siteConfig from "../../site.config.json";
import { buildWeekendCalendar } from "../../src/features/weekend-calendar/model";
import { SNAPSHOT_FILE, type ContentSnapshot } from "./content";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Serializes the same published snapshot used by the client and SSR builds. */
export function buildFeeds({ posts }: ContentSnapshot) {
  const { site } = siteConfig;
  const items = posts
    .map(({ post, rssHtml }) => {
      const link = escapeXml(
        new URL(`posts/${encodeURIComponent(post.slug)}`, site.url).href
      );
      let calendarHtml = "";
      if (post.weekendCalendar) {
        const calendar = buildWeekendCalendar(post.weekendCalendar.events);
        const months = calendar.months
          .map(
            month =>
              `<h3>${escapeXml(month.label)}</h3><ul>${month.agenda
                .flatMap(day =>
                  day.events.map(
                    event =>
                      `<li><time datetime="${day.date}">${day.date}</time> ${escapeXml(event.text)}</li>`
                  )
                )
                .join("")}</ul>`
          )
          .join("");
        calendarHtml = `<section><h2>周末日程</h2><p>${escapeXml(post.weekendCalendar.summary)}</p><p>${escapeXml(calendar.rangeLabel)} · 共 ${calendar.totalEvents} 项</p>${months}</section>`;
      }
      const content = (rssHtml + calendarHtml).replaceAll(
        "]]>",
        "]]]]><![CDATA[>"
      );
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(post.pubDatetime).toUTCString()}</pubDate>
      <description>${escapeXml(post.description || post.excerpt)}</description>
${post.tags.map(tag => `      <category>${escapeXml(tag)}</category>\n`).join("")}      <content:encoded><![CDATA[${content}]]></content:encoded>
    </item>`;
    })
    .join("\n");
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${escapeXml(site.url)}</link>
    <description>${escapeXml(site.description)}</description>
    <language>${escapeXml(site.lang)}</language>
    <atom:link href="${escapeXml(new URL("rss.xml", site.url).href)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  const tags = [...new Set(posts.flatMap(({ post }) => post.tags))];
  const paths = [
    "/",
    "/archives",
    "/tags",
    "/about",
    "/links",
    ...tags.map(tag => `/tags/${encodeURIComponent(tag)}`),
  ];
  const urls = [
    ...paths.map(
      url => `<url><loc>${escapeXml(new URL(url, site.url).href)}</loc></url>`
    ),
    ...posts.map(
      ({ post }) =>
        `<url><loc>${escapeXml(new URL(`posts/${encodeURIComponent(post.slug)}`, site.url).href)}</loc><lastmod>${post.pubDatetime.slice(0, 10)}</lastmod></url>`
    ),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  return { rss, sitemap };
}

/** Runs after SSG has written every route, including the real not-found page. */
export async function finishContentBuild(outDir: string) {
  const snapshotPath = path.join(outDir, SNAPSHOT_FILE);
  const snapshot: ContentSnapshot = JSON.parse(
    await fs.readFile(snapshotPath, "utf8")
  );
  const { rss, sitemap } = buildFeeds(snapshot);
  await Promise.all([
    fs.writeFile(path.join(outDir, "rss.xml"), rss),
    fs.writeFile(path.join(outDir, "sitemap.xml"), sitemap),
    fs.copyFile(
      path.join(outDir, "404/index.html"),
      path.join(outDir, "404.html")
    ),
  ]);
  await fs.unlink(snapshotPath);
  console.log(
    `content: RSS, sitemap and 404 published (${snapshot.posts.length} posts)`
  );
}
