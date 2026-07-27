import { SITE } from "../config";
import type { Post } from "./post-utils";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: SITE.timezone,
  year: "numeric",
  month: "long",
  day: "numeric",
});

const yearFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SITE.timezone,
  year: "numeric",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function getYear(iso: string): number {
  return Number(yearFormatter.format(new Date(iso)));
}

export interface YearGroup {
  year: number;
  posts: Post[];
}

/** Group posts (assumed sorted newest-first) by publication year, descending. */
export function groupPostsByYear(posts: Post[]): YearGroup[] {
  const groups = new Map<number, Post[]>();
  for (const post of posts) {
    const year = getYear(post.pubDatetime);
    const list = groups.get(year) ?? [];
    list.push(post);
    groups.set(year, list);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, groupPosts]) => ({ year, posts: groupPosts }));
}
