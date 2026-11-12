<script setup lang="ts">
/* eslint-disable vue/no-v-html -- HTML comes from the shared Markdown build pipeline. */
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
  <div ref="content" class="prose max-w-none" v-html="html" />
</template>
