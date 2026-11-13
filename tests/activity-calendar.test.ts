// @vitest-environment jsdom
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import ActivityCalendar from "../src/features/activity-calendar/ActivityCalendar.vue";
import { provideTheme } from "../src/composables/useTheme";

enableAutoUnmount(afterEach);
const events = [
  { date: "2026-02-08", text: "February record" },
  { date: "2026-03-08", text: "March record" },
];
const Host = defineComponent({
  setup() {
    provideTheme();
    return () => h(ActivityCalendar, { events });
  },
});
const scroll = vi.fn();
beforeEach(() => {
  // jsdom does not implement layout observation or scrolling.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
  );
  scroll.mockReset();
  HTMLElement.prototype.scrollIntoView = scroll;
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  document.body.replaceChildren();
});

it("marks activity dates, switches the agenda with the month, and focuses a clicked record", async () => {
  const wrapper = mount(Host, { attachTo: document.body });
  await nextTick();
  expect(wrapper.find(".id-2026-02-08 .vc-dot").exists()).toBe(true);
  expect(wrapper.get('ol[aria-label="2026 年 2 月行动记录"]').isVisible()).toBe(
    true
  );
  expect(wrapper.get('ol[aria-label="2026 年 3 月行动记录"]').isVisible()).toBe(
    false
  );
  await wrapper.get(".vc-next").trigger("click");
  await nextTick();
  expect(wrapper.get('ol[aria-label="2026 年 2 月行动记录"]').isVisible()).toBe(
    false
  );
  expect(wrapper.get('ol[aria-label="2026 年 3 月行动记录"]').isVisible()).toBe(
    true
  );
  await wrapper.get(".id-2026-03-08 .vc-day-content").trigger("click");
  expect(document.activeElement?.textContent).toContain("March record");
  expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
  for (const key of ["Enter", " "]) {
    const date = wrapper.get(".id-2026-03-08 .vc-day-content");
    (date.element as HTMLElement).focus();
    await date.trigger("keydown", { key });
    expect(document.activeElement?.textContent).toContain("March record");
  }
});

it("hydrates the server-rendered month and activity dots without mismatches", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const container = document.createElement("div");
  container.innerHTML = await renderToString(createSSRApp(Host));
  document.body.append(container);
  const app = createSSRApp(Host);
  try {
    app.mount(container);
    await nextTick();
    expect(container.querySelector(".id-2026-02-08 .vc-dot")).not.toBeNull();
    expect(
      [...warn.mock.calls, ...error.mock.calls].flat().join(" ")
    ).not.toMatch(/hydration|mismatch/i);
  } finally {
    app.unmount();
  }
});
