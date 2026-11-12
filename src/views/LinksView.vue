<script setup lang="ts">
import { links } from "../data/links";
</script>

<template>
  <h1 class="mb-2 text-2xl font-bold">友情链接</h1>
  <ul class="mt-8 grid gap-4 sm:grid-cols-2">
    <li v-for="link in links" :key="link.url" class="min-w-0">
      <a
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="group border-border hover:border-accent/60 hover:bg-muted/40 flex h-full items-center gap-4 rounded-lg border p-4 no-underline transition-colors"
      >
        <img
          :src="link.avatar"
          width="48"
          height="48"
          loading="lazy"
          decoding="async"
          alt=""
          class="size-12 shrink-0 rounded"
        />
        <span class="min-w-0 [overflow-wrap:anywhere]">
          <strong class="group-hover:text-accent block transition-colors">
            {{ link.name }}
          </strong>
          <span class="text-muted-foreground mt-1 block text-sm">
            {{ link.description }}
          </span>
        </span>
      </a>
    </li>
  </ul>
</template>
