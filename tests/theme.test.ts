// @vitest-environment jsdom
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { provideTheme, useTheme } from "../src/composables/useTheme";

const Consumer = {
  setup() {
    const { isDark, toggleTheme } = useTheme();
    return () =>
      h(
        "button",
        { onClick: () => toggleTheme() },
        isDark.value ? "dark" : "light"
      );
  },
};
const ThemeApp = defineComponent({
  setup() {
    provideTheme();
    return () => h(Consumer);
  },
});

let preference: MediaQueryList;
enableAutoUnmount(afterEach);
beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  preference = Object.assign(new EventTarget(), {
    matches: false,
    media: "(prefers-color-scheme: dark)",
  }) as MediaQueryList;
  vi.stubGlobal("matchMedia", () => preference);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

async function setSystemDark(matches: boolean) {
  Object.assign(preference, { matches });
  preference.dispatchEvent(Object.assign(new Event("change"), { matches }));
  await nextTick();
}

it("follows system changes until the reader chooses a different theme", async () => {
  const wrapper = mount(ThemeApp);
  await nextTick();
  expect(wrapper.text()).toBe("light");
  await setSystemDark(true);
  expect(wrapper.text()).toBe("dark");
  expect(document.documentElement.classList.contains("dark")).toBe(true);

  await wrapper.get("button").trigger("click");
  expect(wrapper.text()).toBe("light");
  expect(localStorage.getItem("theme")).toBe("light");
  await setSystemDark(false);
  await setSystemDark(true);
  expect(wrapper.text()).toBe("light");
  expect(document.documentElement.classList.contains("dark")).toBe(false);
});

it("hydrates the stored dark theme without changing the server's initial markup", async () => {
  localStorage.setItem("theme", "dark");
  const html = await renderToString(createSSRApp(ThemeApp));
  expect(html).toBe("<button>light</button>");
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  const warn = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");
  const app = createSSRApp(ThemeApp);
  try {
    app.mount(container);
    await nextTick();
    expect(container.textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  } finally {
    app.unmount();
  }
});
