import type { PostMeta } from "../types/post";

export type { PostMeta } from "../types/post";

/** A post is "scheduled" when its publication time is further than
 * `margin` milliseconds in the future. */
export function isScheduled(
  post: PostMeta,
  now: number,
  margin: number
): boolean {
  return new Date(post.pubDatetime).getTime() > now + margin;
}

export function filterPublished(
  posts: PostMeta[],
  now: number,
  margin: number
): PostMeta[] {
  return posts.filter(post => !isScheduled(post, now, margin));
}

/** Sort by publication time, newest first. */
export function sortPosts(posts: PostMeta[]): PostMeta[] {
  return [...posts].sort(
    (a, b) =>
      new Date(b.pubDatetime).getTime() - new Date(a.pubDatetime).getTime()
  );
}

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
