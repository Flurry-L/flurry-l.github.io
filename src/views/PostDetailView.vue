<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useRoute } from "vue-router";

import FormattedDate from "../components/FormattedDate.vue";
import GiscusComments from "../components/GiscusComments.vue";
import PostToc from "../components/PostToc.vue";
import TagPill from "../components/TagPill.vue";
import { SITE } from "../config";
import { useCodeCopy } from "../composables/useCodeCopy";
import WeekendCalendar from "../features/weekend-calendar/WeekendCalendar.vue";
import { getAdjacentPosts, getPostBySlug } from "../lib/posts";

const route = useRoute();

const slug = computed(() => String(route.params.slug));
const post = computed(() => getPostBySlug(slug.value));
const adjacent = computed(() => getAdjacentPosts(slug.value));

const contentRef = ref<HTMLElement>();
useCodeCopy(contentRef);

// Mobile table of contents: a floating button opens a small popover panel
// instead of an in-flow disclosure box.
const tocOpen = ref(false);

function onTocPanelClick(event: MouseEvent) {
  if ((event.target as HTMLElement).closest("a")) tocOpen.value = false;
}

watchEffect(() => {
  // Reset the panel when navigating between posts.
  if (!post.value) tocOpen.value = false;
});

watchEffect(() => {
  if (post.value) {
    document.title = `${post.value.title} | ${SITE.title}`;
  }
});
</script>

<template>
  <template v-if="post">
    <div class="relative mx-auto max-w-3xl">
      <article class="min-w-0">
        <header class="border-border border-b pb-6">
          <h1 class="text-3xl font-bold tracking-tight">{{ post.title }}</h1>
          <div
            class="text-muted-foreground mt-4 flex flex-wrap items-center gap-3 text-sm"
          >
            <FormattedDate :date="post.pubDatetime" />
            <div v-if="post.tags.length > 0" class="flex flex-wrap gap-1.5">
              <TagPill v-for="tag in post.tags" :key="tag" :tag="tag" />
            </div>
          </div>
        </header>

        <!-- eslint-disable-next-line vue/no-v-html -->
        <div
          ref="contentRef"
          class="prose mt-8 max-w-none"
          v-html="post.html"
        />

        <WeekendCalendar
          v-if="post.weekendCalendar"
          :summary="post.weekendCalendar.summary"
          :events="post.weekendCalendar.events"
          :instance-id="post.slug"
        />

        <nav
          class="border-border mt-8 grid gap-4 border-t pt-8 sm:grid-cols-2"
          aria-label="上一篇 / 下一篇"
        >
          <RouterLink
            v-if="adjacent.older"
            :to="`/posts/${adjacent.older.slug}`"
            class="border-border hover:border-accent rounded-md border p-4 transition-colors"
          >
            <span class="text-muted-foreground text-xs">上一篇</span>
            <span class="hover:text-accent mt-1 block font-medium">
              {{ adjacent.older.title }}
            </span>
          </RouterLink>
          <span v-else />
          <RouterLink
            v-if="adjacent.newer"
            :to="`/posts/${adjacent.newer.slug}`"
            class="border-border hover:border-accent rounded-md border p-4 text-right transition-colors"
          >
            <span class="text-muted-foreground text-xs">下一篇</span>
            <span class="hover:text-accent mt-1 block font-medium">
              {{ adjacent.newer.title }}
            </span>
          </RouterLink>
        </nav>

        <GiscusComments />
      </article>

      <aside
        v-if="post.toc.length > 0"
        class="absolute top-0 left-full ml-8 hidden h-full w-52 xl:block"
      >
        <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <PostToc :items="post.toc" />
        </div>
      </aside>
    </div>

    <template v-if="post.toc.length > 0">
      <button
        v-if="!tocOpen"
        type="button"
        aria-label="打开目录"
        class="bg-background border-border text-muted-foreground hover:text-accent fixed right-5 bottom-6 z-40 rounded-full border p-3 shadow-md transition-colors xl:hidden"
        @click="tocOpen = true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-5"
          aria-hidden="true"
        >
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      </button>

      <div
        v-if="tocOpen"
        class="fixed inset-0 z-50 xl:hidden"
        @click="tocOpen = false"
      />
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-2 opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="translate-y-2 opacity-0"
      >
        <div
          v-if="tocOpen"
          role="dialog"
          aria-label="文章目录"
          class="bg-background border-border fixed right-5 bottom-20 z-50 max-h-[55vh] w-72 max-w-[calc(100vw-2.5rem)] overflow-y-auto rounded-lg border p-4 shadow-lg xl:hidden"
          @click="onTocPanelClick"
        >
          <PostToc :items="post.toc" />
        </div>
      </Transition>
    </template>
  </template>

  <div v-else class="py-16 text-center">
    <p class="text-4xl font-bold">404</p>
    <p class="text-muted-foreground mt-3">这篇文章不存在。</p>
    <RouterLink to="/" class="text-accent mt-6 inline-block hover:underline">
      返回首页
    </RouterLink>
  </div>
</template>
