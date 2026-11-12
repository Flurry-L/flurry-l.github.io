import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import { parseWeekendCalendar } from "../shared/weekend-calendar";
import { buildContent, postMeta } from "../vite/plugins/content";
import { prepareImage } from "../vite/plugins/images";
import { buildFeeds } from "../vite/plugins/publish";
import {
  extractToc,
  getMarkdown,
  readPostSource,
  renderPost,
  readingStats,
  type RenderOptions,
} from "../vite/plugins/markdown";

import { formatDate, getYear, groupPostsByYear } from "../src/lib/format";
import { collectTags, filterByTag, type PostMeta } from "../src/lib/post-utils";

function makePost(overrides: Partial<PostMeta> & { slug: string }): PostMeta {
  return {
    title: overrides.slug,
    pubDatetime: "2025-01-01T00:00:00.000Z",
    description: "",
    tags: [],
    excerpt: "",
    ...overrides,
  };
}

const NOW = new Date("2026-07-26T00:00:00.000Z").getTime();
const MARGIN = 15 * 60 * 1000;

describe("build-time publication", () => {
  it("freezes sorted published content at the margin boundary and never renders future assets", async () => {
    const { root } = contentFixture(
      {
        old: "Old article",
        newer: "Newer article",
        boundary: "At the publication margin",
        future: "UNPUBLISHED_SECRET ![private](./does-not-exist.jpg)",
      },
      {
        old: "2024-01-01T00:00:00Z",
        newer: "2025-01-01T00:00:00Z",
        boundary: new Date(NOW + MARGIN).toISOString(),
        future: new Date(NOW + MARGIN + 1).toISOString(),
      }
    );
    const content = await buildContent(root, "/", NOW, MARGIN);
    expect(content.posts.map(({ post }) => post.slug)).toEqual([
      "boundary",
      "newer",
      "old",
    ]);
    expect(JSON.stringify(content)).not.toContain("UNPUBLISHED_SECRET");
    const { rss, sitemap } = buildFeeds(content);
    expect(rss).not.toContain("future");
    expect(sitemap).not.toContain("future");
    expect(content.assets.size).toBe(0);
  });
});

describe("tags", () => {
  const posts = [
    makePost({ slug: "a", tags: ["render", "math"] }),
    makePost({ slug: "b", tags: ["render"] }),
    makePost({ slug: "c", tags: [] }),
  ];

  it("collects unique tags with counts", () => {
    expect(collectTags(posts)).toEqual([
      { tag: "math", count: 1 },
      { tag: "render", count: 2 },
    ]);
  });

  it("filters posts by tag", () => {
    expect(filterByTag(posts, "render").map(post => post.slug)).toEqual([
      "a",
      "b",
    ]);
    expect(filterByTag(posts, "missing")).toEqual([]);
  });
});

describe("date formatting (Asia/Shanghai)", () => {
  it("formats dates in Chinese", () => {
    expect(formatDate("2024-11-19T14:25:00.000Z")).toBe("2024年11月19日");
  });

  it("uses the site timezone when the UTC date differs", () => {
    expect(formatDate("2024-11-19T16:00:00.000Z")).toBe("2024年11月20日");
    expect(getYear("2024-12-31T16:00:00.000Z")).toBe(2025);
  });
});

describe("groupPostsByYear", () => {
  it("groups by site-timezone year, years descending", () => {
    const posts = [
      makePost({ slug: "a", pubDatetime: "2026-03-01T00:00:00.000Z" }),
      makePost({ slug: "b", pubDatetime: "2024-12-31T16:00:00.000Z" }), // 2025 in +08:00
      makePost({ slug: "c", pubDatetime: "2024-06-01T00:00:00.000Z" }),
    ];

    const groups = groupPostsByYear(posts);

    expect(groups.map(group => group.year)).toEqual([2026, 2025, 2024]);
    expect(groups[1].posts.map(post => post.slug)).toEqual(["b"]);
  });
});

const fixtureRoots: string[] = [];

