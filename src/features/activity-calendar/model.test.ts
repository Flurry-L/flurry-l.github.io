import { describe, expect, it } from "vitest";

import { groupActivityMonths } from "./model";

describe("groupActivityMonths", () => {
  it("sorts months and days while preserving same-day record order", () => {
    const months = groupActivityMonths([
      { date: "2026-03-08", text: "second date" },
      { date: "2026-02-01", text: "first date" },
      { date: "2026-03-08", text: "same date, later source item" },
    ]);
    expect(months.map(month => month.key)).toEqual(["2026-02", "2026-03"]);
    expect(months[1].days[0].records.map(record => record.text)).toEqual([
      "second date",
      "same date, later source item",
    ]);
  });

  it("formats cross-year labels and leap-day records in UTC", () => {
    const months = groupActivityMonths([
      { date: "2023-12-31", text: "end of year" },
      { date: "2024-02-29", text: "leap day" },
    ]);
    expect(months.map(month => month.label)).toEqual([
      "2023 年 12 月",
      "2024 年 2 月",
    ]);
    expect(months[1].days[0].label).toBe("2 月 29 日");
    expect(months[1].days[0].date).toBe("2024-02-29");
  });
});
