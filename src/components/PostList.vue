<script setup lang="ts">
import type { PostMeta } from "../lib/posts";
import PostCard from "./PostCard.vue";

defineProps<{ posts: PostMeta[] }>();
</script>

<template>
  <div>
    <PostCard v-for="post in posts" :key="post.slug" :post="post" />
  </div>
</template>
