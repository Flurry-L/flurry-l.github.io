import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { weekendCalendarSchema } from './features/weekend-calendar/schema';

const tag = z.string()
  .trim()
  .min(1, 'Tags cannot be empty')
  .refine((value) => !/[/?#]/.test(value), 'Tags cannot contain /, ? or #');

const tags = z
  .union([tag, z.array(tag), z.null()])
  .optional()
  .default([])
  .transform((value) => {
    const normalized = value === null ? [] : (Array.isArray(value) ? value : [value]);
    return [...new Set(normalized)];
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
    math: z.boolean().optional().default(false),
    tags,
    draft: z.boolean().optional().default(false),
    weekendCalendar: weekendCalendarSchema.optional(),
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
