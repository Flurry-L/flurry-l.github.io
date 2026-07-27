import { describe, expect, it } from "vitest";

import { parseCalendarDate } from "./date";
import { buildWeekendCalendar } from "./model";
import { parseWeekendCalendar } from "./schema";

describe("buildWeekendCalendar", () => {
  it("sorts events and preserves source order for events on the same date", () => {
    const calendar = buildWeekendCalendar([
      { date: "2026-03-08", text: "second date" },
      { date: "2026-02-01", text: "first date" },
      { date: "2026-03-08", text: "same date, later source item" },
    ]);

    expect(calendar.months.map(month => month.key)).toEqual([
      "2026-02",
      "2026-03",
    ]);
    expect(
      calendar.months[1].agenda[0].events.map(event => event.text)
    ).toEqual(["second date", "same date, later source item"]);
    expect(calendar.totalEvents).toBe(3);
  });

  it("formats a range within one year without repeating the year", () => {
    const calendar = buildWeekendCalendar([
      { date: "2026-02-08", text: "start" },
      { date: "2026-06-28", text: "end" },
    ]);

    expect(calendar.rangeLabel).toBe("2026 年 2 月至 6 月");
    expect(calendar.months.map(month => month.shortLabel)).toEqual([
      "2 月",
      "6 月",
    ]);
  });

  it("formats cross-year ranges and disambiguates their tabs", () => {
    const calendar = buildWeekendCalendar([
      { date: "2025-12-28", text: "start" },
      { date: "2026-01-03", text: "end" },
    ]);

    expect(calendar.rangeLabel).toBe("2025 年 12 月至 2026 年 1 月");
    expect(calendar.months.map(month => month.shortLabel)).toEqual([
      "2025 / 12",
      "2026 / 1",
    ]);
  });

  it("builds leap-year days and a Monday-first offset using UTC", () => {
    const calendar = buildWeekendCalendar([
      { date: "2024-02-29", text: "leap day" },
    ]);
    const [february] = calendar.months;

    expect(february.days).toHaveLength(29);
    expect(february.firstDayOffset).toBe(3);
    expect(february.agenda[0].weekday).toBe("周四");
  });
});

describe("calendar input validation", () => {
  it("rejects impossible dates and blank copy", () => {
    expect(() => parseCalendarDate("2025-02-29")).toThrow(
      "Invalid calendar date"
    );
    expect(() =>
      parseWeekendCalendar({
        summary: " ",
        events: [{ date: "2025-02-29", text: "" }],
      })
    ).toThrow(TypeError);
  });

  it("normalizes surrounding whitespace in authored copy", () => {
    const result = parseWeekendCalendar({
      summary: " summary ",
      events: [{ date: "2026-07-12", text: " event " }],
    });

    expect(result).toEqual({
      summary: "summary",
      events: [{ date: "2026-07-12", text: "event" }],
    });
  });
});
