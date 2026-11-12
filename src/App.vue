<script setup lang="ts">
import { useHead } from "@unhead/vue";
import { useRoute } from "vue-router";

import BackToTop from "./components/BackToTop.vue";
import SiteFooter from "./components/SiteFooter.vue";
import SiteHeader from "./components/SiteHeader.vue";
import { SITE } from "./config";
import { provideTheme } from "./composables/useTheme";

provideTheme();
const route = useRoute();

// One head owner supplies both prerendered metadata and SPA navigation updates.
useHead(() => {
  const post = route.name === "post" ? route.meta.post : undefined;
  const title =
    route.name === "post"
      ? (post?.title ??
        (route.meta.postLoadFailed ? "文章加载失败" : "文章不存在"))
      : route.name === "tag"
        ? `标签：${String(route.params.tag)}`
        : route.meta.title;
  const description =
    post?.description ||
    post?.excerpt ||
    route.meta.description ||
    SITE.description;
  const pathname = post
    ? `/posts/${encodeURIComponent(post.slug)}`
    : route.path.replace(/\/$/, "") || "/";
  const url = new URL(pathname, SITE.url).href;
  const image = new URL(SITE.ogImage, SITE.url).href;
  const noindex =
    route.name === "not-found" || (route.name === "post" && !post);
  return {
    title: title ? `${title} | ${SITE.title}` : SITE.title,
    htmlAttrs: { lang: SITE.lang },
    meta: [
      { name: "description", content: description },
      { name: "author", content: SITE.author },
      { property: "og:type", content: post ? "article" : "website" },
      { property: "og:site_name", content: SITE.title },
      { property: "og:title", content: title || SITE.title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      ...(post
        ? [{ property: "article:published_time", content: post.pubDatetime }]
        : []),
      ...(noindex ? [{ name: "robots", content: "noindex" }] : []),
    ],
    link: [{ rel: "canonical", href: url }],
  };
});
</script>

<template>
  <div
    :data-page-path="route.path.replace(/\/$/, '') || '/'"
    class="bg-background text-foreground flex min-h-screen flex-col"
  >
    <SiteHeader />
    <!-- One bottom anchor for page actions; no empty slot on pages without a TOC. -->
    <div id="floating-actions" class="floating-actions">
      <BackToTop />
    </div>
    <main class="mx-auto w-full max-w-3xl flex-1 px-5 pt-10 pb-16 sm:px-6">
      <RouterView />
    </main>
    <SiteFooter />
  </div>
</template>
