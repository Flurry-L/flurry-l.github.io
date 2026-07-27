<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
  type ComponentPublicInstance,
  type PropType,
} from "vue";

import { buildWeekendCalendar } from "./model";
import type { WeekendCalendarEvent } from "./schema";

const props = defineProps({
  summary: { type: String, required: true },
  events: { type: Array as PropType<WeekendCalendarEvent[]>, required: true },
  instanceId: { type: String, default: undefined },
});
const model = computed(() => buildWeekendCalendar(props.events));
const generatedId = useId();
const idPrefix = computed(() => {
  const source = props.instanceId?.trim() || generatedId;
  const safeId = source
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `weekend-calendar-${safeId || "instance"}`;
});
const selectedMonthKey = ref(model.value.months[0]?.key ?? "");
const expandedMonths = ref(new Set<string>());
const overflowingMonths = ref(new Set<string>());
const highlightedDate = ref<string>();
const rootElement = ref<HTMLElement>();
const tabElements = new Map<string, HTMLButtonElement>();
const panelElements = new Map<string, HTMLElement>();
const monthElements = new Map<string, HTMLElement>();
const agendaElements = new Map<string, HTMLElement>();
const agendaItemElements = new Map<string, HTMLElement>();
const queuedFrames = new Set<number>();
let resizeObserver: ResizeObserver | undefined;
let highlightTimer: ReturnType<typeof window.setTimeout> | undefined;
let mounted = false;

function tabId(monthKey: string) {
  return `${idPrefix.value}-tab-${monthKey}`;
}

function panelId(monthKey: string) {
  return `${idPrefix.value}-panel-${monthKey}`;
}

function agendaId(monthKey: string) {
  return `${idPrefix.value}-agenda-${monthKey}`;
}

function agendaItemId(date: string) {
  return `${idPrefix.value}-agenda-item-${date}`;
}

function setElement<T extends HTMLElement>(
  elements: Map<string, T>,
  key: string,
  element: Element | ComponentPublicInstance | null
) {
  if (element instanceof HTMLElement) elements.set(key, element as T);
  else elements.delete(key);
}

function isExpanded(monthKey: string) {
  return expandedMonths.value.has(monthKey);
}

function canToggleAgenda(monthKey: string) {
  return overflowingMonths.value.has(monthKey) || isExpanded(monthKey);
}

function replaceSetValue(source: Set<string>, value: string, present: boolean) {
  const next = new Set(source);
  if (present) next.add(value);
  else next.delete(value);
  return next;
}

function refreshAgenda(monthKey: string) {
  if (!mounted) return;

  const panel = panelElements.get(monthKey);
  const month = monthElements.get(monthKey);
  const viewport = agendaElements.get(monthKey);
  if (!panel || !month || !viewport) return;

  const monthHeight = month.getBoundingClientRect().height;
  if (monthHeight > 0)
    panel.style.setProperty("--calendar-month-height", `${monthHeight}px`);
  if (isExpanded(monthKey)) {
    overflowingMonths.value = replaceSetValue(
      overflowingMonths.value,
      monthKey,
      true
    );
    return;
  }

  const overflows = viewport.scrollHeight > viewport.clientHeight + 1;
  overflowingMonths.value = replaceSetValue(
    overflowingMonths.value,
    monthKey,
    overflows
  );
}

function queueAgendaRefresh(monthKey: string) {
  if (!mounted) return;

  const frame = window.requestAnimationFrame(() => {
    queuedFrames.delete(frame);
    refreshAgenda(monthKey);
  });
  queuedFrames.add(frame);
}

async function selectMonth(monthKey: string, moveFocus = false) {
  selectedMonthKey.value = monthKey;
  await nextTick();
  if (moveFocus) tabElements.get(monthKey)?.focus();
  queueAgendaRefresh(monthKey);
}

function handleTabKeydown(event: KeyboardEvent, index: number) {
  const months = model.value.months;
  let nextIndex: number | undefined;

  if (event.key === "ArrowRight") nextIndex = (index + 1) % months.length;
  if (event.key === "ArrowLeft")
    nextIndex = (index - 1 + months.length) % months.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = months.length - 1;
  if (nextIndex === undefined) return;

  event.preventDefault();
  void selectMonth(months[nextIndex].key, true);
}

async function toggleAgenda(monthKey: string) {
  const expanded = !isExpanded(monthKey);
  expandedMonths.value = replaceSetValue(
    expandedMonths.value,
    monthKey,
    expanded
  );
  await nextTick();

  const viewport = agendaElements.get(monthKey);
  if (!expanded && viewport) viewport.scrollTop = 0;
  queueAgendaRefresh(monthKey);
}

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function jumpToDate(monthKey: string, date: string) {
  const viewport = agendaElements.get(monthKey);
  const target = agendaItemElements.get(date);
  if (!viewport || !target) return;

  const behavior = preferredScrollBehavior();
  if (!isExpanded(monthKey)) {
    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top =
      viewport.scrollTop +
      targetRect.top -
      viewportRect.top -
      Math.max(0, (viewport.clientHeight - targetRect.height) / 2);
    viewport.scrollTo({ top: Math.max(0, top), behavior });
  } else {
    target.scrollIntoView({ behavior, block: "center" });
  }

  target.focus({ preventScroll: true });
  highlightedDate.value = date;
  if (highlightTimer !== undefined) window.clearTimeout(highlightTimer);
  highlightTimer = window.setTimeout(() => {
    if (highlightedDate.value === date) highlightedDate.value = undefined;
  }, 1600);
}

