<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import PostList from "../components/PostList.vue";
import { getPostsByTag } from "../lib/posts";

const route = useRoute();

const tag = computed(() => String(route.params.tag));
const posts = computed(() => getPostsByTag(tag.value));
</script>

<template>
  <h1 class="mb-6 text-2xl font-bold tracking-tight">
    标签：<span class="text-accent">#{{ tag }}</span>
  </h1>
  <template v-if="posts.length > 0">
    <PostList :posts="posts" />
  </template>
  <div v-else class="py-16 text-center">
    <p class="text-muted-foreground">这个标签下还没有文章。</p>
    <RouterLink
      to="/tags"
      class="text-accent mt-4 inline-block hover:underline"
    >
      查看全部标签
    </RouterLink>
  </div>
</template>
