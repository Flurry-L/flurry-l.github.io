import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import vue from '@astrojs/vue';
import pagefind from 'astro-pagefind';
import expressiveCode, { pluginFramesTexts } from 'astro-expressive-code';
import { defineConfig } from 'astro/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { SITE } from './src/site';

pluginFramesTexts.addLocale('zh', {
  terminalWindowFallbackTitle: '\u7ec8\u7aef\u7a97\u53e3',
  copyButtonTooltip: '\u590d\u5236\u5230\u526a\u8d34\u677f',
  copyButtonCopied: '\u5df2\u590d\u5236',
});

export default defineConfig({
  site: SITE.url,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    expressiveCode({
      // Astro 7 does not reliably serve Expressive Code's virtual CSS asset in dev.
      emitExternalStylesheet: false,
      themes: ['vitesse-light', 'vitesse-dark'],
      minSyntaxHighlightingColorContrast: 4.5,
      defaultLocale: 'zh-CN',
      useDarkModeMediaQuery: false,
      themeCssSelector: (theme) =>
        theme.type === 'dark' ? "[data-theme='dark']" : "[data-theme='light']",
      styleOverrides: {
        codeBackground: ['#151a21', '#f6f9fb'],
        borderRadius: '5px',
        borderWidth: '1px',
        borderColor: 'var(--code-border)',
        codeFontFamily: 'var(--font-code)',
        codeFontSize: '14px',
        codeFontWeight: '400',
        codeLineHeight: '1.65',
        codePaddingBlock: '14px',
        codePaddingInline: 'clamp(14px, 3vw, 18px)',
        uiFontFamily: 'var(--font-ui)',
        frames: {
          frameBoxShadowCssValue: 'none',
        },
      },
    }),
    vue(),
    sitemap(),
    pagefind(),
  ],
  image: {
    layout: 'constrained',
    breakpoints: [480, 960, 1440],
    responsiveStyles: true,
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: false, throwOnError: false }]],
    }),
  },
});
