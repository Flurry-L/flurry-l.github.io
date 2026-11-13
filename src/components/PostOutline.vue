<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { IconList } from "@tabler/icons-vue";
import { useMediaQuery } from "@vueuse/core";

import type { TocItem } from "../lib/posts";
import PostToc from "./PostToc.vue";

defineProps<{ items: TocItem[] }>();
const isDesktop = useMediaQuery("(min-width: 1280px)", { ssrWidth: 1280 });
const mounted = ref(false);
const tocDialog = ref<HTMLDialogElement>();
const toc = ref<InstanceType<typeof PostToc>>();

onMounted(() => {
  mounted.value = true;
});

watch(isDesktop, desktop => {
  if (desktop) tocDialog.value?.close();
});

function openToc() {
  tocDialog.value?.showModal();
  toc.value?.refresh();
}
</script>

<template>
  <aside class="absolute top-0 left-full ml-8 hidden h-full w-52 xl:block">
    <div class="sticky top-20">
      <Teleport :to="tocDialog ?? 'body'" :disabled="!mounted || isDesktop">
        <PostToc ref="toc" :items="items" @navigate="tocDialog?.close()" />
      </Teleport>
    </div>
  </aside>

  <Teleport v-if="mounted" to="#floating-actions">
    <button
      type="button"
      aria-label="打开目录"
      aria-haspopup="dialog"
      class="border-border bg-background text-muted-foreground hover:border-accent hover:text-accent order-1 flex size-11 items-center justify-center rounded-full border shadow-sm transition-colors motion-reduce:transition-none xl:hidden"
      @click="openToc"
    >
      <IconList class="size-5" aria-hidden="true" />
    </button>
  </Teleport>
  <dialog
    ref="tocDialog"
    aria-label="文章目录"
    class="toc-dialog bg-background border-border text-foreground fixed inset-auto max-h-[65vh] w-72 max-w-[calc(100vw-2.5rem)] overflow-y-auto rounded-lg border p-4 shadow-lg backdrop:bg-black/30"
    @click="
      event => {
        if (event.target === tocDialog) tocDialog?.close();
      }
    "
  />
</template>
