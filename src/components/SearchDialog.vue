<script lang="ts">
interface PagefindInstance {
  destroy?: () => void;
}

declare global {
  interface Window {
    PagefindUI?: new (options: {
      element: string;
      showSubResults?: boolean;
      showImages?: boolean;
      autofocus?: boolean;
    }) => PagefindInstance;
  }
}

let pagefindScriptPromise: Promise<void> | undefined;

function loadPagefind(): Promise<void> {
  if (window.PagefindUI) return Promise.resolve();
  if (pagefindScriptPromise) return pagefindScriptPromise;

  pagefindScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/pagefind/pagefind-ui.js";
    script.onload = () => {
      script.onload = null;
      script.onerror = null;
      if (window.PagefindUI) {
        resolve();
      } else {
        script.remove();
        reject(new Error("PagefindUI unavailable"));
      }
    };
    script.onerror = () => {
      script.onload = null;
      script.onerror = null;
      script.remove();
      reject(new Error("Failed to load Pagefind"));
    };
    document.head.appendChild(script);
  }).catch(error => {
    pagefindScriptPromise = undefined;
    throw error;
  });

  return pagefindScriptPromise;
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const emit = defineEmits<{ close: [] }>();
const router = useRouter();
const isDev = import.meta.env.DEV;
const status = ref<"loading" | "ready" | "missing">("loading");
const dialogRef = ref<HTMLDialogElement>();
let mounted = false;
let instance: PagefindInstance | undefined;
let previousOverflow = "";

function close() {
  dialogRef.value?.close();
}

function onBackdropClick(event: MouseEvent) {
  if (event.target !== dialogRef.value) return;
  const bounds = dialogRef.value.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    close();
}

function onResultClick(event: MouseEvent) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
  if (!link) return;
  const url = new URL(link.href);
  event.preventDefault();
  void router.push(`${url.pathname}${url.search}${url.hash}`);
  close();
}

onMounted(async () => {
  mounted = true;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  dialogRef.value?.showModal();
  if (!document.querySelector('link[href="/pagefind/pagefind-ui.css"]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/pagefind/pagefind-ui.css";
    document.head.appendChild(stylesheet);
  }
  try {
    await loadPagefind();
    if (!mounted) return;
    if (!window.PagefindUI) throw new Error("PagefindUI unavailable");
    instance = new window.PagefindUI({
      element: "#pagefind-search",
      showSubResults: true,
      showImages: false,
      autofocus: true,
    });
    status.value = "ready";
  } catch {
    if (mounted) status.value = "missing";
  }
});

onBeforeUnmount(() => {
  mounted = false;
  close();
  document.body.style.overflow = previousOverflow;
  instance?.destroy?.();
});
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialogRef"
      aria-labelledby="search-dialog-title"
      class="bg-background border-border text-foreground fixed top-24 mx-auto my-0 max-h-[70vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg border p-5 shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      @close="emit('close')"
      @click="onBackdropClick"
    >
      <div class="mb-4 flex items-center justify-between gap-3">
        <h2 id="search-dialog-title" class="font-semibold">搜索文章</h2>
        <button
          type="button"
          autofocus
          class="text-muted-foreground hover:text-accent rounded px-2 py-1 text-sm transition-colors"
          aria-label="关闭搜索"
          @click="close"
        >
          关闭
          <kbd
            class="border-border ml-1 rounded border px-1 text-xs"
            aria-hidden="true"
            >Esc</kbd
          >
        </button>
      </div>
      <p
        v-if="status === 'loading'"
        role="status"
        class="text-muted-foreground mb-3 text-sm"
      >
        正在加载搜索…
      </p>
      <div
        v-show="status !== 'missing'"
        id="pagefind-search"
        @click="onResultClick"
      />
      <div v-if="status === 'missing'" class="text-muted-foreground text-sm">
        <p>搜索暂时不可用，请稍后再试。</p>
        <p v-if="isDev" class="mt-2">
          请先运行
          <code class="bg-muted rounded px-1.5 py-0.5">npm run build</code> 生成
          Pagefind 索引。
        </p>
      </div>
    </dialog>
  </Teleport>
</template>
