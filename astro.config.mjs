import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import vue from '@astrojs/vue';
import { defineConfig } from 'astro/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

export default defineConfig({
  site: 'https://blog.flurry.top',
  output: 'static',
  trailingSlash: 'always',
  integrations: [vue(), sitemap()],
  image: {
    layout: 'constrained',
    breakpoints: [480, 960, 1440],
    responsiveStyles: true,
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light-default',
        dark: 'github-dark-default',
      },
      defaultColor: false,
    },
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: false, throwOnError: false }]],
    }),
  },
});
