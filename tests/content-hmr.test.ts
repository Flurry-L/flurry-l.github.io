import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createServer, type ViteDevServer } from "vite";
import { afterEach, expect, it, vi } from "vitest";

import { contentPlugin } from "../vite/plugins/content";

let server: ViteDevServer;
let root: string;

afterEach(async () => {
  await server?.close();
  if (root) fs.rmSync(root, { recursive: true, force: true });
});

it("updates content dependencies and article additions/deletions without touching unrelated modules", async () => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "flurry-hmr-")));
  const postsDir = path.join(root, "src/content/posts");
  const publicDir = path.join(root, "public");
  fs.mkdirSync(postsDir, { recursive: true });
  fs.mkdirSync(path.join(root, "src/content/pages"), { recursive: true });
  fs.mkdirSync(publicDir);
  const first = path.join(postsDir, "first.md");
  const image = path.join(publicDir, "diagram.svg");
  const icon = path.join(publicDir, "favicon.svg");
  const markdown = (body: string) =>
    `---\ntitle: Article\npubDatetime: 2025-01-01\n---\n${body}`;
  fs.writeFileSync(first, markdown("Original ![diagram](/diagram.svg)"));
  fs.writeFileSync(
    image,
    '<svg xmlns="http://www.w3.org/2000/svg"><path id="before"/></svg>'
  );
  fs.writeFileSync(icon, "icon");
  fs.writeFileSync(
    path.join(root, "entry.js"),
    'import "virtual:posts-meta"; import "virtual:post-loaders"; import "virtual:post/first"; import "virtual:unrelated";'
  );
  const handled: string[] = [];
  server = await createServer({
    root,
    configFile: false,
    logLevel: "silent",
    plugins: [
      contentPlugin(),
      {
        name: "unrelated-content",
        resolveId: id => (id === "virtual:unrelated" ? `\0${id}` : undefined),
        load: id =>
          id === "\0virtual:unrelated"
            ? 'export default "unrelated"'
            : undefined,
        hotUpdate({ file }) {
          if (this.environment.name === "client") handled.push(file);
        },
      },
    ],
    server: { middlewareMode: true, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  await server.transformRequest("/entry.js");
  const postUrl = "virtual:post/first";
  const metaUrl = "virtual:posts-meta";
  const loadersUrl = "virtual:post-loaders";
  const unrelatedUrl = "virtual:unrelated";
  const original = await server.transformRequest(postUrl);
  await server.transformRequest(metaUrl);
  await server.transformRequest(loadersUrl);
  const unrelated = await server.transformRequest(unrelatedUrl);

  async function change(event: "change" | "add" | "unlink", file: string) {
    handled.length = 0;
    server.watcher.emit(event, file);
    await vi.waitFor(() => expect(handled).toContain(file));
  }

  fs.writeFileSync(icon, "new icon");
  await change("change", icon);
  expect(await server.transformRequest(postUrl)).toBe(original);
  expect(await server.transformRequest(unrelatedUrl)).toBe(unrelated);

  fs.writeFileSync(first, markdown("Changed ![diagram](/diagram.svg)"));
  await change("change", first);
  const changed = await server.transformRequest(postUrl);
  expect(changed?.code).toContain("Changed");
  expect(changed?.code).not.toContain("Original");
  expect(await server.transformRequest(unrelatedUrl)).toBe(unrelated);

  fs.writeFileSync(
    image,
    '<svg xmlns="http://www.w3.org/2000/svg"><path id="after"/></svg>'
  );
  await change("change", image);
  const newImage = await server.transformRequest(postUrl);
  expect(newImage?.code).not.toBe(changed?.code);

  const second = path.join(postsDir, "second.md");
  fs.writeFileSync(second, markdown("New article"));
  await change("add", second);
  expect((await server.transformRequest(metaUrl))?.code).toContain(
    '"slug":"second"'
  );
  expect((await server.transformRequest(loadersUrl))?.code).toContain(
    "virtual:post/second"
  );
  expect(
    (await server.transformRequest("virtual:post/second"))?.code
  ).toContain("New article");

  fs.unlinkSync(second);
  await change("unlink", second);
  expect((await server.transformRequest(metaUrl))?.code).not.toContain(
    '"slug":"second"'
  );
  expect((await server.transformRequest(loadersUrl))?.code).not.toContain(
    "virtual:post/second"
  );
  expect(await server.transformRequest(unrelatedUrl)).toBe(unrelated);
}, 15_000);
