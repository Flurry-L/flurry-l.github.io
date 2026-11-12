<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

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

onMounted(() => {
  updateVisibility();
  window.addEventListener("scroll", updateVisibility, { passive: true });
  window.addEventListener("resize", updateVisibility);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", updateVisibility);
  window.removeEventListener("resize", updateVisibility);
});
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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-5"
      aria-hidden="true"
    >
      <path d="m6 12 6-6 6 6M12 6v13" />
    </svg>
  </button>
</template>
