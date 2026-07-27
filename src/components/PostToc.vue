<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

import type { TocItem } from "../lib/posts";

const props = defineProps<{ items: TocItem[] }>();

const activeId = ref("");
const navRef = ref<HTMLElement>();

// Offset from the viewport top (sticky header + breathing room) at which a
// heading counts as "passed".
const ACTIVATION_OFFSET = 120;

function updateActive() {
  let current = "";
  for (const item of props.items) {
    const heading = document.getElementById(item.id);
    if (heading && heading.getBoundingClientRect().top <= ACTIVATION_OFFSET) {
      current = item.id;
    }
  }
  if (current === activeId.value) return;
  activeId.value = current;
  if (!current) return;

  // Keep the active entry visible inside the scrollable TOC container.
  const nav = navRef.value;
  const link = nav?.querySelector<HTMLElement>(
    `[data-toc-id="${CSS.escape(current)}"]`
  );
  if (nav && link) {
    nav.scrollTop = link.offsetTop - nav.clientHeight / 2;
  }
}

onMounted(() => {
  updateActive();
  window.addEventListener("scroll", updateActive, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", updateActive);
});
</script>

<template>
  <nav ref="navRef" aria-label="文章目录" class="text-sm">
    <p class="mb-2 font-medium">目录</p>
    <ul class="border-border space-y-1.5 border-l">
      <li
        v-for="item in items"
        :key="item.id"
        :class="item.depth === 3 ? 'pl-6' : 'pl-3'"
      >
        <a
          :href="`#${item.id}`"
          :data-toc-id="item.id"
          class="hover:text-accent block leading-6 transition-colors"
          :class="
            activeId === item.id
              ? 'text-accent font-medium'
              : 'text-muted-foreground'
          "
        >
          {{ item.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>
