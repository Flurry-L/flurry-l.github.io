// @vitest-environment jsdom
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import MarkdownContent from "../src/components/MarkdownContent.vue";

const writeText = vi.fn();
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.useFakeTimers();
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});
afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "clipboard");
  document.body.replaceChildren();
});

const markup = (text: string) =>
  `<div class="code-block"><pre><code>${text}</code></pre><button class="code-copy-button"></button><span role="status"></span></div><img src="/photo.jpg" alt="Photo">`;

it("keeps copy and keyboard image access working when rendered Markdown changes", async () => {
  const wrapper = mount(MarkdownContent, {
    props: { html: markup("first") },
    attachTo: document.body,
  });
  await nextTick();
  await wrapper.get("button").trigger("click");
  expect(writeText).toHaveBeenCalledWith("first");
  expect(wrapper.get('[role="status"]').text()).toBe("已复制");
  expect(wrapper.get("img").attributes("tabindex")).toBe("0");
  expect(wrapper.get("img").attributes("aria-label")).toBe("放大图片：Photo");

  await wrapper.setProps({ html: markup("second") });
  await wrapper.get("button").trigger("click");
  expect(writeText).toHaveBeenLastCalledWith("second");
  expect(wrapper.get("img").attributes("tabindex")).toBe("0");
  await vi.advanceTimersByTimeAsync(1500);
  expect(wrapper.get('[role="status"]').text()).toBe("");
});

it("reports an actual clipboard denial", async () => {
  writeText.mockRejectedValueOnce(new Error("Clipboard denied"));
  const wrapper = mount(MarkdownContent, {
    props: { html: markup("code") },
    attachTo: document.body,
  });
  await nextTick();
  await wrapper.get("button").trigger("click");
  expect(wrapper.get('[role="status"]').text()).toBe("复制失败");
});
