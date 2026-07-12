import { getCollection } from 'astro:content';
import { sortPosts } from '../utils/posts';

export async function getPublishedPosts() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return sortPosts(posts);
}
