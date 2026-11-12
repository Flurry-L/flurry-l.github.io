<script setup lang="ts">
import { computed, ref, useId } from "vue";

import type { WeekendCalendarInput } from "../../types/post";
import { formatNumber, formatText } from "../../lib/format";
import { buildWeekendCalendar } from "./model";

const props = defineProps<WeekendCalendarInput>();
const model = computed(() => buildWeekendCalendar(props.events));
const selectedMonthKey = ref(model.value.months[0]?.key);
const id = useId();

function jumpToDate(date: string) {
  const target = document.getElementById(`${id}-day-${date}`)!;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "nearest" });
}
</script>

<template>
  <section class="weekend-calendar" aria-label="周末日程">
    <header class="calendar-intro">
      <div>
        <p>{{ summary }}</p>
        <p class="calendar-meta">
          {{
            formatText(
              `${model.rangeLabel} · 共${formatNumber(model.totalEvents)}项`
            )
          }}
        </p>
      </div>
      <label class="calendar-picker">
        <span>月份</span>
        <select
          v-model="selectedMonthKey"
          :aria-controls="`${id}-${selectedMonthKey}`"
        >
          <option
            v-for="month in model.months"
            :key="month.key"
            :value="month.key"
          >
            {{ month.label }}
          </option>
        </select>
      </label>
    </header>

    <section
      v-for="month in model.months"
      v-show="selectedMonthKey === month.key"
      :id="`${id}-${month.key}`"
      :key="month.key"
      class="calendar-panel"
      :aria-labelledby="`${id}-heading-${month.key}`"
    >
      <div class="calendar-month">
        <h3 :id="`${id}-heading-${month.key}`">{{ month.label }}</h3>
        <div class="calendar-grid">
          <span
            v-for="weekday in ['一', '二', '三', '四', '五', '六', '日']"
            :key="weekday"
            class="calendar-weekday"
            aria-hidden="true"
          >
            {{ weekday }}
          </span>
          <span
            v-for="offset in month.firstDayOffset"
            :key="`empty-${offset}`"
            aria-hidden="true"
          />
          <template v-for="day in month.days" :key="day.date">
            <button
              v-if="day.events.length"
              type="button"
              class="calendar-day has-event"
              :aria-label="day.accessibleLabel"
              :aria-controls="`${id}-day-${day.date}`"
              @click="jumpToDate(day.date)"
            >
              {{ day.day }}
            </button>
            <time
              v-else
              class="calendar-day"
              :datetime="day.date"
              :aria-label="day.accessibleLabel"
            >
              {{ day.day }}
            </time>
          </template>
        </div>
      </div>

      <div
        class="calendar-agenda"
        tabindex="0"
        role="region"
        :aria-label="`${month.label}日程列表`"
      >
        <h4>
          {{ formatText(`当月日程 · ${formatNumber(month.eventCount)}项`) }}
        </h4>
        <ol>
          <li
            v-for="day in month.agenda"
            :id="`${id}-day-${day.date}`"
            :key="day.date"
            tabindex="-1"
          >
            <time :datetime="day.date">
              <strong>{{ String(day.day).padStart(2, "0") }}</strong>
              <span>{{ formatText(`${day.month}月 · ${day.weekday}`) }}</span>
            </time>
            <div>
              <p v-for="(event, index) in day.events" :key="index">
                {{ event.text }}
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>
  </section>
</template>

<style scoped src="./weekend-calendar.css"></style>
