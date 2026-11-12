export interface WeekendCalendarEvent {
  date: string;
  text: string;
}

export interface WeekendCalendarInput {
  summary: string;
  events: WeekendCalendarEvent[];
}

export interface TocItem {
  depth: number;
  id: string;
  text: string;
}
export interface PostMeta {
  slug: string;
  title: string;
  pubDatetime: string;
  dateLabel: string;
  archiveDate: string;
  year: number;
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
