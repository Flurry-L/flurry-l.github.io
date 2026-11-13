// @vitest-environment jsdom
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import ActivityCalendar from "../src/features/activity-calendar/ActivityCalendar.vue";
import { provideTheme } from "../src/composables/useTheme";

enableAutoUnmount(afterEach);
const events = [
  { date: "2026-02-08", text: "February record" },
  { date: "2026-02-08", text: "Another February record" },
  { date: "2026-03-08", text: "March record" },
];
const Host = defineComponent({
  setup() {
    provideTheme();
    return () => h(ActivityCalendar, { events });
  },
});
beforeEach(() => {
  // jsdom does not implement layout observation.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it("shows only the hovered day's records and keeps the complete list collapsed", async () => {
  const wrapper = mount(Host, { attachTo: document.body });
  await nextTick();
  expect(wrapper.findAll(".id-2026-02-08 .vc-dot")).toHaveLength(1);
  expect(wrapper.find(".vc-popover-content").exists()).toBe(false);
  const details = wrapper.get("details");
  expect((details.element as HTMLDetailsElement).open).toBe(false);
  expect(details.findAll("li > p")).toHaveLength(3);

  await wrapper.get(".id-2026-02-08 .vc-day-content").trigger("mousemove");
  await flushPromises();
  const popover = wrapper.get(".vc-popover-content");
  expect(popover.get("time").text()).toBe("2026 年 2 月 8 日");
  expect(popover.findAll("li").map(item => item.text())).toEqual([
    "February record",
    "Another February record",
  ]);
  expect(popover.text()).not.toContain("March record");

  await details.get("summary").trigger("click");
  expect((details.element as HTMLDetailsElement).open).toBe(true);
  expect(details.text()).toContain("March record");
});

it("supports month navigation, keyboard focus, and Escape through VCalendar", async () => {
  const wrapper = mount(Host, { attachTo: document.body });
  await wrapper.get(".vc-next").trigger("click");
  await nextTick();
  expect(wrapper.get(".vc-title").text()).toBe("2026 年 3 月");
  (
    wrapper.get(".id-2026-03-08 .vc-day-content").element as HTMLElement
  ).focus();
  await flushPromises();
  expect(wrapper.get(".vc-popover-content").text()).toContain("March record");
  expect(wrapper.get(".vc-popover-content").text()).not.toContain(
    "February record"
  );
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  await vi.waitFor(() => {
    expect(wrapper.find(".vc-popover-content").exists()).toBe(false);
  });
});

it("hydrates the server-rendered month and activity dots without mismatches", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const container = document.createElement("div");
  container.innerHTML = await renderToString(createSSRApp(Host));
  expect(container.querySelectorAll("details li > p")).toHaveLength(3);
  expect(container.querySelector("details")?.open).toBe(false);
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
