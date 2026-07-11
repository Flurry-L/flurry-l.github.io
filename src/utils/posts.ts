import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export function sortPosts(posts: Post[]) {
  return [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatMonthDay(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getExcerpt(post: Post, limit = 150) {
  if (post.data.description) return post.data.description;

  const intro = (post.body ?? '').split('<!-- excerpt -->')[0];
  const plain = intro
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$]+\$/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~$\\{}\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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
