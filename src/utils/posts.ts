import type { CollectionEntry } from 'astro:content';
import { markdownToPlainText } from '../features/posts/markdown-text';
import { SITE } from '../site';

export type Post = CollectionEntry<'posts'>;

const dateFormatter = new Intl.DateTimeFormat(SITE.locale, {
  timeZone: SITE.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const monthDayFormatter = new Intl.DateTimeFormat(SITE.locale, {
  timeZone: SITE.timeZone,
  month: '2-digit',
  day: '2-digit',
});

const yearFormatter = new Intl.DateTimeFormat(SITE.locale, {
  timeZone: SITE.timeZone,
  year: 'numeric',
});

export function sortPosts(posts: Post[]) {
  return [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function formatDate(date: Date) {
  return dateFormatter.format(date);
}

export function formatMonthDay(date: Date) {
  return monthDayFormatter.format(date);
}

export function formatYear(date: Date) {
  return yearFormatter.formatToParts(date).find(({ type }) => type === 'year')?.value
    ?? String(date.getUTCFullYear());
}

export function getExcerpt(post: Post, limit = 150) {
  if (post.data.description) return post.data.description;

  const intro = (post.body ?? '').split('<!-- excerpt -->')[0];
  const plain = markdownToPlainText(intro);

  return plain.length > limit ? `${plain.slice(0, limit).trim()}...` : plain;
}

export function getReadingTime(post: Post) {
  const calendar = post.data.weekendCalendar;
  const calendarText = calendar
    ? `${calendar.summary} ${calendar.events.map((event) => `${event.date} ${event.text}`).join(' ')}`
    : '';
  const body = `${post.body ?? ''} ${calendarText}`;
  const chinese = body.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latin = body
    .replace(/[\u3400-\u9fff]/g, ' ')
    .match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  return Math.max(1, Math.ceil((chinese + latin * 2) / 420));
}

export function getTagCounts(posts: Post[]) {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
