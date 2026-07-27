<script setup lang="ts">
import { links } from "../data/links";
</script>

<template>
  <h1 class="mb-2 text-2xl font-bold tracking-tight">友情链接</h1>
  <ul class="mt-8 grid gap-6 sm:grid-cols-2">
    <li
      v-for="link in links"
      :key="link.url"
      class="border-border border-b py-5 first:pt-0 last:border-b-0 sm:border-b-0 sm:py-0"
    >
      <a
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="group flex items-center gap-4 no-underline"
      >
        <img
          :src="link.avatar"
          width="48"
          height="48"
          loading="lazy"
          alt=""
          class="size-12 rounded"
        />
        <span class="min-w-0">
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
