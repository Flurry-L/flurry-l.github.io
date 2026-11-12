<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { PagefindModal } from "@pagefind/component-ui";

const route = useRoute();
const router = useRouter();
const modal = useTemplateRef<PagefindModal>("modal");
const base = import.meta.env.BASE_URL;

// Register web components after hydration; Pagefind owns the dialog and shortcuts.
onMounted(() => import("@pagefind/component-ui"));
watch(
  () => route.fullPath,
  () => modal.value?.close?.()
);

function onResultClick(event: MouseEvent) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const link = (event.target as Element).closest<HTMLAnchorElement>(
    "pagefind-results a[href]"
  );
  if (!link) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin) return;
  event.preventDefault();
  const pathname =
    url.pathname.slice(router.options.history.base.length) || "/";
  void router.push(`${pathname}${url.search}${url.hash}`);
}
</script>

<template>
  <div class="contents">
    <pagefind-config :bundle-path="`${base}pagefind/`" :base-url="base" />
    <pagefind-modal-trigger
      compact
      hide-shortcut
      placeholder="搜索"
      title="搜索"
    />
    <pagefind-modal ref="modal" @click="onResultClick" />
  </div>
</template>
