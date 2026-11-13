<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { Calendar } from "v-calendar";
import "v-calendar/style.css";

import { useTheme } from "../../composables/useTheme";
import { formatText } from "../../lib/format";
import type { ActivityCalendarInput } from "../../types/post";
import { groupActivityMonths } from "./model";

const props = defineProps<ActivityCalendarInput>();
const { isDark } = useTheme();
const months = computed(() => groupActivityMonths(props.events));
const selectedMonthKey = ref(months.value[0]?.key);
const id = useId();
const attributes = computed(() => [
  {
    key: "activities",
    dot: true,
    dates: props.events.map(event => new Date(event.date)),
  },
]);

function onPagesChange(pages: { year: number; month: number }[]) {
  const { year, month } = pages[0];
  selectedMonthKey.value = `${year}-${String(month).padStart(2, "0")}`;
}

type ActivityDay = { id: string; inMonth: boolean };

function jumpToDay(day: ActivityDay) {
  if (!day.inMonth) return;
  const target = document.getElementById(`${id}-day-${day.id}`);
  if (!target) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "nearest" });
}

function onDayKeydown(day: ActivityDay, event: KeyboardEvent) {
  if (["Enter", " "].includes(event.key)) {
    event.preventDefault();
    jumpToDay(day);
  }
}
</script>

<template>
  <section
    v-if="months.length"
    aria-label="行动记录"
    class="mt-6 grid items-start gap-6 sm:grid-cols-[18rem_minmax(0,1fr)]"
  >
    <div class="sm:sticky sm:top-24">
      <Calendar
        class="activity-calendar"
        locale="zh-CN"
        timezone="UTC"
        color="green"
        :is-dark="isDark"
        :first-day-of-week="2"
        :masks="{ title: 'YYYY年M月' }"
        :initial-page="months[0]"
        :min-page="months[0]"
        :max-page="months.at(-1)"
        :attributes="attributes"
        borderless
        transparent
        expanded
        @update:pages="onPagesChange"
        @dayclick="jumpToDay"
        @daykeydown="onDayKeydown"
      >
        <template #header-title="{ title }">{{ formatText(title) }}</template>
      </Calendar>
    </div>

    <div class="prose prose-sm max-w-none min-w-0">
      <ol
        v-for="month in months"
        v-show="selectedMonthKey === month.key"
        :key="month.key"
        :aria-label="`${month.label}行动记录`"
        class="my-0 list-none pl-0"
      >
        <li
          v-for="day in month.days"
          :id="`${id}-day-${day.date}`"
          :key="day.date"
          tabindex="-1"
          class="focus-visible:outline-accent pl-0 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <time
            :datetime="day.date"
            class="text-muted-foreground text-xs font-medium tabular-nums"
            >{{ day.label }}</time
          >
          <p v-for="(event, index) in day.records" :key="index" class="my-1">
            {{ event.text }}
          </p>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.activity-calendar {
  --vc-font-family: var(--font-sans);
  --vc-color: var(--foreground);
  --vc-header-title-color: var(--foreground);
  --vc-header-arrow-color: var(--muted-foreground);
  --vc-header-arrow-hover-bg: var(--muted);
  --vc-weekday-color: var(--muted-foreground);
  --vc-accent-500: var(--accent);
  --vc-accent-600: var(--accent);
}
</style>
