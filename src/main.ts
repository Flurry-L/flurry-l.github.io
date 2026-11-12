import { ViteSSG } from "vite-ssg";
import "katex/dist/katex.min.css";

import App from "./App.vue";
import { routes, scrollBehavior } from "./router";
import { getPostBySlug, getSortedPosts, getUniqueTags } from "./lib/posts";
import "./styles/main.css";

// Static hosts may serve 404.html for an unknown URL. Hydrate only matching
// prerendered markup; otherwise mount the correct client route from scratch.
const hydration =
  !import.meta.env.SSR &&
  import.meta.env.PROD &&
  document.querySelector<HTMLElement>("#app > [data-page-path]")?.dataset
    .pagePath === (window.location.pathname.replace(/\/$/, "") || "/");

// Resolve article chunks before either SSR or hydration renders the route.
// Bodies stay in their own lazy chunks rather than being duplicated in initialState.
export const createApp = ViteSSG(
  App,
  { routes, scrollBehavior },
  ({ router }) => {
    router.beforeResolve(async to => {
      if (to.name === "post") {
        try {
          to.meta.post = await getPostBySlug(String(to.params.slug));
          to.meta.postLoadFailed = false;
        } catch (error) {
          if (import.meta.env.SSR) throw error;
          console.error("文章加载失败", error);
          to.meta.post = undefined;
          to.meta.postLoadFailed = true;
        }
      }
    });
  },
  { hydration }
);

export function includedRoutes() {
  const posts = getSortedPosts();
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
