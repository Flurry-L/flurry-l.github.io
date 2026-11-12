<script setup lang="ts">
import { onMounted, ref } from "vue";

import PostList from "../components/PostList.vue";
import { POSTS } from "../config";
import { getSortedPosts } from "../lib/posts";

const posts = getSortedPosts();
const initialCount = ref(POSTS.perIndex);

onMounted(() => {
  // Restore this entry's expanded height only after hydration, but within
  // the mount flush so SPA back navigation can restore its scroll position.
  const savedCount: unknown = window.history.state?.homePostCount;
  if (typeof savedCount === "number" && Number.isSafeInteger(savedCount)) {
    initialCount.value = Math.max(POSTS.perIndex, savedCount);
  }
});

function rememberVisibleCount(count: number) {
  window.history.replaceState(
    { ...window.history.state, homePostCount: count },
    ""
  );
}
</script>

<template>
  <PostList
    :posts="posts"
    :initial-count="initialCount"
    auto-load
    @visible-count-change="rememberVisibleCount"
  />
</template>
