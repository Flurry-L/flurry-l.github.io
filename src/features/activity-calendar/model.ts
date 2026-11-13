import { groupBy } from "es-toolkit/array";

import { formatText } from "../../lib/format";
import type { ActivityCalendarEvent } from "../../types/post";

const monthFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  timeZone: "UTC",
});
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export function groupActivityMonths(events: readonly ActivityCalendarEvent[]) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  return Object.entries(groupBy(sorted, event => event.date.slice(0, 7))).map(
    ([key, entries]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        key,
        year,
        month,
        label: formatText(monthFormatter.format(new Date(`${key}-01`))),
        days: Object.entries(groupBy(entries, event => event.date)).map(
          ([date, records]) => ({
            date,
            label: formatText(dateFormatter.format(new Date(date))),
            records,
          })
        ),
      };
    }
  );
}
