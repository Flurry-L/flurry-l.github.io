export interface TocItemData {
  depth: number;
  id: string;
  text: string;
}

export interface WeekendCalendarEventData {
  date: string;
  text: string;
}

export interface WeekendCalendarData {
  summary: string;
  events: WeekendCalendarEventData[];
}

export interface ParsedPost {
  slug: string;
  title: string;
  pubDatetime: string;
  description: string;
  tags: string[];
  excerpt: string;
  html: string;
  toc: TocItemData[];
  weekendCalendar: WeekendCalendarData | null;
}

export interface ParsedPage {
  title: string;
  description: string;
  html: string;
}

export function getMarkdown(): Promise<unknown>;
export function slugify(text: string): string;
export function stripTags(html: string): string;
export function decodeEntities(text: string): string;
export function extractToc(html: string): TocItemData[];
export function parsePost(
  filePath: string,
  options?: { resolveImage?: (src: string) => string }
): Promise<ParsedPost>;
export function parsePage(filePath: string): Promise<ParsedPage>;
