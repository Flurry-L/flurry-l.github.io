<script setup lang="ts">
import FormattedDate from "../components/FormattedDate.vue";
import { groupPostsByYear } from "../lib/format";
import { getSortedPosts } from "../lib/posts";

const groups = groupPostsByYear(getSortedPosts());
</script>

<template>
  <h1 class="mb-8 text-2xl font-bold tracking-tight">归档</h1>
  <section v-for="group in groups" :key="group.year" class="mb-10 last:mb-0">
    <h2 class="text-accent mb-3 text-lg font-semibold">{{ group.year }}</h2>
    <ul class="space-y-2.5">
      <li
        v-for="post in group.posts"
        :key="post.slug"
        class="flex flex-wrap items-baseline gap-x-4"
      >
        <span class="text-muted-foreground shrink-0 text-sm tabular-nums">
          <FormattedDate :date="post.pubDatetime" />
        </span>
        <RouterLink
          :to="`/posts/${post.slug}`"
          class="hover:text-accent transition-colors"
        >
          {{ post.title }}
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
