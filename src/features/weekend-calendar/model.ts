import type { WeekendCalendarEvent } from "./schema";
import { parseCalendarDate, toUtcDate } from "./date";

const WEEKDAY_NAMES = [
  "周日",
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
] as const;

export interface CalendarDay {
  date: string;
  day: number;
  events: WeekendCalendarEvent[];
  accessibleLabel: string;
}

export interface CalendarAgendaDay {
  date: string;
  day: number;
  month: number;
  weekday: string;
  events: WeekendCalendarEvent[];
}

export interface CalendarMonth {
  key: string;
  year: number;
  month: number;
  label: string;
  shortLabel: string;
  firstDayOffset: number;
  days: CalendarDay[];
  agenda: CalendarAgendaDay[];
  eventCount: number;
}

export interface WeekendCalendarModel {
  months: CalendarMonth[];
  rangeLabel: string;
  totalEvents: number;
}

function formatRange(first: CalendarMonth, last: CalendarMonth) {
  if (first.key === last.key) return `${first.year} 年 ${first.month} 月`;
  if (first.year === last.year)
    return `${first.year} 年 ${first.month} 月至 ${last.month} 月`;
  return `${first.year} 年 ${first.month} 月至 ${last.year} 年 ${last.month} 月`;
}

export function buildWeekendCalendar(
  events: readonly WeekendCalendarEvent[]
): WeekendCalendarModel {
  const sortedEvents = events
    .map((event, sourceIndex) => ({
      event,
      sourceIndex,
      parts: parseCalendarDate(event.date),
    }))
    .sort(
      (left, right) =>
        left.event.date.localeCompare(right.event.date) ||
        left.sourceIndex - right.sourceIndex
    );
  const eventsByMonth = new Map<string, typeof sortedEvents>();

  for (const entry of sortedEvents) {
    const key = entry.event.date.slice(0, 7);
    const monthEvents = eventsByMonth.get(key) ?? [];
    monthEvents.push(entry);
    eventsByMonth.set(key, monthEvents);
  }

  const spansYears =
    sortedEvents.length > 0 &&
    sortedEvents[0].parts.year !== sortedEvents.at(-1)?.parts.year;
  const months: CalendarMonth[] = [...eventsByMonth.entries()].map(
    ([key, monthEntries]) => {
      const { year, month } = monthEntries[0].parts;
      const daysInMonth = toUtcDate({
        year,
        month: month + 1,
        day: 0,
      }).getUTCDate();
      const firstDayOffset =
        (toUtcDate({ year, month, day: 1 }).getUTCDay() + 6) % 7;
      const eventsByDate = new Map<string, WeekendCalendarEvent[]>();

      for (const { event } of monthEntries) {
        const dayEvents = eventsByDate.get(event.date) ?? [];
        dayEvents.push(event);
        eventsByDate.set(event.date, dayEvents);
      }

      const days = Array.from(
        { length: daysInMonth },
        (_, index): CalendarDay => {
          const day = index + 1;
          const date = `${key}-${String(day).padStart(2, "0")}`;
          const dayEvents = eventsByDate.get(date) ?? [];
          const eventDescription =
            dayEvents.length > 0 ? `，${dayEvents.length} 个日程` : "";

          return {
            date,
            day,
            events: dayEvents,
            accessibleLabel: `${year} 年 ${month} 月 ${day} 日${eventDescription}`,
          };
        }
      );
      const agenda = [...eventsByDate.entries()].map(
        ([date, dayEvents]): CalendarAgendaDay => {
          const parts = parseCalendarDate(date);

          return {
            date,
            day: parts.day,
            month: parts.month,
            weekday: WEEKDAY_NAMES[toUtcDate(parts).getUTCDay()],
            events: dayEvents,
          };
        }
      );

      return {
        key,
        year,
        month,
        label: `${year} 年 ${month} 月`,
        shortLabel: spansYears ? `${year} / ${month}` : `${month} 月`,
        firstDayOffset,
        days,
        agenda,
        eventCount: monthEntries.length,
      };
    }
  );

  return {
    months,
    rangeLabel: months.length > 0 ? formatRange(months[0], months.at(-1)!) : "",
    totalEvents: sortedEvents.length,
  };
}
