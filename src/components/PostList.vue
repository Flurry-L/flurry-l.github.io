<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";

import { POSTS } from "../config";
import type { PostMeta } from "../lib/posts";
import PostCard from "./PostCard.vue";

const props = defineProps<{
  posts: PostMeta[];
  initialCount?: number;
  autoLoad?: boolean;
}>();
const emit = defineEmits<{
  "visible-count-change": [count: number];
}>();
const count = ref(props.initialCount ?? POSTS.perPage);
const visiblePosts = computed(() => props.posts.slice(0, count.value));
const list = ref<HTMLElement>();
const sentinel = ref<HTMLElement>();
const hasMore = computed(() => visiblePosts.value.length < props.posts.length);
let observer: IntersectionObserver | undefined;

watch([() => props.posts, () => props.initialCount], () => {
  count.value = props.initialCount ?? POSTS.perPage;
});
watch(
  () => visiblePosts.value.length,
  value => emit("visible-count-change", value)
);

function observeEnd() {
  observer?.disconnect();
  if (props.autoLoad && hasMore.value && sentinel.value)
    observer?.observe(sentinel.value);
}

onMounted(() => {
  if (!props.autoLoad) return;
  observer = new IntersectionObserver(
    entries => {
      if (hasMore.value && entries.some(entry => entry.isIntersecting)) {
        count.value = Math.min(props.posts.length, count.value + POSTS.perPage);
      }
    },
    { rootMargin: "200px 0px" }
  );
  observeEnd();
});
// Reobserve after each rendered batch: short pages may still need another batch.
watch([count, () => props.posts], observeEnd, { flush: "post" });
onBeforeUnmount(() => observer?.disconnect());

async function showMore() {
  const previousCount = visiblePosts.value.length;
  if (!hasMore.value) return;
  count.value = Math.min(props.posts.length, count.value + POSTS.perPage);
  await nextTick();
  const headings = list.value?.querySelectorAll("article h2");
  headings?.[previousCount]
    ?.closest<HTMLAnchorElement>("a")
    ?.focus({ preventScroll: true });
}
</script>

<template>
  <div ref="list">
    <PostCard v-for="post in visiblePosts" :key="post.slug" :post="post" />
  </div>
  <div v-if="autoLoad" ref="sentinel" class="h-px" aria-hidden="true" />
  <div
    v-if="posts.length > 0 && (!autoLoad || !hasMore)"
    class="text-muted-foreground mt-8 text-center text-sm"
  >
    <button
      v-if="hasMore"
      type="button"
      class="border-border hover:border-accent hover:text-accent rounded-lg border px-5 py-2 transition-colors"
      @click="showMore"
    >
      加载更多
    </button>
    <p v-if="autoLoad && !hasMore" class="mt-3">已经到底了</p>
    <p v-else-if="!autoLoad" class="mt-3" role="status">
      已显示 {{ visiblePosts.length }} / {{ posts.length }} 篇
    </p>
  </div>
</template>
