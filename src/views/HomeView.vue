<script setup lang="ts">
import PostCard from "../components/PostCard.vue";
import { getSortedPosts } from "../lib/posts";

const posts = getSortedPosts();
</script>

<template>
  <PostCard v-for="post in posts" :key="post.slug" :post="post" />
</template>
