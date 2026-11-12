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
export const CALENDAR_DATE_PATTERN: RegExp;
export function toUtcDate(parts: CalendarDateParts): Date;
export function parseCalendarDate(value: string): CalendarDateParts;
export function parseWeekendCalendar(input: unknown): WeekendCalendarInput;
