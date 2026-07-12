export const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

export function toUtcDate({ year, month, day }: CalendarDateParts) {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

export function parseCalendarDate(value: string): CalendarDateParts {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) throw new TypeError(`Invalid calendar date: ${value}`);

  const [, yearValue, monthValue, dayValue] = match;
  const parts = {
    year: Number(yearValue),
    month: Number(monthValue),
    day: Number(dayValue),
  };
  const date = toUtcDate(parts);

  if (date.getUTCFullYear() !== parts.year
    || date.getUTCMonth() !== parts.month - 1
    || date.getUTCDate() !== parts.day) {
    throw new TypeError(`Invalid calendar date: ${value}`);
  }

  return parts;
}

export function isCalendarDate(value: string) {
  try {
    parseCalendarDate(value);
    return true;
  } catch {
    return false;
  }
}
