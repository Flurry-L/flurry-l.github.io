<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

declare global {
  interface Window {
    PagefindUI?: new (options: {
      element: string;
      showSubResults?: boolean;
      showImages?: boolean;
    }) => unknown;
  }
}

const emit = defineEmits<{ close: [] }>();

const status = ref<"loading" | "ready" | "missing">("loading");
const panelRef = ref<HTMLElement>();

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) emit("close");
}

onMounted(async () => {
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", onKeydown);

  if (!document.querySelector('link[href="/pagefind/pagefind-ui.css"]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/pagefind/pagefind-ui.css";
    document.head.appendChild(stylesheet);
  }

  try {
    if (!window.PagefindUI) {
      await loadScript("/pagefind/pagefind-ui.js");
    }
    if (!window.PagefindUI) throw new Error("PagefindUI unavailable");
    new window.PagefindUI({
      element: "#pagefind-search",
      showSubResults: true,
      showImages: false,
    });
    status.value = "ready";
    await nextTick();
    panelRef.value?.querySelector<HTMLInputElement>("input")?.focus();
  } catch {
    status.value = "missing";
  }
});

onBeforeUnmount(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-24 backdrop-blur-sm"
      @click="onBackdropClick"
    >
      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        aria-label="搜索"
        class="bg-background border-border max-h-[70vh] w-full max-w-xl overflow-y-auto rounded-lg border p-5 shadow-xl"
      >
        <div v-show="status !== 'missing'" id="pagefind-search" />
        <div v-if="status === 'missing'" class="text-muted-foreground text-sm">
          <p>搜索索引还没有生成。</p>
          <p class="mt-2">
            请先运行
            <code class="bg-muted rounded px-1.5 py-0.5">npm run build</code>
            生成 Pagefind 索引。
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
