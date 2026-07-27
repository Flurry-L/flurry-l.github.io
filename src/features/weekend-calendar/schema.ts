import { isCalendarDate } from "./date";

export interface WeekendCalendarEvent {
  date: string;
  text: string;
}

export interface WeekendCalendarInput {
  summary: string;
  events: WeekendCalendarEvent[];
}

/**
 * Validates weekend-calendar frontmatter data and normalizes authored copy
 * (trims surrounding whitespace). Throws a TypeError on invalid input.
 * Kept dependency-free; mirrored by the build-time validation in
 * vite/plugins/markdown.mjs.
 */
export function parseWeekendCalendar(input: unknown): WeekendCalendarInput {
  if (typeof input !== "object" || input === null) {
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
      if (typeof event !== "object" || event === null) {
        throw new TypeError("Calendar event must be an object");
      }
      const { date, text } = event as Record<string, unknown>;
      if (typeof date !== "string" || !isCalendarDate(date)) {
        throw new TypeError(`Invalid calendar date: ${String(date)}`);
      }
      if (typeof text !== "string" || text.trim() === "") {
        throw new TypeError("Calendar event text cannot be empty");
      }
      return { date, text: text.trim() };
    }),
  };
}
