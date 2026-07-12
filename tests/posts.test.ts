import { describe, expect, it } from 'vitest';

import {
  getExcerpt,
  getReadingTime,
  getTagCounts,
  formatMonthDay,
  formatYear,
  sortPosts,
  type Post,
} from '../src/utils/posts';

interface PostOverrides {
  body?: string;
  description?: string;
  tags?: string[];
}

function createPost(id: string, date: string, overrides: PostOverrides = {}): Post {
  return {
    id,
    body: overrides.body ?? '',
    data: {
      title: id,
      date: new Date(date),
      description: overrides.description,
      tags: overrides.tags ?? [],
      draft: false,
    },
  } as unknown as Post;
}

describe('post dates', () => {
  it('formats year and month-day in the configured site time zone', () => {
    const shanghaiNewYear = new Date('2024-12-31T16:30:00.000Z');

    expect(formatYear(shanghaiNewYear)).toBe('2025');
    expect(formatMonthDay(shanghaiNewYear)).toBe('01/01');
  });

  it('sorts newest first without mutating the collection result', () => {
    const older = createPost('older', '2024-01-01T00:00:00.000Z');
    const newer = createPost('newer', '2025-01-01T00:00:00.000Z');
    const posts = [older, newer];

    expect(sortPosts(posts).map(({ id }) => id)).toEqual(['newer', 'older']);
    expect(posts.map(({ id }) => id)).toEqual(['older', 'newer']);
  });
});

describe('derived post data', () => {
  it('prefers an authored description and respects the excerpt boundary', () => {
    const described = createPost('described', '2025-01-01', {
      body: 'ignored body',
      description: 'Authored summary',
    });
    const generated = createPost('generated', '2025-01-01', {
      body: 'Before [a link](https://example.com/a_(b)).<!-- excerpt -->After marker.',
    });

    expect(getExcerpt(described)).toBe('Authored summary');
    expect(getExcerpt(generated)).toBe('Before a link.');
  });

  it('calculates reading time without returning zero', () => {
    const short = createPost('short', '2025-01-01', { body: 'short' });
    const long = createPost('long', '2025-01-01', { body: '中'.repeat(421) });

    expect(getReadingTime(short)).toBe(1);
    expect(getReadingTime(long)).toBe(2);
  });

  it('counts and orders tags without mutating posts', () => {
    const posts = [
      createPost('first', '2025-01-01', { tags: ['life', 'render'] }),
      createPost('second', '2025-01-02', { tags: ['render'] }),
    ];

    expect(getTagCounts(posts)).toEqual([
      { name: 'render', count: 2 },
      { name: 'life', count: 1 },
    ]);
  });
});
