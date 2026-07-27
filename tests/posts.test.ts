import { describe, expect, it } from "vitest";

import { formatDate, getYear, groupPostsByYear } from "../src/lib/format";
import {
  collectTags,
  filterByTag,
  filterPublished,
  isScheduled,
  sortPosts,
  type Post,
} from "../src/lib/post-utils";

function makePost(overrides: Partial<Post> & { slug: string }): Post {
  return {
    title: overrides.slug,
    pubDatetime: "2025-01-01T00:00:00.000Z",
    description: "",
    tags: [],
    excerpt: "",
    html: "",
    toc: [],
    weekendCalendar: null,
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
