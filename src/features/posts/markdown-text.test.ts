import { describe, expect, it } from 'vitest';
import { markdownToPlainText } from './markdown-text';

describe('markdownToPlainText', () => {
  it('keeps authored text while removing presentation syntax', () => {
    const markdown = [
      '## Heading',
      '',
      'Read **strong** text, `inlineCode`, and [a link](https://example.com/a_(b)).',
      '',
      '- first item',
      '- second item',
    ].join('\n');

    expect(markdownToPlainText(markdown)).toBe(
      'Heading Read strong text, inlineCode, and a link. first item second item',
    );
  });

  it('excludes images, block code, HTML, and formulas', () => {
    const markdown = [
      'Before $x^2$ after.',
      '',
      '![diagram](diagram.png)',
      '',
      '```ts',
      'const hidden = true;',
      '```',
      '',
      '<aside>hidden HTML</aside>',
    ].join('\n');

    expect(markdownToPlainText(markdown)).toBe('Before after.');
  });
});
