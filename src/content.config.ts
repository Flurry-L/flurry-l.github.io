import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const tags = z
  .union([z.string(), z.array(z.string()), z.null()])
  .optional()
  .default([])
  .transform((value) => value === null ? [] : (Array.isArray(value) ? value : [value]));

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}, 'Invalid calendar date');

const weekendCalendar = z.object({
  summary: z.string(),
  events: z.array(z.object({
    date: calendarDate,
    text: z.string(),
  })).min(1),
});

const posts = defineCollection({
  loader: glob({
    base: './src/content/posts',
    pattern: '*.md',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    description: z.string().optional(),
    tags,
    draft: z.boolean().optional().default(false),
    weekendCalendar: weekendCalendar.optional(),
  }),
});

const pages = defineCollection({
  loader: glob({
    base: './src/content/pages',
    pattern: 'about/index.md',
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
  }),
});

export const collections = { posts, pages };
