<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

import { GISCUS, GISCUS_ENABLED } from "../config";
import { useTheme } from "../composables/useTheme";

const enabled = GISCUS_ENABLED;
const container = ref<HTMLElement>();
const { isDark } = useTheme();

function giscusTheme(): string {
  return isDark.value ? "dark" : "light";
}

onMounted(() => {
  if (!enabled || !container.value) return;

  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.async = true;
  script.crossOrigin = "anonymous";
  script.dataset.repo = GISCUS.repo;
  script.dataset.repoId = GISCUS.repoId;
  script.dataset.category = GISCUS.category;
  script.dataset.categoryId = GISCUS.categoryId;
  script.dataset.mapping = "pathname";
  script.dataset.strict = "0";
  script.dataset.reactionsEnabled = "1";
  script.dataset.emitMetadata = "0";
  script.dataset.inputPosition = "top";
  script.dataset.theme = giscusTheme();
  script.dataset.lang = "zh-CN";
  container.value.appendChild(script);
});

watch(isDark, () => {
  const iframe = document.querySelector<HTMLIFrameElement>(
    "iframe.giscus-frame"
  );
  iframe?.contentWindow?.postMessage(
    { giscus: { setConfig: { theme: giscusTheme() } } },
    "https://giscus.app"
  );
});
</script>

<template>
  <section v-if="enabled" class="mt-12" aria-label="评论区">
    <h2 class="mb-4 text-lg font-semibold">评论</h2>
    <div ref="container" />
  </section>
</template>
