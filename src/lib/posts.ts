import { posts as rawPosts } from "virtual:posts-meta";

import { POSTS } from "../config";
import {
  collectTags,
  filterByTag,
  filterPublished,
  sortPosts,
  type PostMeta,
  type TagCount,
} from "./post-utils";

import type { Post } from "../types/post";

export type { Post, PostMeta, TocItem } from "../types/post";
export type { TagCount } from "./post-utils";

export function getSortedPosts(now: number = Date.now()): PostMeta[] {
  return sortPosts(filterPublished(rawPosts, now, POSTS.scheduledPostMargin));
}

/**
 * Lists consume metadata only; this is the sole entry point for lazy bodies.
 * Returns undefined for missing/scheduled posts; chunk/network failures reject.
 * The router awaits this before SSR/hydration and commits only the current navigation.
 */
export async function getPostBySlug(
  slug: string,
  now?: number
): Promise<Post | undefined> {
  if (!getSortedPosts(now).some(post => post.slug === slug)) return undefined;
  const { postLoaders } = await import("virtual:post-loaders");
  const load = Object.hasOwn(postLoaders, slug) ? postLoaders[slug] : undefined;
  return load ? (await load()).default : undefined;
}

export function getUniqueTags(
  posts: PostMeta[] = getSortedPosts()
): TagCount[] {
  return collectTags(posts);
}

export function getPostsByTag(tag: string, now?: number): PostMeta[] {
  return filterByTag(getSortedPosts(now), tag);
}

/** Adjacent posts for prev/next navigation, based on the sorted list. */
export function getAdjacentPosts(
  slug: string,
  now?: number
): { newer: PostMeta | undefined; older: PostMeta | undefined } {
  const sorted = getSortedPosts(now);
  const index = sorted.findIndex(post => post.slug === slug);
  return {
    newer: index > 0 ? sorted[index - 1] : undefined,
    older: index >= 0 ? sorted[index + 1] : undefined,
  };
}
