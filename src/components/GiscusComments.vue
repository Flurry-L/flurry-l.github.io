<script setup lang="ts">
import Giscus from "@giscus/vue";

import { GISCUS } from "../config";
import { useTheme } from "../composables/useTheme";

defineProps<{ term: string }>();
const { isDark } = useTheme();
</script>

<template>
  <section class="mt-12" aria-label="评论区">
    <h2 class="mb-4 text-lg font-semibold">评论</h2>
    <Giscus
      v-bind="GISCUS"
      mapping="specific"
      :term="term"
      :theme="isDark ? 'dark' : 'light'"
      input-position="top"
      lang="zh-CN"
      loading="lazy"
    />
  </section>
</template>
