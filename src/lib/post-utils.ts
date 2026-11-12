import type { PostMeta } from "../types/post";

export type { PostMeta } from "../types/post";

export interface TagCount {
  tag: string;
  count: number;
}

export function collectTags(posts: PostMeta[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, "zh-CN"));
}

export function filterByTag(posts: PostMeta[], tag: string): PostMeta[] {
  return posts.filter(post => post.tags.includes(tag));
}
