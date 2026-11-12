<script setup lang="ts">
import { ref, watch } from "vue";

import type { TocItem } from "../lib/posts";

const props = withDefaults(
  defineProps<{ items: TocItem[]; activeId: string; showTitle?: boolean }>(),
  { showTitle: true }
);

const navRef = ref<HTMLElement>();

watch(
  () => props.activeId,
  id => {
    const nav = navRef.value;
    if (!nav || !id) return;
    const link = nav.querySelector<HTMLElement>(
      `[data-toc-id="${CSS.escape(id)}"]`
    );
    const scroller = nav.parentElement;
    if (link && scroller && scroller.scrollHeight > scroller.clientHeight) {
      scroller.scrollTop +=
        link.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top -
        scroller.clientHeight / 2;
    }
  },
  { flush: "post" }
);
</script>

<template>
  <nav ref="navRef" aria-label="文章目录" class="text-sm">
    <p v-if="showTitle" class="mb-2 font-medium">目录</p>
    <ul class="border-border space-y-1.5 border-l">
      <li
        v-for="item in items"
        :key="item.id"
        :class="item.depth === 3 ? 'pl-6' : 'pl-3'"
      >
        <a
          :href="`#${item.id}`"
          :data-toc-id="item.id"
          :aria-current="activeId === item.id ? 'location' : undefined"
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
