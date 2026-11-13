<script setup lang="ts">
import { computed } from "vue";
import { Calendar } from "v-calendar";
import "v-calendar/style.css";

import { useTheme } from "../../composables/useTheme";
import { formatText } from "../../lib/format";
import type { ActivityCalendarInput } from "../../types/post";
import { groupActivityMonths } from "./model";

const props = defineProps<ActivityCalendarInput>();
const { isDark } = useTheme();
const months = computed(() => groupActivityMonths(props.events));
const attributes = computed(() =>
  months.value.flatMap(month =>
    month.days.map(day => ({
      key: day.date,
      dot: true,
      content: {
        style: {
          color: isDark.value ? "var(--vc-accent-400)" : "var(--vc-accent-700)",
        },
      },
      dates: [new Date(day.date)],
      popover: { visibility: "hover-focus" as const },
      customData: day,
    }))
  )
);
</script>

<template>
  <section v-if="months.length" aria-label="行动记录" class="mt-6">
    <div class="activity-calendar mx-auto max-w-sm">
      <Calendar
        locale="zh-CN"
        timezone="UTC"
        color="green"
        :is-dark="isDark"
        :first-day-of-week="2"
        :masks="{ title: 'YYYY年M月', dayPopover: 'YYYY年M月D日' }"
        :initial-page="months[0]"
        :min-page="months[0]"
        :max-page="months.at(-1)"
        :attributes="attributes"
        borderless
        transparent
        expanded
      >
        <template #header-title="{ title }">{{ formatText(title) }}</template>
        <template
          #day-popover="{ day, format, masks, attributes: dayAttributes }"
        >
          <div
            class="w-72 max-w-[calc(100vw-3rem)] p-2 text-sm leading-relaxed font-normal"
          >
            <time
              :datetime="day.id"
              class="text-muted-foreground text-xs tabular-nums"
            >
              {{ formatText(format(day.date, masks.dayPopover)) }}
            </time>
            <ul class="mt-2 space-y-2">
              <template v-for="{ key, customData } in dayAttributes" :key="key">
                <li v-for="(event, index) in customData.records" :key="index">
                  {{ event.text }}
                </li>
              </template>
            </ul>
          </div>
        </template>
      </Calendar>
    </div>

    <details class="mt-4">
      <summary
        class="text-muted-foreground hover:text-foreground cursor-pointer text-sm"
      >
        查看全部记录
      </summary>
      <div class="prose prose-sm mt-4 max-w-none">
        <div v-for="month in months" :key="month.key">
          <p class="font-semibold">{{ month.label }}</p>
          <ol :aria-label="`${month.label}行动记录`" class="list-none pl-0">
            <li v-for="day in month.days" :key="day.date" class="pl-0">
              <time
                :datetime="day.date"
                class="text-muted-foreground text-xs font-medium tabular-nums"
                >{{ day.label }}</time
              >
              <p
                v-for="(event, index) in day.records"
                :key="index"
                class="my-1"
              >
                {{ event.text }}
              </p>
            </li>
          </ol>
        </div>
      </div>
    </details>
  </section>
</template>

<style scoped>
.activity-calendar :deep(.vc-container) {
  --vc-font-family: var(--font-sans);
  --vc-color: var(--foreground);
  --vc-header-title-color: var(--foreground);
  --vc-header-arrow-color: var(--muted-foreground);
  --vc-header-arrow-hover-bg: var(--muted);
  --vc-weekday-color: var(--muted-foreground);
  --vc-accent-500: var(--accent);
  --vc-accent-600: var(--accent);
}

.activity-calendar :deep(.vc-popover-content) {
  --vc-popover-content-color: var(--foreground);
  --vc-popover-content-bg: var(--background);
  --vc-popover-content-border: var(--border);
}
</style>
