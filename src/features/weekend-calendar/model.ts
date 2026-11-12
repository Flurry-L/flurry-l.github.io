import type { WeekendCalendarEvent } from "../../types/post";
import { formatNumber, formatText } from "../../lib/format";

const monthFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  timeZone: "UTC",
});
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
  weekday: "short",
  timeZone: "UTC",
});

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

export function buildWeekendCalendar(
  events: readonly WeekendCalendarEvent[]
): WeekendCalendarModel {
  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const eventsByMonth = new Map<string, WeekendCalendarEvent[]>();
  for (const event of sortedEvents) {
    const key = event.date.slice(0, 7);
    const monthEvents = eventsByMonth.get(key) ?? [];
    monthEvents.push(event);
    eventsByMonth.set(key, monthEvents);
  }
  const months: CalendarMonth[] = [...eventsByMonth.entries()].map(
    ([key, monthEntries]) => {
      const [year, month] = key.split("-").map(Number);
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const firstDayOffset =
        (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
      const eventsByDate = new Map<string, WeekendCalendarEvent[]>();

      for (const event of monthEntries) {
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
            dayEvents.length > 0
              ? `，${formatNumber(dayEvents.length)}个日程`
              : "";

          return {
            date,
            day,
            events: dayEvents,
            accessibleLabel: formatText(
              dateFormatter.format(new Date(date)) + eventDescription
            ),
          };
        }
      );
      const agenda = [...eventsByDate.entries()].map(
        ([date, dayEvents]): CalendarAgendaDay => {
          const day = Number(date.slice(8));

          return {
            date,
            day,
            month,
            weekday: weekdayFormatter.format(new Date(date)),
            events: dayEvents,
          };
        }
      );

      return {
        key,
        year,
        month,
        label: formatText(monthFormatter.format(new Date(`${key}-01`))),
        firstDayOffset,
        days,
        agenda,
        eventCount: monthEntries.length,
      };
    }
  );

  return {
    months,
    rangeLabel:
      months.length > 1
        ? `${months[0].label} – ${months.at(-1)!.label}`
        : (months[0]?.label ?? ""),
    totalEvents: sortedEvents.length,
  };
}
