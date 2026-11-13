// @vitest-environment jsdom
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createSSRApp, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
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
let desktop = true;
const mediaListeners = new Set<(event: { matches: boolean }) => void>();
beforeEach(() => {
  vi.useFakeTimers();
  desktop = true;
  mediaListeners.clear();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query.includes("min-width") && desktop;
    },
    addEventListener: (
      _: string,
      callback: (event: { matches: boolean }) => void
    ) => mediaListeners.add(callback),
    removeEventListener: (
      _: string,
      callback: (event: { matches: boolean }) => void
    ) => mediaListeners.delete(callback),
  }));
  document.documentElement.scrollTop = 0;
  Object.defineProperties(document.documentElement, {
    scrollHeight: { configurable: true, value: 2000 },
    offsetHeight: { configurable: true, value: 2000 },
    clientHeight: { configurable: true, value: 768 },
  });
  // jsdom does not implement the native dialog methods.
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement
  ) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  for (const key of ["scrollHeight", "offsetHeight", "clientHeight"]) {
    Reflect.deleteProperty(document.documentElement, key);
  }
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
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
    dateLabel: "2025 年 1 月 1 日",
    archiveDate: "01-01",
    year: 2025,
    description: "",
    excerpt: "",
    tags: [],
    wordCount: 1234,
    readingMinutes: 4,
    activityCalendar: null,
    html: `<h2 id="${slug}-a">A</h2><p>Paragraph</p><h2 id="${slug}-b">B</h2><h3 id="${slug}-c">C</h3>`,
    toc: ["a", "b", "c"].map(id => ({
      id: `${slug}-${id}`,
      text: id.toUpperCase(),
      depth: id === "c" ? 3 : 2,
    })),
  };
}

async function preparePage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: {} },
      { path: "/posts/:slug", component: {} },
    ],
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
  return router;
}

it("lets Tocbot build nested links, track scrolling, and refresh on article navigation", async () => {
  vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(
    function (this: HTMLElement) {
      const id = this.classList.contains("toc-list-item")
        ? this.querySelector("a")?.getAttribute("href")
        : this.id;
      return { a: 100, b: 300, c: 500 }[id?.at(-1) as "a" | "b" | "c"] ?? 0;
    }
  );
  const router = await preparePage();
  const previousHashChange = window.onhashchange;
  const previousScrollEnd = window.onscrollend;
  const wrapper = mount(PostDetailView, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  await nextTick();
  await vi.advanceTimersByTimeAsync(60);
  expect(wrapper.findAll('nav[aria-label="文章目录"]')).toHaveLength(1);
  expect(wrapper.get("header").text()).toContain("1,234 字 · 约 4 分钟阅读");
  expect(wrapper.get(".toc .toc-list .toc-list a").attributes("href")).toBe(
    "#first-c"
  );
  expect(
    wrapper.get('aside [aria-current="location"]').attributes("href")
  ).toBe("#first-a");
  expect(wrapper.text()).not.toContain("关闭目录");

  const scrollingToc = wrapper.get(".toc").element as HTMLElement;
  Object.defineProperties(scrollingToc, {
    scrollHeight: { value: 600 },
    clientHeight: { value: 100 },
  });
  document.documentElement.scrollTop = 250;
  document.dispatchEvent(new Event("scroll"));
  await vi.advanceTimersByTimeAsync(60);
  expect(
    wrapper.get('aside [aria-current="location"]').attributes("href")
  ).toBe("#first-b");
  expect(scrollingToc.scrollTop).toBe(270);
  expect(document.documentElement.scrollTop).toBe(250);
  await wrapper.get('.toc a[href="#first-c"]').trigger("click");
  await flushPromises();
  expect(router.currentRoute.value.hash).toBe("#first-c");
  expect(HTMLDialogElement.prototype.close).toHaveBeenCalledOnce();

  document.documentElement.scrollTop = 0;
  await router.push("/posts/second");
  await nextTick();
  await vi.advanceTimersByTimeAsync(60);
  expect(
    wrapper.get('aside [aria-current="location"]').attributes("href")
  ).toBe("#second-a");
  expect(wrapper.find('.toc a[href="#first-a"]').exists()).toBe(false);
  await router.push("/posts/missing");
  expect(wrapper.find("aside").exists()).toBe(false);
  expect(wrapper.find("dialog").exists()).toBe(false);
  expect(window.onhashchange).toBe(previousHashChange);
  expect(window.onscrollend).toBe(previousScrollEnd);
  await vi.runAllTimersAsync();
});

it("moves the same TOC into the mobile dialog and closes it on navigation or outside click", async () => {
  const router = await preparePage();
  const wrapper = mount(PostDetailView, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  await nextTick();
  await vi.advanceTimersByTimeAsync(60);
  const nav = wrapper.get('nav[aria-label="文章目录"]').element;
  desktop = false;
  mediaListeners.forEach(callback => callback({ matches: desktop }));
  await nextTick();
  const dialog = wrapper.get("dialog");
  expect(dialog.element.contains(nav)).toBe(true);
  expect(wrapper.findAll('nav[aria-label="文章目录"]')).toHaveLength(1);
  const button = document.querySelector<HTMLButtonElement>(
    'button[aria-label="打开目录"]'
  )!;
  button.click();
  await vi.advanceTimersByTimeAsync(60);
  expect((dialog.element as HTMLDialogElement).open).toBe(true);
  await dialog.get("nav").trigger("click");
  expect((dialog.element as HTMLDialogElement).open).toBe(true);
  await dialog.trigger("click");
  expect((dialog.element as HTMLDialogElement).open).toBe(false);
  button.click();
  await dialog.get('.toc a[href="#first-b"]').trigger("click");
  await flushPromises();
  expect(router.currentRoute.value.hash).toBe("#first-b");
  expect((dialog.element as HTMLDialogElement).open).toBe(false);
  desktop = true;
  mediaListeners.forEach(callback => callback({ matches: desktop }));
  await nextTick();
  expect(wrapper.get("aside").element.contains(nav)).toBe(true);
});

it.each([true, false])(
  "hydrates the complete static TOC without mismatches on desktop=%s",
  async isDesktop => {
    const router = await preparePage();
    const createApp = () => createSSRApp(PostDetailView).use(router);
    const container = document.createElement("div");
    container.innerHTML = await renderToString(createApp());
    expect(container.querySelectorAll("aside a")).toHaveLength(3);
    document.body.append(container);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp();
    try {
      desktop = isDesktop;
      app.mount(container);
      await nextTick();
      await vi.advanceTimersByTimeAsync(60);
      expect(container.querySelectorAll(".toc a")).toHaveLength(3);
      expect(
        [...warn.mock.calls, ...error.mock.calls].flat().join(" ")
      ).not.toMatch(/hydration|mismatch/i);
    } finally {
      app.unmount();
    }
  }
);
