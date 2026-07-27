<script setup lang="ts">
import type { Post } from "../lib/posts";

import FormattedDate from "./FormattedDate.vue";
import TagPill from "./TagPill.vue";

defineProps<{ post: Post }>();
</script>

<template>
  <article class="group border-border border-b py-7 first:pt-0 last:border-b-0">
    <RouterLink :to="`/posts/${post.slug}`" class="block">
      <h2
        class="group-hover:text-accent text-xl font-semibold tracking-tight transition-colors"
      >
        {{ post.title }}
      </h2>
    </RouterLink>
    <div
      class="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-xs"
    >
      <FormattedDate :date="post.pubDatetime" />
      <div v-if="post.tags.length > 0" class="flex flex-wrap gap-1.5">
        <TagPill v-for="tag in post.tags" :key="tag" :tag="tag" />
      </div>
    </div>
    <RouterLink :to="`/posts/${post.slug}`" class="block">
      <p class="text-muted-foreground mt-2 line-clamp-2 text-sm leading-7">
        {{ post.excerpt || post.description }}
      </p>
    </RouterLink>
  </article>
</template>
