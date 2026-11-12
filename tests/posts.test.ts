import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import { parseWeekendCalendar } from "../shared/weekend-calendar.mjs";
import {
  generatePostModule,
  generatePostsMetaModule,
} from "../vite/plugins/content";
import { optimizeImage, publishImage } from "../vite/plugins/images.mjs";
import {
  extractToc,
  getMarkdown,
  parsePost,
  parsePostMeta,
  readingStats,
} from "../vite/plugins/markdown.mjs";
import type { Post } from "../src/types/post";

import { formatDate, getYear, groupPostsByYear } from "../src/lib/format";
import {
  collectTags,
  filterByTag,
  filterPublished,
  isScheduled,
  sortPosts,
  type PostMeta,
} from "../src/lib/post-utils";

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

describe("sortPosts", () => {
  it("sorts by publication time, newest first, without mutating input", () => {
    const posts = [
      makePost({ slug: "old", pubDatetime: "2024-01-01T00:00:00.000Z" }),
      makePost({ slug: "new", pubDatetime: "2026-01-01T00:00:00.000Z" }),
      makePost({ slug: "mid", pubDatetime: "2025-01-01T00:00:00.000Z" }),
    ];

    const sorted = sortPosts(posts);

    expect(sorted.map(post => post.slug)).toEqual(["new", "mid", "old"]);
    expect(posts.map(post => post.slug)).toEqual(["old", "new", "mid"]);
  });
});

describe("scheduled posts", () => {
  it("keeps posts published within the margin window", () => {
    const withinMargin = makePost({
      slug: "soon",
      pubDatetime: new Date(NOW + MARGIN).toISOString(),
    });

    expect(isScheduled(withinMargin, NOW, MARGIN)).toBe(false);
    expect(filterPublished([withinMargin], NOW, MARGIN)).toHaveLength(1);
  });

  it("filters out posts published further than the margin in the future", () => {
    const future = makePost({
      slug: "future",
      pubDatetime: new Date(NOW + MARGIN + 1).toISOString(),
    });
    const past = makePost({ slug: "past" });

    expect(isScheduled(future, NOW, MARGIN)).toBe(true);
    expect(
      filterPublished([future, past], NOW, MARGIN).map(post => post.slug)
    ).toEqual(["past"]);
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

function contentFixture(posts: Record<string, string>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "flurry-content-"));
  fixtureRoots.push(root);
  const postsDir = path.join(root, "src/content/posts");
  fs.mkdirSync(postsDir, { recursive: true });
  for (const [slug, body] of Object.entries(posts)) {
    fs.writeFileSync(
      path.join(postsDir, `${slug}.md`),
      `---\ntitle: ${slug}\npubDatetime: 2025-01-01\ntags: [test]\n---\n${body}`
    );
  }
  return { root, postsDir };
}

function evaluatePostModule(source: string): Post {
  return new Function(source.replace("export default", "return"))();
}

describe("lazy content modules", () => {
  it("exports only list metadata without resolving article images", async () => {
    const { root } = contentFixture({
      first:
        "Visible excerpt\n<!-- excerpt -->\n## Private heading\nBody only\n![Photo](./missing.jpg)",
      second: "No explicit excerpt",
    });
    const module = await generatePostsMetaModule(root);
    const posts: PostMeta[] = new Function(
      module.replace("export const posts =", "return")
    )();
    expect(posts.map(post => Object.keys(post).sort())).toEqual([
      ["description", "excerpt", "pubDatetime", "slug", "tags", "title"],
      ["description", "excerpt", "pubDatetime", "slug", "tags", "title"],
    ]);
    expect(posts[0].excerpt).toBe("Visible excerpt");
    expect(posts[1].excerpt).toBe("");
    expect(JSON.stringify(posts)).not.toMatch(
      /Private heading|Body only|missing\.jpg/
    );
  });

  it("renders one article independently of another article's missing assets", async () => {
    const { root } = contentFixture({
      first: "## First\nHello 世界",
      second: "![Photo](./missing.jpg)",
    });
    const post = evaluatePostModule(await generatePostModule(root, "first"));
    expect(post.slug).toBe("first");
    expect(post.toc).toEqual([{ depth: 2, id: "first", text: "First" }]);
    expect(post.html).toContain("Hello 世界");
    expect(post.wordCount).toBe(4);
    await expect(generatePostModule(root, "../first")).rejects.toThrow(
      "Unknown post"
    );
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
  it("publishes highlighted code without interactive copy controls", () => {
    const { root } = contentFixture({
      first: "```js\nconst rssValue = 1;\n```\n\n```\nplain RSS code\n```",
    });
    fs.mkdirSync(path.join(root, "dist"));
    execFileSync(
      process.execPath,
      [fileURLToPath(new URL("../scripts/generate-rss.mjs", import.meta.url))],
      { cwd: root, stdio: "pipe" }
    );
    const rss = fs.readFileSync(path.join(root, "dist/rss.xml"), "utf8");
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
    const image = await optimizeImage(source);
    expect(image.width).toBe(960);
    expect(image.height).toBe(1920);
    expect(image.data.length).toBeLessThan(original.length / 2);
    expect((await sharp(image.data).metadata()).format).toBe("webp");
    const emitted: string[] = [];
    const post = evaluatePostModule(
      await generatePostModule(root, "first", asset => {
        emitted.push(asset.fileName);
        return JSON.stringify(`/${asset.fileName}`);
      })
    );
    expect(emitted).toEqual([image.fileName]);
    expect(post.html).toContain(`src="/${image.fileName}"`);
    const published = await publishImage(
      "./photo.JPG",
      path.join(postsDir, "first.md"),
      root,
      path.join(root, "dist"),
      "https://example.com/"
    );
    expect(published).toEqual({
      src: `https://example.com/${image.fileName}`,
      width: 960,
      height: 1920,
    });
    expect(fs.readFileSync(path.join(root, "dist", image.fileName))).toEqual(
      image.data
    );
    expect(fs.readFileSync(source)).toEqual(original);
  });

  it("leaves remote images alone and preserves SVG bytes", async () => {
    const { root, postsDir } = contentFixture({
      first: "![Vector](./diagram.svg)",
    });
    const file = path.join(postsDir, "first.md");
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>';
    fs.writeFileSync(path.join(postsDir, "diagram.svg"), svg);
    expect(
      await publishImage(
        "https://example.org/photo.jpg",
        file,
        root,
        path.join(root, "dist"),
        "https://example.com/"
      )
    ).toBe("https://example.org/photo.jpg");
    const url = await publishImage(
      "./diagram.svg",
      file,
      root,
      path.join(root, "dist"),
      "https://example.com/"
    );
    expect(typeof url).toBe("string");
    expect(
      fs.readFileSync(
        path.join(root, "dist", new URL(url as string).pathname),
        "utf8"
      )
    ).toBe(svg);
  });
});
