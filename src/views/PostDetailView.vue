<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import FormattedDate from "../components/FormattedDate.vue";
import GiscusComments from "../components/GiscusComments.vue";
import PostToc from "../components/PostToc.vue";
import TagPill from "../components/TagPill.vue";
import { useCodeCopy } from "../composables/useCodeCopy";
import { useImageZoom } from "../composables/useImageZoom";
import WeekendCalendar from "../features/weekend-calendar/WeekendCalendar.vue";
import { getAdjacentPosts } from "../lib/posts";

const route = useRoute();
const slug = computed(() => String(route.params.slug));
const post = computed(() => route.meta.post);
const loadFailed = computed(() => route.meta.postLoadFailed);
const mounted = ref(false);
const adjacent = computed(() => getAdjacentPosts(slug.value));
const contentRef = ref<HTMLElement>();
const tocDialog = ref<HTMLDialogElement>();
const activeHeadingId = ref("");
let headingFrame: number | undefined;

function updateActiveHeading() {
  headingFrame = undefined;
  let active = "";
  for (const item of post.value?.toc ?? []) {
    const heading = document.getElementById(item.id);
    if (heading && heading.getBoundingClientRect().top <= 120) active = item.id;
  }
  activeHeadingId.value = active;
}

function scheduleHeadingUpdate() {
  if (headingFrame === undefined)
    headingFrame = requestAnimationFrame(updateActiveHeading);
}

onMounted(() => {
  mounted.value = true;
  window.addEventListener("scroll", scheduleHeadingUpdate, { passive: true });
  window.addEventListener("resize", scheduleHeadingUpdate);
  scheduleHeadingUpdate();
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", scheduleHeadingUpdate);
  window.removeEventListener("resize", scheduleHeadingUpdate);
  if (headingFrame !== undefined) cancelAnimationFrame(headingFrame);
});
watch(
  post,
  () => {
    activeHeadingId.value = "";
    tocDialog.value?.close();
    if (mounted.value) scheduleHeadingUpdate();
  },
  { flush: "post" }
);

useCodeCopy(contentRef);
useImageZoom(contentRef, () => post.value?.html);

function onTocClick(event: MouseEvent) {
  if ((event.target as HTMLElement).closest("a")) tocDialog.value?.close();
}
</script>

<template>
  <div v-if="loadFailed" class="py-16 text-center" role="alert">
    <h1 class="text-2xl font-bold">文章加载失败</h1>
    <p class="text-muted-foreground mt-3">请检查网络连接后重新加载。</p>
    <a
      :href="route.fullPath"
      class="text-accent mt-6 inline-block hover:underline"
      >重新加载</a
    >
  </div>
  <template v-else-if="post">
    <div class="relative mx-auto max-w-3xl">
      <article class="min-w-0" data-pagefind-body>
        <header class="border-border border-b pb-6">
          <h1
            data-pagefind-meta="title"
            class="text-3xl font-bold tracking-tight"
          >
            {{ post.title }}
          </h1>
          <div
            data-pagefind-ignore="all"
            class="text-muted-foreground mt-4 flex flex-wrap items-center gap-3 text-sm"
          >
            <FormattedDate :date="post.pubDatetime" />
            <span
              >{{ post.wordCount.toLocaleString("zh-CN") }} 字 · 约
              {{ post.readingMinutes }} 分钟阅读</span
            >
            <div v-if="post.tags.length > 0" class="flex flex-wrap gap-1.5">
              <TagPill v-for="tag in post.tags" :key="tag" :tag="tag" />
            </div>
          </div>
        </header>

        <!-- eslint-disable vue/no-v-html -->
        <div
          ref="contentRef"
          class="prose mt-8 max-w-none"
          v-html="post.html"
        />
        <!-- eslint-enable vue/no-v-html -->

        <WeekendCalendar
          v-if="post.weekendCalendar"
          :summary="post.weekendCalendar.summary"
          :events="post.weekendCalendar.events"
          :instance-id="post.slug"
        />

        <nav
          data-pagefind-ignore="all"
          class="border-border mt-8 grid gap-4 border-t pt-8 sm:grid-cols-2"
          aria-label="上一篇 / 下一篇"
        >
          <RouterLink
            v-if="adjacent.older"
            :to="`/posts/${adjacent.older.slug}`"
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
            :to="`/posts/${adjacent.newer.slug}`"
            class="border-border hover:border-accent rounded-md border p-4 text-right transition-colors"
          >
            <span class="text-muted-foreground text-xs">下一篇</span>
            <span class="hover:text-accent mt-1 block font-medium">{{
              adjacent.newer.title
            }}</span>
          </RouterLink>
        </nav>

        <GiscusComments
          :key="post.slug"
          :term="`posts/${post.slug}`"
          data-pagefind-ignore="all"
        />
      </article>

      <aside
        v-if="post.toc.length > 0"
        class="absolute top-0 left-full ml-8 hidden h-full w-52 xl:block"
      >
        <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <PostToc :items="post.toc" :active-id="activeHeadingId" />
        </div>
      </aside>
    </div>

    <template v-if="post.toc.length > 0">
      <Teleport v-if="mounted" to="#floating-actions">
        <button
          type="button"
          aria-label="打开目录"
          aria-haspopup="dialog"
          class="border-border bg-background text-muted-foreground hover:border-accent hover:text-accent order-1 flex size-11 items-center justify-center rounded-full border shadow-sm transition-colors motion-reduce:transition-none xl:hidden"
          @click="tocDialog?.showModal()"
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
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </button>
      </Teleport>
      <dialog
        ref="tocDialog"
        aria-label="文章目录"
        class="toc-dialog bg-background border-border text-foreground fixed inset-auto max-h-[65vh] w-72 max-w-[calc(100vw-2.5rem)] overflow-y-auto rounded-lg border p-4 shadow-lg backdrop:bg-black/30"
        @click="
          event => {
            if (event.target === tocDialog) tocDialog?.close();
          }
        "
      >
        <button
          type="button"
          class="text-muted-foreground hover:text-accent mb-3 block w-full text-right text-sm"
          @click="tocDialog?.close()"
        >
          关闭目录
        </button>
        <div @click="onTocClick">
          <PostToc :items="post.toc" :active-id="activeHeadingId" />
        </div>
      </dialog>
    </template>
  </template>

  <div v-else class="py-16 text-center">
    <h1 class="text-4xl font-bold">404</h1>
    <p class="text-muted-foreground mt-3">这篇文章不存在。</p>
    <RouterLink to="/" class="text-accent mt-6 inline-block hover:underline">
      返回首页
    </RouterLink>
  </div>
</template>
