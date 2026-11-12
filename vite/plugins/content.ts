import fs from "node:fs";
import path from "node:path";

import type { Plugin } from "vite";

import { parsePage, parsePost, parsePostMeta } from "./markdown.mjs";
import {
  isRasterImage,
  localImagePath,
  optimizeImage,
  type OptimizedImage,
} from "./images.mjs";

const META_ID = "virtual:posts-meta";
const LOADERS_ID = "virtual:post-loaders";
const POST_PREFIX = "virtual:post/";
const PAGES_ID = "virtual:pages";

function postFiles(root: string) {
  return fs
    .readdirSync(path.join(root, "src/content/posts"))
    .filter(file => file.endsWith(".md"))
    .sort();
}

/** Metadata is shared by lists; each article and its assets form a lazy chunk. */
export function contentPlugin(): Plugin {
  let root = "";
  let base = "/";
  let isBuild = false;
  let isSSRBuild = false;
  const devImages = new Map<string, Buffer>();
  return {
    name: "flurry-content",
    configResolved(config) {
      root = config.root;
      base = config.base;
      isBuild = config.command === "build";
      isSSRBuild = Boolean(config.build.ssr);
    },
    resolveId(id) {
      if (
        [META_ID, LOADERS_ID, PAGES_ID].includes(id) ||
        id.startsWith(POST_PREFIX)
      )
        return `\0${id}`;
      return null;
    },
    async load(id) {
      if (id === `\0${META_ID}`) return generatePostsMetaModule(root);
      if (id === `\0${LOADERS_ID}`) return generatePostLoadersModule(root);
      if (id === `\0${PAGES_ID}`) return generatePagesModule(root);
      if (id.startsWith(`\0${POST_PREFIX}`)) {
        return generatePostModule(
          root,
          id.slice(POST_PREFIX.length + 1),
          (image, absolute) => {
            this.addWatchFile(absolute);
            if (isBuild && !isSSRBuild) {
              this.emitFile({
                type: "asset",
                fileName: image.fileName,
                source: image.data,
              });
            }
            // Both builds must render the same deployed URL, not a URL relative
            // to the SSR bundle's file:// location or the client's lazy chunk.
            const url = `${base}${image.fileName}`;
            if (!isBuild) devImages.set(url, image.data);
            return JSON.stringify(url);
          }
        );
      }
      return null;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const image = devImages.get(req.url?.split("?", 1)[0] ?? "");
        if (!image) return next();
        res.setHeader("Content-Type", "image/webp");
        res.setHeader("Cache-Control", "no-cache");
        res.end(image);
      });
      // Directory watching also catches newly added/deleted Markdown files.
      const contentDir = path.join(root, "src/content");
      const sharedDir = path.join(root, "shared");
      server.watcher.add([contentDir, sharedDir]);
      const reload = (file: string) => {
        if (
          !file.startsWith(contentDir + path.sep) &&
          !file.startsWith(sharedDir + path.sep)
        )
          return;
        for (const [id, module] of server.moduleGraph.idToModuleMap) {
          if (id.startsWith("\0virtual:"))
            server.moduleGraph.invalidateModule(module);
        }
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", reload).on("unlink", reload);
      server.httpServer?.once("close", () => {
        server.watcher.off("add", reload).off("unlink", reload);
      });
    },
    handleHotUpdate({ file, server }) {
      if (
        !file.startsWith(path.join(root, "src/content") + path.sep) &&
        !file.startsWith(path.join(root, "shared") + path.sep)
      )
        return;
      for (const [id, module] of server.moduleGraph.idToModuleMap) {
        if (id.startsWith("\0virtual:"))
          server.moduleGraph.invalidateModule(module);
      }
      server.ws.send({ type: "full-reload" });
      return [];
    },
  };
}

export async function generatePostsMetaModule(root: string): Promise<string> {
  const posts = [];
  for (const file of postFiles(root)) {
    posts.push(await parsePostMeta(path.join(root, "src/content/posts", file)));
  }
  return `export const posts = ${JSON.stringify(posts)};\n`;
}

export function generatePostLoadersModule(root: string): string {
  const entries = postFiles(root).map(file => {
    const slug = path.basename(file, ".md");
    return `[${JSON.stringify(slug)}]: () => import(${JSON.stringify(POST_PREFIX + slug)})`;
  });
  return `export const postLoaders = {${entries.join(",\n")}};\n`;
}

export async function generatePostModule(
  root: string,
  slug: string,
  emitImage: (image: OptimizedImage, absolute: string) => string = image =>
    JSON.stringify(`/${image.fileName}`)
): Promise<string> {
  if (!postFiles(root).includes(`${slug}.md`))
    throw new Error(`Unknown post: ${slug}`);
  const filePath = path.join(root, "src/content/posts", `${slug}.md`);
  const imports: string[] = [];
  const images: { token: string; variable: string }[] = [];
  const post = await parsePost(filePath, {
    async resolveImage(src) {
      const absolute = localImagePath(src, filePath, root);
      if (!absolute) return src;
      const variable = `img_${images.length}`;
      const token = `__POST_IMAGE_${images.length}__`;
      if (isRasterImage(absolute)) {
        const image = await optimizeImage(absolute);
        imports.push(`const ${variable} = ${emitImage(image, absolute)};`);
        images.push({ token, variable });
        return { src: token, width: image.width, height: image.height };
      }
      if (src.startsWith("/")) return src;
      const specifier = `/${path.relative(root, absolute).split(path.sep).join("/")}?url`;
      imports.push(`import ${variable} from ${JSON.stringify(specifier)};`);
      images.push({ token, variable });
      return token;
    },
  });
  const { html: renderedHtml, ...data } = post;
  let html = JSON.stringify(renderedHtml);
  for (const { token, variable } of images)
    html = html.split(token).join(`" + ${variable} + "`);
  return `${imports.join("\n")}\nexport default { ...${JSON.stringify(data)}, html: ${html} };\n`;
}

async function generatePagesModule(root: string): Promise<string> {
  const pagesDir = path.join(root, "src/content/pages");
  const entries: string[] = [];
  for (const file of fs
    .readdirSync(pagesDir)
    .filter(file => file.endsWith(".md"))
    .sort()) {
    const page = await parsePage(path.join(pagesDir, file));
    entries.push(
      `${JSON.stringify(path.basename(file, ".md"))}: ${JSON.stringify(page)}`
    );
  }
  return `export const pages = {${entries.join(",\n")}};\n`;
}
