// @vitest-environment jsdom
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import PostDetailView from "../src/views/PostDetailView.vue";
import { scrollBehavior } from "../src/router";
import type { Post } from "../src/types/post";

vi.mock("virtual:pages", () => ({
  pages: { about: { title: "About", description: "", html: "" } },
}));
vi.mock("../src/lib/posts", () => ({ getAdjacentPosts: () => ({}) }));
vi.mock("../src/components/GiscusComments.vue", () => ({
  default: { template: "<div />" },
}));
vi.mock("../src/composables/useImageZoom", () => ({ useImageZoom: () => {} }));

enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("CSS", { escape: (value: string) => value });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.replaceChildren();
});

it.each(["中文-标题", "a%20b"])(
  "scrolls to the router's normalized anchor %s",
  async id => {
    const heading = document.createElement("h2");
    heading.id = id;
    document.body.append(heading);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: {} }],
    });
    await router.push({ path: "/", hash: `#${id}` });
    const to = router.currentRoute.value;
    expect(await scrollBehavior!(to, to, null)).toEqual({
      el: heading,
      top: 88,
      behavior: "smooth",
    });
  }
);

function makePost(slug: string): Post {
  return {
    slug,
    title: slug,
    pubDatetime: "2025-01-01T00:00:00Z",
    dateLabel: "2025年1月1日",
    archiveDate: "01-01",
    year: 2025,
    description: "",
    excerpt: "",
    tags: [],
    wordCount: 3,
    readingMinutes: 1,
    weekendCalendar: null,
    html: `<h2 id="${slug}-a">A</h2><p>Paragraph</p><h2 id="${slug}-b">B</h2><h3 id="${slug}-c">C</h3>`,
    toc: ["a", "b", "c"].map(id => ({
      id: `${slug}-${id}`,
      text: id,
      depth: id === "c" ? 3 : 2,
    })),
  };
}

it("reuses heading nodes, throttles scrolling, and refreshes them when the article changes", async () => {
  const positions: Record<string, number> = {
    "first-a": 100,
    "first-b": 300,
    "first-c": 500,
    "second-a": 80,
    "second-b": 300,
    "second-c": 500,
  };
  const measure = vi
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockImplementation(function (this: HTMLElement) {
      return { top: positions[this.id] ?? 0 } as DOMRect;
    });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/posts/:slug", component: {} }],
  });
  router.beforeResolve(to => {
    to.meta.post =
      to.params.slug === "missing"
        ? undefined
        : makePost(String(to.params.slug));
  });
  await router.push("/posts/first");
  const actions = document.createElement("div");
  actions.id = "floating-actions";
  document.body.append(actions);
  const wrapper = mount(PostDetailView, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  // jsdom does not implement the dialog methods.
  (wrapper.get("dialog").element as HTMLDialogElement).close = vi.fn();
  await nextTick();
  expect(
    wrapper.get('aside [aria-current="location"]').attributes("href")
  ).toBe("#first-a");
  const query = vi.spyOn(wrapper.get(".prose").element, "querySelectorAll");
  measure.mockClear();
  for (let i = 0; i < 20; i++) window.dispatchEvent(new Event("scroll"));
  expect(measure).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(100);
  expect(measure).toHaveBeenCalledTimes(4);
  expect(query).not.toHaveBeenCalled();

  positions["first-b"] = 80; // Layout can shift after an image loads.
  window.dispatchEvent(new Event("scroll"));
  await vi.advanceTimersByTimeAsync(100);
  expect(
    wrapper.get('aside [aria-current="location"]').attributes("href")
  ).toBe("#first-b");

  await router.push("/posts/second");
  await nextTick();
  expect(
    wrapper.get('aside [aria-current="location"]').attributes("href")
  ).toBe("#second-a");
  await router.push("/posts/missing");
  await nextTick();
  measure.mockClear();
  window.dispatchEvent(new Event("scroll"));
  await vi.advanceTimersByTimeAsync(100);
  expect(measure).not.toHaveBeenCalled();

  wrapper.unmount();
  window.dispatchEvent(new Event("scroll"));
  await vi.runAllTimersAsync();
  expect(measure).not.toHaveBeenCalled();
});
