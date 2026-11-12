import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import type { Post, PostMeta, TocItem } from "../../src/types/post";

export interface ResolvedImage {
  src: string;
  width?: number;
  height?: number;
}

export interface RenderOptions {
  /** Include static copy controls; disable for non-interactive RSS content. */
  codeControls?: boolean;
  resolveImage?: (
    src: string
  ) => string | ResolvedImage | Promise<string | ResolvedImage>;
}

export interface ParsedPage {
  title: string;
  description: string;
  html: string;
}

export function getMarkdown(): Promise<MarkdownIt>;
export function slugify(text: string): string;
export function extractToc(tokens: Token[]): TocItem[];
export function readingStats(tokens: Token[]): {
  wordCount: number;
  readingMinutes: number;
};
export function parsePostMeta(filePath: string): Promise<PostMeta>;
export function parsePost(
  filePath: string,
  options?: RenderOptions
): Promise<Post>;
export function parsePage(filePath: string): Promise<ParsedPage>;
