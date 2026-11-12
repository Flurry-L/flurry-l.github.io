<script setup lang="ts">
import { onMounted, ref } from "vue";
import { IconArrowUp } from "@tabler/icons-vue";
import { useEventListener } from "@vueuse/core";

const visible = ref(false);

function updateVisibility() {
  visible.value = window.scrollY > Math.max(400, window.innerHeight * 0.75);
}

function scrollToTop() {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
}

onMounted(updateVisibility);
useEventListener("scroll", updateVisibility, { passive: true });
useEventListener("resize", updateVisibility);
</script>

<template>
  <button
    v-if="visible"
    type="button"
    aria-label="返回顶部"
    title="返回顶部"
    class="border-border bg-background text-muted-foreground hover:border-accent hover:text-accent order-2 flex size-11 items-center justify-center rounded-full border shadow-sm transition-colors motion-reduce:transition-none"
    @click="scrollToTop"
  >
    <IconArrowUp class="size-5" aria-hidden="true" />
  </button>
</template>
