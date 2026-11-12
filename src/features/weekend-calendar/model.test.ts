import { describe, expect, it } from "vitest";

import { buildWeekendCalendar } from "./model";

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

    expect(calendar.rangeLabel).toBe("2026年2月至6月");
  });

  it("formats cross-year ranges and month labels", () => {
    const calendar = buildWeekendCalendar([
      { date: "2025-12-28", text: "start" },
      { date: "2026-01-03", text: "end" },
    ]);

    expect(calendar.rangeLabel).toBe("2025年12月至2026年1月");
    expect(calendar.months.map(month => month.label)).toEqual([
      "2025年12月",
      "2026年1月",
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
