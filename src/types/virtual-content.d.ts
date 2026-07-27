declare module "virtual:posts" {
  export interface TocItem {
    depth: number;
    id: string;
    text: string;
  }

  export interface RawPost {
    slug: string;
    title: string;
    pubDatetime: string;
    description: string;
    tags: string[];
    excerpt: string;
    html: string;
    toc: TocItem[];
    weekendCalendar: {
      summary: string;
      events: { date: string; text: string }[];
    } | null;
  }

  export const posts: RawPost[];
}

declare module "virtual:pages" {
  export interface Page {
    title: string;
    description: string;
    html: string;
  }

  export const pages: Record<string, Page>;
}
