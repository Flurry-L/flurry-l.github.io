import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { parseFragment, serialize, type DefaultTreeAdapterTypes } from "parse5";
import RSS from "rss";
import { SitemapStream, streamToPromise } from "sitemap";
import { escape } from "es-toolkit/string";

import siteConfig from "../../site.config.json";
import type { Content } from "./content";

/** Adapt rendered HTML without parsing Markdown or highlighting code again. */
export function rssHtml(html: string, url: string) {
  const fragment = parseFragment(html);
  function visit(parent: DefaultTreeAdapterTypes.ParentNode) {
    parent.childNodes = parent.childNodes.filter(
      node =>
        !(
          "attrs" in node &&
          node.attrs.some(attr => attr.name === "data-code-controls")
        )
    );
    for (const node of parent.childNodes) {
      if ("attrs" in node) {
        for (const attr of node.attrs) {
          if (attr.name === "src" || attr.name === "href")
            attr.value = new URL(attr.value, url).href;
        }
      }
      if ("childNodes" in node) visit(node);
    }
  }
  visit(fragment);
  return serialize(fragment);
}

/** Serializes the same published content used by the client and SSR builds. */
export function buildRss({ posts }: Content) {
  const { site } = siteConfig;
  const feed = new RSS({
    title: site.title,
    site_url: site.url,
    description: site.description,
    language: site.lang,
    feed_url: new URL("rss.xml", site.url).href,
  });
  for (const post of posts) {
    const url = new URL(`posts/${encodeURIComponent(post.slug)}`, site.url)
      .href;
    let calendarHtml = "";
    if (post.weekendCalendar) {
      const { summary, events } = post.weekendCalendar;
      const items = [...events]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(
          event =>
            `<li><time datetime="${event.date}">${event.date}</time> ${escape(event.text)}</li>`
        )
        .join("");
      calendarHtml = `<section><h2>周末日程</h2><p>${escape(summary)}</p><ul>${items}</ul></section>`;
    }
    feed.item({
      title: post.title,
      url,
      date: new Date(post.pubDatetime),
      description: post.description || post.excerpt,
      categories: post.tags,
      custom_elements: [
        {
          "content:encoded": { _cdata: rssHtml(post.html, url) + calendarHtml },
        },
      ],
    });
  }
  return feed.xml({ indent: true });
}

export async function buildSitemap(
  { posts }: Content,
  routes: readonly string[]
) {
  const postDates = new Map(
    posts.map(post => [
      `/posts/${encodeURIComponent(post.slug)}`,
      post.pubDatetime,
    ])
  );
  const urls = routes
    .filter(route => route !== "/404")
    .sort()
    .map(url => ({ url, lastmod: postDates.get(url) }));
  const stream = new SitemapStream({ hostname: siteConfig.site.url });
  return (await streamToPromise(Readable.from(urls).pipe(stream))).toString();
}

/** Runs after SSG has written every route, including the real not-found page. */
export async function finishContentBuild(
  content: Content,
  outDir: string,
  routes: readonly string[]
) {
  const rss = buildRss(content);
  const sitemap = await buildSitemap(content, routes);
  await Promise.all([
    fs.writeFile(path.join(outDir, "rss.xml"), rss),
    fs.writeFile(path.join(outDir, "sitemap.xml"), sitemap),
    fs.copyFile(
      path.join(outDir, "404/index.html"),
      path.join(outDir, "404.html")
    ),
  ]);
  console.log(
    `content: RSS, sitemap and 404 published (${content.posts.length} posts)`
  );
}
