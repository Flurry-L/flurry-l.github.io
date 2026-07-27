<script setup lang="ts">
import { computed } from "vue";

import { formatDate } from "../lib/format";

const props = defineProps<{ date: string }>();

const formatted = computed(() => formatDate(props.date));
</script>

<template>
  <time :datetime="date">{{ formatted }}</time>
</template>
