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

  it("uses the same localized month labels for the range and month picker", () => {
    const calendar = buildWeekendCalendar([
      { date: "2026-02-08", text: "start" },
      { date: "2026-06-28", text: "end" },
    ]);

    expect(calendar.rangeLabel).toBe("2026 年 2 月 – 2026 年 6 月");
  });

  it("formats cross-year ranges and month labels", () => {
    const calendar = buildWeekendCalendar([
      { date: "2025-12-28", text: "start" },
      { date: "2026-01-03", text: "end" },
    ]);

    expect(calendar.rangeLabel).toBe("2025 年 12 月 – 2026 年 1 月");
    expect(calendar.months.map(month => month.label)).toEqual([
      "2025 年 12 月",
      "2026 年 1 月",
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
    expect(calendar.rangeLabel).toBe("2024 年 2 月");
    expect(february.days[28].accessibleLabel).toBe(
      "2024 年 2 月 29 日，1 个日程"
    );
  });
});
