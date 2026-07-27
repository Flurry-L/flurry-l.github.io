<script setup lang="ts">
import TagPill from "../components/TagPill.vue";
import { getUniqueTags } from "../lib/posts";

const tags = getUniqueTags();
</script>

<template>
  <h1 class="mb-8 text-2xl font-bold tracking-tight">标签</h1>
  <div v-if="tags.length > 0" class="flex flex-wrap gap-2.5">
    <TagPill
      v-for="{ tag, count } in tags"
      :key="tag"
      :tag="tag"
      :count="count"
    />
  </div>
  <p v-else class="text-muted-foreground">暂无标签。</p>
</template>
