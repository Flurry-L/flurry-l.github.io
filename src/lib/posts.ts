import { posts } from "virtual:posts-meta";
import { postLoaders } from "virtual:post-loaders";

import type { Post, PostMeta } from "../types/post";

export type { Post, PostMeta, TocItem } from "../types/post";

export interface TagCount {
  tag: string;
  count: number;
}

export interface YearGroup {
  year: number;
  posts: PostMeta[];
}

export { posts };

/**
 * The build owns publication and ordering. Only published lazy loaders exist.
 * The router awaits the selected body before SSR and hydration.
 */
export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  return (await postLoaders.get(slug)?.())?.default;
}

export function getUniqueTags(items: PostMeta[] = posts): TagCount[] {
  const counts = new Map<string, number>();
  for (const post of items) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, "zh-CN"));
}

export function getPostsByTag(tag: string): PostMeta[] {
  return posts.filter(post => post.tags.includes(tag));
}

export function groupPostsByYear(items: PostMeta[] = posts): YearGroup[] {
  const groups = new Map<number, PostMeta[]>();
  for (const post of items) {
    const list = groups.get(post.year) ?? [];
    list.push(post);
    groups.set(post.year, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, posts]) => ({ year, posts }));
}

/** Adjacent posts for prev/next navigation, based on the sorted list. */
export function getAdjacentPosts(slug: string): {
  newer: PostMeta | undefined;
  older: PostMeta | undefined;
} {
  const index = posts.findIndex(post => post.slug === slug);
  return {
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index >= 0 ? posts[index + 1] : undefined,
  };
}
