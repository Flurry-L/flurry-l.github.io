<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { useRoute } from "vue-router";

import GiscusComments from "../components/GiscusComments.vue";
import MarkdownContent from "../components/MarkdownContent.vue";
import PostOutline from "../components/PostOutline.vue";
import TagPill from "../components/TagPill.vue";
import { formatReadingInfo } from "../lib/format";
import { getAdjacentPosts } from "../lib/posts";

const ActivityCalendar = defineAsyncComponent(
  () => import("../features/activity-calendar/ActivityCalendar.vue")
);

const route = useRoute();
const slug = computed(() => String(route.params.slug));
const post = computed(() => route.meta.post);
const adjacent = computed(() => getAdjacentPosts(slug.value));
</script>

<template>
  <template v-if="post">
    <div class="relative mx-auto max-w-3xl">
      <article class="min-w-0" data-pagefind-body>
        <header class="border-border border-b pb-6">
          <h1 data-pagefind-meta="title" class="text-3xl font-bold">
            {{ post.title }}
          </h1>
          <div
            data-pagefind-ignore="all"
            class="text-muted-foreground mt-4 flex flex-wrap items-center gap-3 text-sm tabular-nums"
          >
            <time :datetime="post.pubDatetime">{{ post.dateLabel }}</time>
            <span>{{
              formatReadingInfo(post.wordCount, post.readingMinutes)
            }}</span>
            <div v-if="post.tags.length > 0" class="flex flex-wrap gap-1.5">
              <TagPill v-for="tag in post.tags" :key="tag" :tag="tag" />
            </div>
          </div>
        </header>

        <MarkdownContent data-post-content class="mt-8" :html="post.html" />

        <ActivityCalendar
          v-if="post.activityCalendar"
          :key="post.slug"
          :events="post.activityCalendar.events"
        />

        <nav
          data-pagefind-ignore="all"
          class="border-border mt-8 grid gap-4 border-t pt-8 sm:grid-cols-2"
          aria-label="上一篇 / 下一篇"
        >
          <RouterLink
            v-if="adjacent.older"
            :to="{ name: 'post', params: { slug: adjacent.older.slug } }"
            class="border-border hover:border-accent rounded-md border p-4 transition-colors"
          >
            <span class="text-muted-foreground text-xs">上一篇</span>
            <span class="hover:text-accent mt-1 block font-medium">{{
              adjacent.older.title
            }}</span>
          </RouterLink>
          <span v-else />
          <RouterLink
            v-if="adjacent.newer"
            :to="{ name: 'post', params: { slug: adjacent.newer.slug } }"
            class="border-border hover:border-accent rounded-md border p-4 text-right transition-colors"
          >
            <span class="text-muted-foreground text-xs">下一篇</span>
            <span class="hover:text-accent mt-1 block font-medium">{{
              adjacent.newer.title
            }}</span>
          </RouterLink>
        </nav>

        <GiscusComments
          :term="`posts/${post.slug}`"
          data-pagefind-ignore="all"
        />
      </article>

      <PostOutline
        v-if="post.toc.length > 0"
        :key="post.slug"
        :items="post.toc"
      />
    </div>
  </template>

  <div v-else class="py-16 text-center">
    <h1 class="text-4xl font-bold">404</h1>
    <p class="text-muted-foreground mt-3">这篇文章不存在。</p>
    <RouterLink to="/" class="text-accent mt-6 inline-block hover:underline">
      返回首页
    </RouterLink>
  </div>
</template>
