<script setup lang="ts">
import { Check, Copy, RefreshCw } from '@lucide/vue';
import { onMounted, ref } from 'vue';

const fallback = {
  text: '在自己的节奏里，慢慢把事情做好。',
  from: '日常',
};

const quote = ref(fallback);
const loading = ref(false);
const copied = ref(false);

async function loadQuote() {
  loading.value = true;
  copied.value = false;
  try {
    const response = await fetch('https://international.v1.hitokoto.cn?c=a&c=d');
    if (!response.ok) throw new Error('Quote request failed');
    const data = await response.json() as { hitokoto?: string; from?: string };
    quote.value = {
      text: data.hitokoto || fallback.text,
      from: data.from || fallback.from,
    };
  } catch {
    quote.value = fallback;
  } finally {
    loading.value = false;
  }
}

async function copyQuote() {
  try {
    await navigator.clipboard.writeText(`${quote.value.text} - ${quote.value.from}`);
    copied.value = true;
    window.setTimeout(() => (copied.value = false), 1400);
  } catch {
    copied.value = false;
  }
}

onMounted(loadQuote);
</script>

<template>
  <section class="quote-widget" aria-live="polite">
    <p>{{ quote.text }}</p>
    <div class="quote-footer">
      <span>来自 {{ quote.from }}</span>
      <div class="quote-actions">
        <button
          class="icon-button icon-button-small"
          type="button"
          aria-label="换一句"
          title="换一句"
          :disabled="loading"
          @click="loadQuote"
        >
          <RefreshCw :class="{ spinning: loading }" :size="15" aria-hidden="true" />
        </button>
        <button
          class="icon-button icon-button-small"
          type="button"
          aria-label="复制句子"
          title="复制句子"
          @click="copyQuote"
        >
          <Check v-if="copied" :size="15" aria-hidden="true" />
          <Copy v-else :size="15" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
</template>
