import pangu from "pangu/shared";

const numberFormatter = new Intl.NumberFormat("zh-CN");

/** Space generated labels without rewriting Markdown, code or the DOM. */
export function formatText(text: string) {
  return pangu.spaceText(text);
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatReadingInfo(wordCount: number, readingMinutes: number) {
  return formatText(
    `${formatNumber(wordCount)}字 · 约${formatNumber(readingMinutes)}分钟阅读`
  );
}
