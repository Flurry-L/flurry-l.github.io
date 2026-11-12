<script setup lang="ts">
import { groupPostsByYear } from "../lib/posts";

const groups = groupPostsByYear();
</script>

<template>
  <h1 class="mb-8 text-2xl font-bold">归档</h1>
  <section v-for="group in groups" :key="group.year" class="mb-10 last:mb-0">
    <h2 class="text-accent mb-3 text-lg font-semibold">{{ group.year }}</h2>
    <ul class="space-y-2.5">
      <li
        v-for="post in group.posts"
        :key="post.slug"
        class="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-4"
      >
        <time
          :datetime="post.pubDatetime"
          :title="post.dateLabel"
          class="text-muted-foreground text-sm tabular-nums"
        >
          {{ post.archiveDate }}
        </time>
        <RouterLink
          :to="{ name: 'post', params: { slug: post.slug } }"
          class="hover:text-accent transition-colors"
        >
          {{ post.title }}
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
