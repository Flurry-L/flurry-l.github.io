<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useMutationObserver } from "@vueuse/core";
import tocbot from "tocbot";

import type { TocItem } from "../lib/posts";

defineProps<{ items: TocItem[] }>();
const emit = defineEmits<{ navigate: [] }>();
const router = useRouter();
const toc = ref<HTMLElement>();
const ready = ref(false);
let previousHashChange: Window["onhashchange"];
let previousScrollEnd: Window["onscrollend"];

function onClick(event: MouseEvent) {
  if (
    event.button ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  emit("navigate");
  void router.push({
    hash: (event.currentTarget as HTMLAnchorElement).getAttribute("href")!,
  });
}

onMounted(async () => {
  ready.value = true;
  await nextTick();
  previousHashChange = window.onhashchange;
  previousScrollEnd = window.onscrollend;
  tocbot.init({
    tocElement: toc.value,
    contentSelector: "[data-post-content]",
    headingSelector: "h2[id], h3[id]",
    hasInnerContainers: true,
    headingsOffset: 88,
    scrollSmooth: false,
    orderedList: false,
    collapseDepth: 6,
    onClick,
  });
});

// Tocbot owns link classes; reflect its active link for assistive technology.
useMutationObserver(
  toc,
  () => {
    for (const link of toc.value!.querySelectorAll("a")) {
      if (link.classList.contains("is-active-link"))
        link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  },
  { subtree: true, attributes: true, attributeFilter: ["class"] }
);

onBeforeUnmount(() => {
  tocbot.destroy();
  window.onhashchange = previousHashChange;
  window.onscrollend = previousScrollEnd;
});

defineExpose({ refresh: () => tocbot.refresh() });
</script>

<template>
  <nav aria-label="文章目录" class="post-toc text-sm">
    <p class="mb-2 font-medium">目录</p>
    <div
      v-show="ready"
      ref="toc"
      class="toc max-h-[55vh] xl:max-h-[calc(100vh-8rem)]"
    />
    <ul v-if="!ready" class="border-border space-y-1.5 border-l">
      <li
        v-for="item in items"
        :key="item.id"
        :class="item.depth === 3 ? 'pl-6' : 'pl-3'"
      >
        <RouterLink
          :to="{ hash: `#${item.id}` }"
          class="text-muted-foreground hover:text-accent block leading-6"
        >
          {{ item.text }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.post-toc :deep(.toc-link) {
  display: block;
  padding-block: 0.2rem;
  color: var(--muted-foreground);
  line-height: 1.5;
}
.post-toc :deep(.toc-link:hover),
.post-toc :deep(.is-active-link) {
  color: var(--accent);
}
.post-toc :deep(.toc-link::before) {
  background: var(--border);
}
.post-toc :deep(.is-active-link::before) {
  background: var(--accent);
}
</style>
