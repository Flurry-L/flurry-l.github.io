import { posts as rawPosts } from "virtual:posts";

import { POSTS } from "../config";
import {
  collectTags,
  filterByTag,
  filterPublished,
  sortPosts,
  type Post,
  type TagCount,
} from "./post-utils";

export type { Post, TagCount, TocItem } from "./post-utils";

export function getSortedPosts(now: number = Date.now()): Post[] {
  return sortPosts(filterPublished(rawPosts, now, POSTS.scheduledPostMargin));
}

export function getPostBySlug(slug: string, now?: number): Post | undefined {
  return getSortedPosts(now).find(post => post.slug === slug);
}

export function getUniqueTags(posts: Post[] = getSortedPosts()): TagCount[] {
  return collectTags(posts);
}

export function getPostsByTag(tag: string, now?: number): Post[] {
  return filterByTag(getSortedPosts(now), tag);
}

/** Adjacent posts for prev/next navigation, based on the sorted list. */
export function getAdjacentPosts(
  slug: string,
  now?: number
): { newer: Post | undefined; older: Post | undefined } {
  const sorted = getSortedPosts(now);
  const index = sorted.findIndex(post => post.slug === slug);
  return {
    newer: index > 0 ? sorted[index - 1] : undefined,
    older: index >= 0 ? sorted[index + 1] : undefined,
  };
}
