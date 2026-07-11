<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';

const isDark = ref(false);
const label = computed(() => (isDark.value ? '切换到浅色模式' : '切换到深色模式'));

function applyTheme(dark: boolean) {
  const theme = dark ? 'dark' : 'light';
  isDark.value = dark;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#171817' : '#f3f5f4');
  localStorage.setItem('theme', theme);
  window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
}

function toggleTheme() {
  applyTheme(!isDark.value);
}

onMounted(() => {
  isDark.value = document.documentElement.dataset.theme === 'dark';
});
</script>

<template>
  <button
    class="icon-button"
    type="button"
    :aria-label="label"
    :title="label"
    @click="toggleTheme"
  >
    <Sun v-if="isDark" :size="18" :stroke-width="1.8" aria-hidden="true" />
    <Moon v-else :size="18" :stroke-width="1.8" aria-hidden="true" />
  </button>
</template>
