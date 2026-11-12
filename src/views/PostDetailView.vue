<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute } from "vue-router";
import { IconList } from "@tabler/icons-vue";
import { throttle } from "es-toolkit/function";
import { useEventListener } from "@vueuse/core";

import GiscusComments from "../components/GiscusComments.vue";
import MarkdownContent from "../components/MarkdownContent.vue";
import PostToc from "../components/PostToc.vue";
import TagPill from "../components/TagPill.vue";
import { getAdjacentPosts } from "../lib/posts";

const WeekendCalendar = defineAsyncComponent(
  () => import("../features/weekend-calendar/WeekendCalendar.vue")
);

const route = useRoute();
const slug = computed(() => String(route.params.slug));
const post = computed(() => route.meta.post);
const mounted = ref(false);
const adjacent = computed(() => getAdjacentPosts(slug.value));
const contentRef = ref<InstanceType<typeof MarkdownContent>>();
const tocDialog = ref<HTMLDialogElement>();
const activeHeadingId = ref("");
let headings: HTMLElement[] = [];

function updateActiveHeading() {
  let active = "";
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top > 120) break;
    active = heading.id;
  }
  activeHeadingId.value = active;
}

function refreshHeadings() {
  headings = [
    ...(contentRef.value?.element?.querySelectorAll<HTMLElement>(
      "h2[id], h3[id]"
    ) ?? []),
  ];
  updateActiveHeading();
}
const scheduleHeadingUpdate = throttle(updateActiveHeading, 100);

onMounted(() => {
  mounted.value = true;
  refreshHeadings();
});
useEventListener("scroll", scheduleHeadingUpdate, { passive: true });
useEventListener("resize", scheduleHeadingUpdate);
onBeforeUnmount(() => scheduleHeadingUpdate.cancel());
watch(
  post,
  () => {
    activeHeadingId.value = "";
    tocDialog.value?.close();
    refreshHeadings();
  },
  { flush: "post" }
);

function onTocClick(event: MouseEvent) {
  if ((event.target as HTMLElement).closest("a")) tocDialog.value?.close();
}
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
            <span
              >{{ post.wordCount.toLocaleString("zh-CN") }}字 · 约{{
                post.readingMinutes
              }}分钟阅读</span
            >
            <div v-if="post.tags.length > 0" class="flex flex-wrap gap-1.5">
              <TagPill v-for="tag in post.tags" :key="tag" :tag="tag" />
            </div>
          </div>
        </header>

        <MarkdownContent ref="contentRef" class="mt-8" :html="post.html" />

        <WeekendCalendar
          v-if="post.weekendCalendar"
          :key="post.slug"
          :summary="post.weekendCalendar.summary"
          :events="post.weekendCalendar.events"
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
          <IconList class="size-5" aria-hidden="true" />
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
