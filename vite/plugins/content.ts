import fs from "node:fs/promises";
import path from "node:path";

import type { Plugin, ViteDevServer } from "vite";

import siteConfig from "../../site.config.json";
import type { PostMeta } from "../../src/types/post";
import {
  parsePage,
  readPostSource,
  renderPost,
  type ParsedPage,
  type RenderedPost,
} from "./markdown";
import { localImagePath, prepareImage, type ImageAsset } from "./images";

const META_ID = "virtual:posts-meta";
const LOADERS_ID = "virtual:post-loaders";
const POST_PREFIX = "virtual:post/";
const PAGES_ID = "virtual:pages";
const PAGE_META_ID = "virtual:pages-meta";
export const SNAPSHOT_FILE = ".vite/content-snapshot.json";

export interface ContentSnapshot {
  posts: RenderedPost[];
  pages: Record<string, ParsedPage>;
}
export interface BuiltContent extends ContentSnapshot {
  assets: Map<string, ImageAsset>;
}

export function postMeta({
  slug,
  title,
  pubDatetime,
  description,
  tags,
  excerpt,
}: PostMeta): PostMeta {
  return { slug, title, pubDatetime, description, tags, excerpt };
}

/**
 * One publication cutoff and one parsed source per article for this build.
 * Scheduled posts become public on the next build, never on the reader's clock.
 */
export async function buildContent(
  root: string,
  base = "/",
  now = Date.now(),
  margin = siteConfig.posts.scheduledPostMargin
): Promise<BuiltContent> {
  const postsDir = path.join(root, "src/content/posts");
  const files = (await fs.readdir(postsDir))
    .filter(file => file.endsWith(".md"))
    .sort();
  const sources = await Promise.all(
    files.map(file => readPostSource(path.join(postsDir, file)))
  );
  const published = sources
    .filter(
      source => new Date(source.meta.pubDatetime).getTime() <= now + margin
    )
    .sort((a, b) => b.meta.pubDatetime.localeCompare(a.meta.pubDatetime));
  const assets = new Map<string, ImageAsset>();
  const posts: RenderedPost[] = [];
  for (const source of published) {
    const file = path.join(postsDir, `${source.meta.slug}.md`);
    posts.push(
      await renderPost(source, {
        rssUrl: new URL(
          `posts/${encodeURIComponent(source.meta.slug)}`,
          siteConfig.site.url
        ).href,
        async resolveImage(src) {
          const absolute = localImagePath(src, file, root);
          if (!absolute) return src;
          const image = await prepareImage(absolute);
          assets.set(image.fileName, image);
          const suffix = src.match(/[?#].*$/)?.[0] ?? "";
          return {
            src: `${base}${image.fileName}${suffix}`,
            width: image.width,
            height: image.height,
          };
        },
      })
    );
  }
  const pages: Record<string, ParsedPage> = {};
  const pagesDir = path.join(root, "src/content/pages");
  for (const file of (await fs.readdir(pagesDir))
    .filter(file => file.endsWith(".md"))
    .sort()) {
    pages[path.basename(file, ".md")] = await parsePage(
      path.join(pagesDir, file)
    );
  }
  return { posts, pages, assets };
}

/** The client build writes its snapshot; SSR and publication hooks consume it. */
export function contentPlugin(clientOutDir = "dist"): Plugin {
  let root = "";
  let base = "/";
  let isBuild = false;
  let isSSR = false;
  let snapshot: Promise<ContentSnapshot> | undefined;
  const assets = new Map<string, ImageAsset>();

  function getSnapshot(): Promise<ContentSnapshot> {
    snapshot ??= isSSR
      ? fs
          .readFile(path.resolve(root, clientOutDir, SNAPSHOT_FILE), "utf8")
          .then(text => JSON.parse(text) as ContentSnapshot)
      : buildContent(root, base).then(({ posts, pages, assets: generated }) => {
          for (const [name, image] of generated) assets.set(name, image);
          return { posts, pages };
        });
    return snapshot;
  }

  function reload(file: string, server: ViteDevServer) {
    if (
      !["src/content", "shared", "public"].some(dir =>
        file.startsWith(path.join(root, dir) + path.sep)
      )
    )
      return false;
    snapshot = undefined;
    assets.clear();
    for (const [id, module] of server.moduleGraph.idToModuleMap) {
      if (id.startsWith("\0virtual:"))
        server.moduleGraph.invalidateModule(module);
    }
    server.ws.send({ type: "full-reload" });
    return true;
  }

  return {
    name: "flurry-content",
    configResolved(config) {
      root = config.root;
      base = config.base;
      isBuild = config.command === "build";
      isSSR = Boolean(config.build.ssr);
    },
    resolveId(id) {
      if (
        [META_ID, LOADERS_ID, PAGES_ID, PAGE_META_ID].includes(id) ||
        id.startsWith(POST_PREFIX)
      )
        return `\0${id}`;
    },
    async load(id) {
      if (!id.startsWith("\0virtual:")) return;
      const { posts, pages } = await getSnapshot();
      if (id === `\0${META_ID}`)
        return `export const posts = ${JSON.stringify(posts.map(({ post }) => postMeta(post)))};`;
      if (id === `\0${LOADERS_ID}`) {
        // A generated registry is required so Rollup discovers only published lazy chunks.
        const entries = posts.map(
          ({ post }) =>
            `[${JSON.stringify(post.slug)}]: () => import(${JSON.stringify(POST_PREFIX + post.slug)})`
        );
        return `export const postLoaders = {${entries.join(",\n")}};`;
      }
      if (id === `\0${PAGES_ID}`)
        return `export const pages = ${JSON.stringify(pages)};`;
      if (id === `\0${PAGE_META_ID}`) {
        const meta = Object.fromEntries(
          Object.entries(pages).map(([slug, { title, description }]) => [
            slug,
            { title, description },
          ])
        );
        return `export const pages = ${JSON.stringify(meta)};`;
      }
      if (id.startsWith(`\0${POST_PREFIX}`)) {
        const slug = id.slice(POST_PREFIX.length + 1);
        const entry = posts.find(({ post }) => post.slug === slug);
        if (!entry) throw new Error(`Unknown or unpublished post: ${slug}`);
        return `export default ${JSON.stringify(entry.post)};`;
      }
    },
    async generateBundle() {
      if (isSSR) return;
      const content = await getSnapshot();
      for (const image of assets.values())
        this.emitFile({
          type: "asset",
          fileName: image.fileName,
          source: image.data,
        });
      this.emitFile({
        type: "asset",
        fileName: SNAPSHOT_FILE,
        source: JSON.stringify(content),
      });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?", 1)[0] ?? "";
        const image = url.startsWith(base)
          ? assets.get(decodeURIComponent(url.slice(base.length)))
          : undefined;
        if (!image) return next();
        res.setHeader("Content-Type", image.mime);
        res.setHeader("Cache-Control", "no-cache");
        res.end(image.data);
      });
      server.watcher.add([
        path.join(root, "src/content"),
        path.join(root, "shared"),
        path.join(root, "public"),
      ]);
      const onFile = (file: string) => reload(file, server);
      server.watcher.on("add", onFile).on("unlink", onFile);
      server.httpServer?.once("close", () => {
        server.watcher.off("add", onFile).off("unlink", onFile);
      });
    },
    handleHotUpdate({ file, server }) {
      if (!isBuild && reload(file, server)) return [];
    },
  };
}
