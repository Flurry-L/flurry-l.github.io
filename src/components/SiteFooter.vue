<script setup lang="ts">
import { SITE } from "../config";

const year = new Date().getFullYear();
</script>

<template>
  <footer class="border-border border-t">
    <div
      class="text-muted-foreground mx-auto w-full max-w-3xl px-5 py-8 text-center text-sm sm:px-6"
    >
      <nav aria-label="更多内容" class="mb-3 flex justify-center gap-4">
        <RouterLink :to="{ name: 'archives' }" class="hover:text-accent">
          归档
        </RouterLink>
        <RouterLink :to="{ name: 'tags' }" class="hover:text-accent">
          标签
        </RouterLink>
        <a href="/rss.xml" class="hover:text-accent">RSS</a>
      </nav>
      <p>© {{ year }} {{ SITE.author }}. 保留所有权利。</p>
    </div>
  </footer>
</template>