afterEach(() => {
  for (const root of fixtureRoots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

function contentFixture(
  posts: Record<string, string>,
  dates: Record<string, string> = {}
) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "flurry-content-"));
  fixtureRoots.push(root);
  const postsDir = path.join(root, "src/content/posts");
  fs.mkdirSync(postsDir, { recursive: true });
  fs.mkdirSync(path.join(root, "src/content/pages"), { recursive: true });
  for (const [slug, body] of Object.entries(posts)) {
    fs.writeFileSync(
      path.join(postsDir, `${slug}.md`),
      `---\ntitle: ${slug}\npubDatetime: ${dates[slug] ?? "2025-01-01"}\ntags: [test]\n---\n${body}`
    );
  }
  return { root, postsDir };
}

async function parsePost(filePath: string, options?: RenderOptions) {
  return (await renderPost(await readPostSource(filePath), options)).post;
}

async function parsePostMeta(filePath: string) {
  return (await readPostSource(filePath)).meta;
}

describe("content metadata", () => {
  it("keeps article bodies and headings out of the list payload", async () => {
    const { root } = contentFixture({
      first: "Visible excerpt\n<!-- excerpt -->\n## Private heading\nBody only",
      second: "No explicit excerpt",
    });
    const content = await buildContent(root);
    const posts = content.posts.map(({ post }) => postMeta(post));
    expect(posts.map(post => Object.keys(post).sort())).toEqual([
      ["description", "excerpt", "pubDatetime", "slug", "tags", "title"],
      ["description", "excerpt", "pubDatetime", "slug", "tags", "title"],
    ]);
    expect(posts[0].excerpt).toBe("Visible excerpt");
    expect(posts[1].excerpt).toBe("");
    expect(JSON.stringify(posts)).not.toMatch(/Private heading|Body only/);
  });
});

describe("explicit token-based excerpts", () => {
  it.each([
    [
      "&amp; &amp;lt; &#x4E2D; &quot;quoted&quot; &copy;",
      '& &lt; 中 "quoted" ©',
    ],
    [
      "First\nsecond  \nthird\n\nFourth paragraph",
      "First second third Fourth paragraph",
    ],
    [
      "A [visible **link**](https://example.com/hidden) and <em>HTML</em>",
      "A visible link and HTML",
    ],
    [
      "Use `&amp; <tag>`\n\n```text\nconst value = '<tag>';\nnext &amp;\n```\n\n    indented code",
      "Use &amp; <tag> const value = '<tag>'; next &amp; indented code",
    ],
    ["Inline $x^2$\n\n$$\ny = x + 1\n$$", "Inline x^2 y = x + 1"],
    [
      `Before ![small **caption**](data:image/png;base64,${"A".repeat(4096)}) after`,
      "Before small caption after",
    ],
  ])("extracts visible text without rendering: %s", async (body, expected) => {
    const { postsDir } = contentFixture({
      first: `${body}\n\n<!-- excerpt -->\nHidden remainder`,
    });
    const file = path.join(postsDir, "first.md");
    expect((await parsePostMeta(file)).excerpt).toBe(expected);
    expect((await parsePost(file)).excerpt).toBe(expected);
  });

  it("never invents an excerpt without the author's marker", async () => {
    const { postsDir } = contentFixture({
      first: "## Heading\n\nVisible paragraph with `code` and $x^2$",
    });
    const file = path.join(postsDir, "first.md");
    expect((await parsePostMeta(file)).excerpt).toBe("");
    expect((await parsePost(file)).excerpt).toBe("");
  });
});

