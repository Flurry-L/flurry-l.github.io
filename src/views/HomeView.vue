<script setup lang="ts">
import PostList from "../components/PostList.vue";
import { posts } from "../lib/posts";
</script>

<template>
  <h1 class="sr-only">文章</h1>
  <PostList :posts="posts" />
</template>
