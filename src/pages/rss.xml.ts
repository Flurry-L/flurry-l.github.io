import rss from '@astrojs/rss';
import { getPublishedPosts } from '../data/posts';
import { SITE } from '../site';
import { getExcerpt } from '../utils/posts';

export async function GET(context: { site?: URL }) {
  const posts = await getPublishedPosts();
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
    customData: `<language>${SITE.locale}</language>`,
  });
}
