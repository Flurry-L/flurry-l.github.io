export interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

export interface WeekendCalendarEvent {
  date: string;
  text: string;
}

export interface WeekendCalendarInput {
  summary: string;
  events: WeekendCalendarEvent[];
}

export const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toUtcDate({ year, month, day }: CalendarDateParts) {
  return new Date(Date.UTC(year, month - 1, day));
}

export function parseCalendarDate(value: string): CalendarDateParts {
  if (typeof value !== "string")
    throw new TypeError("Calendar date must be a string");
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) throw new TypeError(`Invalid calendar date: ${value}`);

  const [, yearValue, monthValue, dayValue] = match;
  const parts = {
    year: Number(yearValue),
    month: Number(monthValue),
    day: Number(dayValue),
  };
  const date = toUtcDate(parts);

  if (
    date.getUTCFullYear() !== parts.year ||
    date.getUTCMonth() !== parts.month - 1 ||
    date.getUTCDate() !== parts.day
  ) {
    throw new TypeError(`Invalid calendar date: ${value}`);
  }

  return parts;
}

export function parseWeekendCalendar(input: unknown): WeekendCalendarInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("Calendar must be an object");
  }

  const { summary, events } = input as Record<string, unknown>;

  if (typeof summary !== "string" || summary.trim() === "") {
    throw new TypeError("Calendar summary cannot be empty");
  }
  if (!Array.isArray(events) || events.length === 0) {
    throw new TypeError("Calendar must contain an event");
  }

  return {
    summary: summary.trim(),
    events: events.map(event => {
      if (typeof event !== "object" || event === null || Array.isArray(event)) {
        throw new TypeError("Calendar event must be an object");
      }
      const { date, text } = event as Record<string, unknown>;
      if (typeof date !== "string")
        throw new TypeError("Calendar date must be a string");
      parseCalendarDate(date);
      if (typeof text !== "string" || text.trim() === "") {
        throw new TypeError("Calendar event text cannot be empty");
      }
      return { date, text: text.trim() };
    }),
  };
}
