import { z } from 'astro/zod';
import { CALENDAR_DATE_PATTERN, isCalendarDate } from './date';

export const calendarDateSchema = z
  .string()
  .regex(CALENDAR_DATE_PATTERN, 'Date must use YYYY-MM-DD')
  .refine(isCalendarDate, 'Invalid calendar date');

export const weekendCalendarEventSchema = z.object({
  date: calendarDateSchema,
  text: z.string().trim().min(1, 'Calendar event text cannot be empty'),
});

export const weekendCalendarSchema = z.object({
  summary: z.string().trim().min(1, 'Calendar summary cannot be empty'),
  events: z.array(weekendCalendarEventSchema).min(1, 'Calendar must contain an event'),
});

export type WeekendCalendarEvent = z.infer<typeof weekendCalendarEventSchema>;
export type WeekendCalendarInput = z.infer<typeof weekendCalendarSchema>;
