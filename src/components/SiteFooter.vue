<script setup lang="ts">
import { SITE } from "../config";

const year = new Date().getFullYear();
</script>

<template>
  <footer class="border-border border-t">
    <div
      class="text-muted-foreground mx-auto w-full max-w-3xl px-5 py-8 text-center text-sm sm:px-6"
    >
      <p>© {{ year }} {{ SITE.author }}. 保留所有权利。</p>
    </div>
  </footer>
</template>
