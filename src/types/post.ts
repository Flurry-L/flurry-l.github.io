export interface ActivityCalendarEvent {
  date: string;
  text: string;
}

export interface ActivityCalendarInput {
  events: ActivityCalendarEvent[];
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
  activityCalendar: ActivityCalendarInput | null;
  wordCount: number;
  readingMinutes: number;
}
