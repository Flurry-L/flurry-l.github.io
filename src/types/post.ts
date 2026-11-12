import type { WeekendCalendarInput } from "../../shared/weekend-calendar";

export interface TocItem {
  depth: number;
  id: string;
  text: string;
}
export interface PostMeta {
  slug: string;
  title: string;
  pubDatetime: string;
  description: string;
  tags: string[];
  excerpt: string;
}
export interface Post extends PostMeta {
  html: string;
  toc: TocItem[];
  weekendCalendar: WeekendCalendarInput | null;
  wordCount: number;
  readingMinutes: number;
}