watch(
  () => model.value.months.map(month => month.key).join(","),
  () => {
    if (
      !model.value.months.some(month => month.key === selectedMonthKey.value)
    ) {
      selectedMonthKey.value = model.value.months[0]?.key ?? "";
    }
    if (mounted && selectedMonthKey.value) {
      void nextTick(() => queueAgendaRefresh(selectedMonthKey.value));
    }
  }
);

onMounted(() => {
  mounted = true;
  if (selectedMonthKey.value) queueAgendaRefresh(selectedMonthKey.value);

  void document.fonts?.ready.then(() => {
    if (mounted && selectedMonthKey.value)
      queueAgendaRefresh(selectedMonthKey.value);
  });

  if ("ResizeObserver" in window && rootElement.value) {
    resizeObserver = new ResizeObserver(() => {
      if (selectedMonthKey.value) queueAgendaRefresh(selectedMonthKey.value);
    });
    resizeObserver.observe(rootElement.value);
  }
});

onBeforeUnmount(() => {
  mounted = false;
  resizeObserver?.disconnect();
  for (const frame of queuedFrames) window.cancelAnimationFrame(frame);
  queuedFrames.clear();
  if (highlightTimer !== undefined) window.clearTimeout(highlightTimer);
});
</script>

<template>
  <section
    ref="rootElement"
    class="weekend-calendar"
    aria-label="周末日程"
    data-floating-controls-clear
  >
    <div v-if="model.months.length > 0" class="calendar-frame">
      <div
        class="calendar-tabs"
        role="tablist"
        aria-label="选择月份"
        aria-orientation="horizontal"
      >
        <button
          v-for="(month, index) in model.months"
          :id="tabId(month.key)"
          :key="month.key"
          :ref="element => setElement(tabElements, month.key, element)"
          type="button"
          role="tab"
          :aria-label="month.label"
          :aria-selected="selectedMonthKey === month.key"
          :aria-controls="panelId(month.key)"
          :tabindex="selectedMonthKey === month.key ? 0 : -1"
          @click="selectMonth(month.key)"
          @keydown="handleTabKeydown($event, index)"
        >
          {{ month.shortLabel }}
        </button>
      </div>

      <div class="calendar-panels">
        <section
          v-for="month in model.months"
          :id="panelId(month.key)"
          :key="month.key"
          :ref="element => setElement(panelElements, month.key, element)"
          class="calendar-panel"
          role="tabpanel"
          :aria-labelledby="tabId(month.key)"
          :hidden="selectedMonthKey !== month.key"
        >
          <div
            :ref="element => setElement(monthElements, month.key, element)"
            class="calendar-month"
          >
            <header>
              <strong>{{ month.label }}</strong>
              <span>{{ month.eventCount }} 个日程</span>
            </header>

            <div class="calendar-weekdays" aria-hidden="true">
              <span
                v-for="weekday in ['一', '二', '三', '四', '五', '六', '日']"
                :key="weekday"
              >
                {{ weekday }}
              </span>
            </div>

            <div class="calendar-days">
              <span
                v-for="offset in month.firstDayOffset"
                :key="`empty-${offset}`"
                class="calendar-day is-empty"
                aria-hidden="true"
              />
              <template v-for="day in month.days" :key="day.date">
                <button
                  v-if="day.events.length > 0"
                  class="calendar-day has-event"
                  type="button"
                  :aria-label="day.accessibleLabel"
                  :aria-controls="agendaItemId(day.date)"
                  @click="jumpToDate(month.key, day.date)"
                >
                  <time :datetime="day.date">{{ day.day }}</time>
                  <span aria-hidden="true" />
                </button>
                <time v-else class="calendar-day" :datetime="day.date">
                  <span aria-hidden="true">{{ day.day }}</span>
                  <span class="sr-only">{{ day.accessibleLabel }}</span>
                </time>
              </template>
            </div>
          </div>

          <div class="calendar-agenda" :data-expanded="isExpanded(month.key)">
            <header>
              <h4>当月日程</h4>
              <div class="calendar-agenda-actions">
                <span>{{ month.eventCount }} 项</span>
                <button
                  v-show="canToggleAgenda(month.key)"
                  type="button"
                  :aria-expanded="isExpanded(month.key)"
                  :aria-controls="agendaId(month.key)"
                  @click="toggleAgenda(month.key)"
                >
                  {{ isExpanded(month.key) ? "收起列表" : "展开全部" }}
                </button>
              </div>
            </header>
            <div
              :id="agendaId(month.key)"
              :ref="element => setElement(agendaElements, month.key, element)"
              class="calendar-agenda-scroll"
              role="region"
              :aria-label="`${month.label}日程列表`"
              :tabindex="
                !isExpanded(month.key) && overflowingMonths.has(month.key)
                  ? 0
                  : -1
              "
              :data-expanded="isExpanded(month.key)"
            >
              <ol>
                <li
                  v-for="day in month.agenda"
                  :id="agendaItemId(day.date)"
                  :key="day.date"
                  :ref="
                    element => setElement(agendaItemElements, day.date, element)
                  "
                  :class="{ 'is-highlighted': highlightedDate === day.date }"
                  tabindex="-1"
                >
                  <time :datetime="day.date">
                    <strong>{{ String(day.day).padStart(2, "0") }}</strong>
                    <span>{{ day.month }} 月 · {{ day.weekday }}</span>
                  </time>
                  <div>
                    <p
                      v-for="(event, eventIndex) in day.events"
                      :key="eventIndex"
                    >
                      {{ event.text }}
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped src="./weekend-calendar.css"></style>
