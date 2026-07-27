import { createRouter, createWebHistory } from "vue-router";

import { SITE } from "../config";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
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
  ],
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0 };
  },
});

// Routes with dynamic titles (post detail, tag detail) set document.title
// themselves; the rest use their static meta title.
router.afterEach(to => {
  if (typeof to.meta.title === "string") {
    document.title = to.meta.title
      ? `${to.meta.title} | ${SITE.title}`
      : SITE.title;
  }
});
