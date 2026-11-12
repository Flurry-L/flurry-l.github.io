import type { RouterOptions, RouteRecordRaw } from "vue-router";
import { pages } from "virtual:pages";
import type { Post } from "../types/post";

declare module "vue-router" {
  interface RouteMeta {
    post?: Post;
    title?: string;
    description?: string;
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/HomeView.vue"),
    meta: { title: "" },
  },
  {
    path: "/posts/:slug",
    name: "post",
    component: () => import("../views/PostDetailView.vue"),
  },
  {
    path: "/tags",
    name: "tags",
    component: () => import("../views/TagsView.vue"),
    meta: { title: "标签" },
  },
  {
    path: "/tags/:tag",
    name: "tag",
    component: () => import("../views/TagPostsView.vue"),
  },
  {
    path: "/archives",
    name: "archives",
    component: () => import("../views/ArchivesView.vue"),
    meta: { title: "归档" },
  },
  {
    path: "/about",
    name: "about",
    component: () => import("../views/AboutView.vue"),
    meta: { title: pages.about.title, description: pages.about.description },
  },
  {
    path: "/links",
    name: "links",
    component: () => import("../views/LinksView.vue"),
    meta: { title: "友情链接" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("../views/NotFoundView.vue"),
    meta: { title: "页面不存在" },
  },
];

export const scrollBehavior: RouterOptions["scrollBehavior"] = (
  to,
  _from,
  savedPosition
) => {
  if (savedPosition) return savedPosition;
  if (to.hash) {
    const heading = document.getElementById(to.hash.slice(1));
    if (!heading) return;
    return {
      el: heading,
      top: 88,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    };
  }
  return { top: 0 };
};
