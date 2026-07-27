<script setup lang="ts">
defineProps<{ tag: string; count?: number }>();
</script>

<template>
  <RouterLink
    :to="`/tags/${encodeURIComponent(tag)}`"
    class="border-border text-muted-foreground hover:border-accent hover:text-accent inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors"
  >
    <span>#{{ tag }}</span>
    <span v-if="count !== undefined" class="text-muted-foreground/70">
      {{ count }}
    </span>
  </RouterLink>
</template>
