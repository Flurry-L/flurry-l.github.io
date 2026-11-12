import { ViteSSG } from "vite-ssg";
import "katex/dist/katex.min.css";

import App from "./App.vue";
import { routes, scrollBehavior } from "./router";
import { getPostBySlug, posts, getUniqueTags } from "./lib/posts";
import "./styles/main.css";

// Resolve article chunks before either SSR or hydration renders the route.
// Bodies stay in their own lazy chunks rather than being duplicated in initialState.
export const createApp = ViteSSG(
  App,
  { routes, scrollBehavior },
  ({ router }) => {
    router.beforeResolve(async to => {
      if (to.name === "post") {
        to.meta.post = await getPostBySlug(String(to.params.slug));
      }
    });
  },
  { hydration: import.meta.env.PROD }
);

export function includedRoutes() {
  return [
    ...routes
      .filter(route => !route.path.includes(":"))
      .map(route => route.path),
    ...posts.map(post => `/posts/${encodeURIComponent(post.slug)}`),
    ...getUniqueTags(posts).map(
      ({ tag }) => `/tags/${encodeURIComponent(tag)}`
    ),
    "/404",
  ];
}