describe("heading anchors and token-based TOC", () => {
  it("keeps repeated and already-suffixed headings independently addressable", async () => {
    const { postsDir } = contentFixture({
      first:
        "## Alpha\n\n## Alpha\n\n## Alpha-1\n\n### Alpha\n\n## 中文 标题\n\n## 中文 标题",
    });
    const post = await parsePost(path.join(postsDir, "first.md"));
    const headingIds = [
      ...post.html.matchAll(/<h[23]\b[^>]*\bid="([^"]+)"/g),
    ].map(match => match[1]);
    expect(new Set(headingIds).size).toBe(6);
    expect(post.toc.map(item => item.id)).toEqual(headingIds);
    expect(post.toc[4].id).toBe("中文-标题");
    expect(post.toc.map(item => item.depth)).toEqual([2, 2, 2, 3, 2, 2]);
  });

  it("uses visible heading text without link destinations and excludes other depths", async () => {
    const md = await getMarkdown();
    const tokens = md.parse(
      "# Top\n\n## [中文](https://example.org/unrelated) **标题** `API` &amp; 使用\n\n### Child\n\n#### Detail",
      {}
    );
    expect(extractToc(tokens)).toEqual([
      { depth: 2, id: "中文-标题-api-使用", text: "中文 标题 API & 使用" },
      { depth: 3, id: "child", text: "Child" },
    ]);
  });

  it("scopes duplicate IDs to each article even when excerpts contain headings", async () => {
    const { postsDir } = contentFixture({
      first: "## Shared\n<!-- excerpt -->\n## Shared",
      second: "## Shared",
    });
    const first = await parsePost(path.join(postsDir, "first.md"));
    const second = await parsePost(path.join(postsDir, "second.md"));
    expect(first.toc.map(item => item.id)).toEqual(["shared", "shared-1"]);
    expect(second.toc.map(item => item.id)).toEqual(["shared"]);
  });
});

describe("markdown reading metadata", () => {
  it.each<[string, number, number]>([
    ["", 0, 1],
    ["word ".repeat(200), 200, 1],
    ["word ".repeat(201), 201, 2],
    ["字".repeat(400), 400, 1],
    ["字".repeat(401), 401, 2],
    ["字".repeat(200) + "word ".repeat(100), 300, 1],
    ["字".repeat(200) + "word ".repeat(101), 301, 2],
    [
      "中文 **hello** [world](https://example.com) `inline`\n\n![ignored alt](photo.jpg)\n\n```js\nconst ignored = 1;\n```\n\n<!-- ignored -->",
      5,
      1,
    ],
  ])(
    "counts visible prose with minute boundaries: %j",
    async (body, wordCount, readingMinutes) => {
      const md = await getMarkdown();
      expect(readingStats(md.parse(body, {}))).toEqual({
        wordCount,
        readingMinutes,
      });
    }
  );

  it("labels both plain and highlighted fences and annotates images", async () => {
    const { postsDir } = contentFixture({
      first:
        "```\nplain text\n```\n\n```js\nconst n = 1;\n```\n\n![photo](./photo.jpg)",
    });
    const post = await parsePost(path.join(postsDir, "first.md"), {
      resolveImage: async () => ({
        src: "/assets/photo.webp",
        width: 800,
        height: 600,
      }),
    });
    expect(post.html).toMatch(/<pre\b[^>]*data-language="text"/);
    expect(post.html).toMatch(/<pre\b[^>]*data-language="js"/);
    expect(post.html).toMatch(/<img\b[^>]*src="\/assets\/photo.webp"/);
    expect(post.html).toContain('loading="lazy"');
    expect(post.html).toContain('decoding="async"');
    expect(post.html).toContain('width="800"');
    expect(post.html).toContain('height="600"');
  });
});

describe("RSS markdown rendering", () => {
  it("publishes highlighted code without interactive copy controls", async () => {
    const { root } = contentFixture({
      first: "```js\nconst rssValue = 1;\n```\n\n```\nplain RSS code\n```",
    });
    const { rss } = buildFeeds(await buildContent(root));
    const body = rss.match(
      /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/
    )?.[1];
    expect(body).toBeDefined();
    expect(body).toMatch(/<pre\b[^>]*class="[^"]*shiki/);
    expect(body).toContain("rssValue");
    expect(body).toContain("plain RSS code");
    expect(body).not.toMatch(
      /<button\b|code-copy-button|copy-icon|copied-icon|role="status"/
    );
  }, 30_000);

  it("includes the complete calendar as escaped, chronological static events", async () => {
    const { postsDir } = contentFixture({ first: "Calendar article" });
    const source = await readPostSource(path.join(postsDir, "first.md"));
    source.data.weekendCalendar = {
      summary: "Weekend <notes>",
      events: [
        { date: "2026-04-05", text: "Later & second" },
        { date: "2026-03-07", text: "Earlier <first>" },
      ],
    };
    const { rss } = buildFeeds({
      posts: [await renderPost(source)],
      pages: {},
    });
    expect(rss).toContain("Weekend &lt;notes&gt;");
    expect(rss).toContain("共 2 项");
    expect(rss).toContain("Later &amp; second");
    expect(rss.indexOf("Earlier &lt;first&gt;")).toBeLessThan(
      rss.indexOf("Later &amp; second")
    );
    expect(rss).toContain('<time datetime="2026-03-07">2026-03-07</time>');
  });
});

