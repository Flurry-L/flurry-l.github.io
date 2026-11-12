import { execFileSync } from "node:child_process";
import fs from "node:fs";

import { compileTemplate, parse } from "vue/compiler-sfc";
import { expect, it } from "vitest";

it("forwards parent spacing to the Markdown root in the production Vue runtime", () => {
  const filename = new URL(
    "../src/components/MarkdownContent.vue",
    import.meta.url
  );
  const { descriptor } = parse(fs.readFileSync(filename, "utf8"));
  const { code, errors } = compileTemplate({
    source: descriptor.template!.content,
    filename: filename.pathname,
    id: "markdown-content",
    isProd: true,
  });
  expect(errors).toEqual([]);
  // Resolve the generated module's import before loading it from a data URL.
  const module = code.replace(
    'from "vue"',
    `from ${JSON.stringify(import.meta.resolve("vue"))}`
  );
  const url = `data:text/javascript;base64,${Buffer.from(module).toString("base64")}`;
  const html = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import { JSDOM } from "jsdom";
    const { window } = new JSDOM('<div id="app"></div>');
    Object.assign(globalThis, {
      window, document: window.document,
      Element: window.Element, SVGElement: window.SVGElement
    });
    const { createApp } = await import("vue");
    const { render } = await import(${JSON.stringify(url)});
    const component = { props: ["html"], render };
    createApp(component, {
      class: "mt-8", html: "<p>Article body</p>"
    }).mount("#app");
    process.stdout.write(document.querySelector("#app").innerHTML);
  `,
    ],
    {
      env: { ...process.env, NODE_ENV: "production" },
      encoding: "utf8",
    }
  );
  expect(html).toBe(
    '<div class="prose max-w-none mt-8"><p>Article body</p></div>'
  );
});
