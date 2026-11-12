// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { expect, it, vi } from "vitest";

import PostCard from "../src/components/PostCard.vue";

it("keeps reserved characters inside article slugs and tags", async () => {
  const component = { template: "<div />" };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component },
      { path: "/posts/:slug", name: "post", component },
      { path: "/tags/:tag", name: "tag", component },
    ],
  });
  await router.push("/");
  const slug = "a#b %中文";
  const tag = "C++/#标签";
  const wrapper = mount(PostCard, {
    props: {
      post: {
        slug,
        title: "Article",
        pubDatetime: "2025-01-01T00:00:00Z",
        dateLabel: "2025年1月1日",
        archiveDate: "01-01",
        year: 2025,
        description: "",
        excerpt: "Excerpt",
        tags: [tag],
      },
    },
    global: { plugins: [router] },
  });
  const [title, tagLink, excerpt] = wrapper.findAll("a");
  expect(excerpt.attributes("href")).toBe(title.attributes("href"));
  await tagLink.trigger("click");
  await vi.waitFor(() =>
    expect(router.currentRoute.value.params).toEqual({ tag })
  );
  expect(router.currentRoute.value.hash).toBe("");
  await title.trigger("click");
  await vi.waitFor(() =>
    expect(router.currentRoute.value.params).toEqual({ slug })
  );
  expect(router.currentRoute.value.hash).toBe("");
  wrapper.unmount();
});