describe("shared calendar validation", () => {
  it("trims calendar text and accepts real leap dates", () => {
    expect(
      parseWeekendCalendar({
        summary: " Summary ",
        events: [{ date: "2024-02-29", text: " Event " }],
      })
    ).toEqual({
      summary: "Summary",
      events: [{ date: "2024-02-29", text: "Event" }],
    });
  });

  it.each([
    null,
    [],
    {},
    false,
    { summary: " ", events: [] },
    { summary: "Calendar", events: [] },
    { summary: "Calendar", events: [{ date: "2025-02-29", text: "Event" }] },
    { summary: "Calendar", events: [{ date: "2024-13-01", text: "Event" }] },
    { summary: "Calendar", events: [{ date: "2024-01-01", text: " " }] },
    { summary: "Calendar", events: [null] },
  ])("rejects malformed calendar %j", input => {
    expect(() => parseWeekendCalendar(input)).toThrow(TypeError);
  });

  it("rejects a present invalid calendar during markdown rendering", async () => {
    const { postsDir } = contentFixture({ first: "Body" });
    const file = path.join(postsDir, "first.md");
    fs.writeFileSync(
      file,
      "---\npubDatetime: 2025-01-01\nweekendCalendar: false\n---\nBody"
    );
    await expect(parsePost(file)).rejects.toThrow(
      'Invalid weekendCalendar in post "first"'
    );
  });
});

describe("build-only image optimization", () => {
  it("shares oriented compact WebP assets between article chunks and RSS without changing originals", async () => {
    const { root, postsDir } = contentFixture({
      first: "![Photo](./photo.JPG)",
    });
    const source = path.join(postsDir, "photo.JPG");
    const original = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: "#789abc" },
    })
      .withMetadata({ orientation: 6 })
      .jpeg({ quality: 100 })
      .toBuffer();
    fs.writeFileSync(source, original);
    const image = await prepareImage(source);
    expect(image.width).toBe(960);
    expect(image.height).toBe(1920);
    expect(image.data.length).toBeLessThan(original.length / 2);
    expect((await sharp(image.data).metadata()).format).toBe("webp");
    const content = await buildContent(root);
    const { post, rssHtml } = content.posts[0];
    expect([...content.assets.keys()]).toEqual([image.fileName]);
    expect(content.assets.get(image.fileName)?.data).toEqual(image.data);
    expect(post.html).toContain(`src="/${image.fileName}"`);
    expect(rssHtml).toContain(
      `src="https://blog.flurry.top/${image.fileName}"`
    );
    expect(fs.readFileSync(source)).toEqual(original);
  });

  it("preserves SVG/GIF bytes, MIME types and placeholder-like article text", async () => {
    const { root, postsDir } = contentFixture({
      first:
        "`__POST_IMAGE_0__`\n\n![Vector](./diagram.svg#detail)\n\n![motion](./motion.gif)\n\n![remote](https://example.org/photo.jpg)",
    });
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path id="detail" d="M0 0L10 10"/></svg>';
    const gif = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );
    fs.writeFileSync(path.join(postsDir, "diagram.svg"), svg);
    fs.writeFileSync(path.join(postsDir, "motion.gif"), gif);
    const content = await buildContent(root);
    const vector = [...content.assets.values()].find(
      asset => asset.mime === "image/svg+xml"
    )!;
    const animation = [...content.assets.values()].find(
      asset => asset.mime === "image/gif"
    )!;
    expect(vector.data.toString()).toBe(svg);
    expect(animation.data).toEqual(gif);
    const { post, rssHtml } = content.posts[0];
    expect(post.html).toContain("__POST_IMAGE_0__");
    expect(post.html).toContain(`src="/${vector.fileName}#detail"`);
    expect(rssHtml).toContain(
      `src="https://blog.flurry.top/${vector.fileName}#detail"`
    );
    expect(post.html).toContain('src="https://example.org/photo.jpg"');
    expect(content.assets.size).toBe(2);
  });
});
