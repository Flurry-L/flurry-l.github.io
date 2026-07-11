import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../site';
import { getExcerpt, sortPosts } from '../utils/posts';

export async function GET(context: { site?: URL }) {
  const posts = sortPosts(await getCollection('posts', ({ data }) => !data.draft));
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: getExcerpt(post),
      link: `/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: '<language>zh-CN</language>',
  });
}
