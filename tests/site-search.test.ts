// @vitest-environment jsdom
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import SiteSearch from "../src/components/SiteSearch.vue";

const engine = vi.hoisted(() => ({
  filters: vi.fn(async () => ({})),
  search: vi.fn(async () => ({ results: [], unfilteredTotalCount: 0 })),
}));
vi.mock("/pagefind/pagefind.js", () => ({ createInstance: () => engine }));

// jsdom does not implement native modal behavior.
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  if (!this.open) return;
  this.open = false;
  this.dispatchEvent(new Event("close"));
};

enableAutoUnmount(afterEach);
beforeEach(() => vi.clearAllMocks());
afterEach(() => document.body.replaceChildren());

async function mountSearch(base = "/") {
  const router = createRouter({
    history: createMemoryHistory(base),
    routes: [{ path: "/:pathMatch(.*)*", component: { template: "<div />" } }],
  });
  await router.push("/");
  const wrapper = mount(SiteSearch, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  await vi.waitFor(() => expect(wrapper.find("input").exists()).toBe(true));
  return { router, wrapper };
}

it("uses the official shortcut, retains searches, and closes on navigation", async () => {
  const { router, wrapper } = await mountSearch();
  const trigger = wrapper.get("pagefind-modal-trigger button");
  expect(trigger.attributes("aria-label")).toBe("搜索");
  expect(wrapper.find(".pf-trigger-shortcut").exists()).toBe(false);
  expect(wrapper.find(".pf-trigger-text").exists()).toBe(false);
  const shortcut = trigger.attributes("aria-keyshortcuts")!;
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: shortcut.includes("Control"),
      metaKey: shortcut.includes("Meta"),
      bubbles: true,
    })
  );
  expect(wrapper.get("dialog").element.open).toBe(true);
  const input = wrapper.get("input");
  await vi.waitFor(() => expect(document.activeElement).toBe(input.element));
  await input.setValue("Vue");
  await vi.waitFor(() =>
    expect(engine.search).toHaveBeenCalledWith("Vue", expect.anything())
  );

  await input.trigger("keydown", { key: "Escape" });
  expect(wrapper.get("dialog").element.open).toBe(false);
  expect(document.activeElement).toBe(trigger.element);
  await trigger.trigger("click");
  expect(wrapper.get("input").element).toBe(input.element);
  expect(input.element.value).toBe("Vue");
  await router.push("/about");
  expect(wrapper.get("dialog").element.open).toBe(false);
});

it.each(["/", "/blog/"])(
  "routes result clicks under %s and preserves modified clicks",
  async base => {
    const { router, wrapper } = await mountSearch(base);
    const navigate = vi.spyOn(router, "push");
    wrapper.get("pagefind-results").element.innerHTML =
      `<a href="${base}posts/example?q=vue#heading"><span>Example</span></a>`;
    const link = wrapper.get("pagefind-results a span");
    let intercepted = false;
    document.addEventListener(
      "click",
      event => {
        intercepted = event.defaultPrevented;
        event.preventDefault(); // Prevent jsdom's default navigation.
      },
      { once: true }
    );
    await link.trigger("click", { ctrlKey: true });
    expect(intercepted).toBe(false);
    expect(navigate).not.toHaveBeenCalled();

    await link.trigger("click");
    expect(navigate).toHaveBeenCalledWith("/posts/example?q=vue#heading");
  }
);
