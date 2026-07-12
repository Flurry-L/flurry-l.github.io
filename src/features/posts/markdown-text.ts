import type { Nodes } from 'mdast';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import { unified } from 'unified';

const parser = unified().use(remarkParse).use(remarkMath);
const excludedNodes = new Set([
  'code',
  'definition',
  'html',
  'image',
  'imageReference',
  'inlineMath',
  'math',
  'toml',
  'yaml',
]);
const blockNodes = new Set([
  'blockquote',
  'footnoteDefinition',
  'list',
  'listItem',
  'root',
  'table',
  'tableRow',
]);

function collectText(node: Nodes): string {
  if (excludedNodes.has(node.type)) return '';
  if (node.type === 'break') return ' ';
  if ('value' in node && typeof node.value === 'string') return node.value;
  if (!('children' in node)) return '';

  const separator = blockNodes.has(node.type) ? ' ' : '';
  return node.children.map((child) => collectText(child)).join(separator);
}

export function markdownToPlainText(markdown: string) {
  return collectText(parser.parse(markdown))
    .replace(/\s+/g, ' ')
    .trim();
}
