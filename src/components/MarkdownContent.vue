<script setup lang="ts">
import { useTemplateRef } from "vue";

import { useCodeCopy } from "../composables/useCodeCopy";
import { useImageZoom } from "../composables/useImageZoom";

const props = defineProps<{ html: string }>();
const element = useTemplateRef<HTMLElement>("content");

useCodeCopy(element);
useImageZoom(element, () => props.html);
defineExpose({ element });
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div ref="content" class="prose max-w-none" v-html="html" />
</template>
