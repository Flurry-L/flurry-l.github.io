import { posts } from "virtual:posts-meta";
import { postLoaders } from "virtual:post-loaders";

import {
  collectTags,
  filterByTag,
  type PostMeta,
  type TagCount,
} from "./post-utils";

import type { Post } from "../types/post";

export type { Post, PostMeta, TocItem } from "../types/post";
export type { TagCount } from "./post-utils";

export { posts };

/**
 * The build owns publication and ordering. Only published lazy loaders exist.
 * The router awaits the selected body before SSR and hydration.
 */
export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const load = Object.hasOwn(postLoaders, slug) ? postLoaders[slug] : undefined;
  return load ? (await load()).default : undefined;
}

export function getUniqueTags(items: PostMeta[] = posts): TagCount[] {
  return collectTags(items);
}

export function getPostsByTag(tag: string): PostMeta[] {
  return filterByTag(posts, tag);
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
