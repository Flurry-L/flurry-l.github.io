import fs from "node:fs/promises";
import path from "node:path";

import { normalizePath, type Plugin } from "vite";

import siteConfig from "../../site.config.json";
import type { Post, PostMeta } from "../../src/types/post";
import {
  parsePage,
  readPostSource,
  renderPost,
  type ParsedPage,
  type RenderOptions,
} from "./markdown";
import { localImagePath, prepareImage, type ImageAsset } from "./images";
import { finishContentBuild } from "./publish";

const META_ID = "virtual:posts-meta";
const LOADERS_ID = "virtual:post-loaders";
const POST_PREFIX = "virtual:post/";
const PAGES_ID = "virtual:pages";
const CONTENT_IDS = [META_ID, LOADERS_ID, PAGES_ID];

function isContentModule(id: string) {
  return CONTENT_IDS.includes(id) || id.startsWith(POST_PREFIX);
}

export interface Content {
  posts: Post[];
  pages: Record<string, ParsedPage>;
}
export interface BuiltContent extends Content {
  assets: Map<string, ImageAsset>;
  dependencies: Set<string>;
}

export function postMeta({
  slug,
  title,
  pubDatetime,
  dateLabel,
  archiveDate,
  year,
  description,
  tags,
  excerpt,
}: PostMeta): PostMeta {
  return {
    slug,
    title,
    pubDatetime,
    dateLabel,
    archiveDate,
    year,
    description,
    tags,
    excerpt,
  };
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
  const dependencies = new Set(
    files.map(file => normalizePath(path.join(postsDir, file)))
  );
  const published = sources
    .filter(
      source => new Date(source.meta.pubDatetime).getTime() <= now + margin
    )
    .sort((a, b) => b.meta.pubDatetime.localeCompare(a.meta.pubDatetime));
  const assets = new Map<string, ImageAsset>();
  function imageOptions(file: string): RenderOptions {
    return {
      async resolveImage(src) {
        const absolute = localImagePath(src, file, root);
        if (!absolute) return { src };
        dependencies.add(normalizePath(absolute));
        const image = await prepareImage(absolute);
        assets.set(image.fileName, image);
        const suffix = src.match(/[?#].*$/)?.[0] ?? "";
        return {
          src: `${base}${image.fileName}${suffix}`,
          width: image.width,
          height: image.height,
        };
      },
    };
  }
  const posts: Post[] = [];
  for (const source of published) {
    const file = path.join(postsDir, `${source.meta.slug}.md`);
    posts.push(await renderPost(source, imageOptions(file)));
  }
  const pages: Record<string, ParsedPage> = {};
  const pagesDir = path.join(root, "src/content/pages");
  for (const file of (await fs.readdir(pagesDir))
    .filter(file => file.endsWith(".md"))
    .sort()) {
    const filePath = path.join(pagesDir, file);
    dependencies.add(normalizePath(filePath));
    pages[path.basename(file, ".md")] = await parsePage(
      filePath,
      imageOptions(filePath)
    );
  }
  return { posts, pages, assets, dependencies };
}

/** Client, SSR and publication share the same content and publication cutoff. */
export function contentPlugin(): Plugin {
  let root = "";
  let base = "/";
  let isSSR = false;
  let clientOutDir = "";
  let content: Promise<BuiltContent> | undefined;
  let assets = new Map<string, ImageAsset>();
  let dependencies = new Set<string>();
  const renderedRoutes = new Set<string>();

  function getContent(): Promise<BuiltContent> {
    content ??= buildContent(root, base).then(built => {
      assets = built.assets;
      dependencies = built.dependencies;
      return built;
    });
    return content;
  }

  return {
    name: "flurry-content",
    config() {
      return {
        ssgOptions: {
          onPageRendered(route) {
            renderedRoutes.add(route);
          },
          onFinished: async () =>
            finishContentBuild(await getContent(), clientOutDir, [
              ...renderedRoutes,
            ]),
        },
      };
    },
    configResolved(config) {
      root = config.root;
      base = config.base;
      isSSR = Boolean(config.build.ssr);
      if (!isSSR) clientOutDir = path.resolve(root, config.build.outDir);
    },
    resolveId(id) {
      if (isContentModule(id)) return `\0${id}`;
    },
    async load(id) {
      if (!id.startsWith("\0") || !isContentModule(id.slice(1))) return;
      const { posts, pages, dependencies } = await getContent();
      for (const file of dependencies) this.addWatchFile(file);
      if (id === `\0${META_ID}`)
        return `export const posts = ${JSON.stringify(posts.map(postMeta))};`;
      if (id === `\0${LOADERS_ID}`) {
        // A generated registry is required so Rollup discovers only published lazy chunks.
        const entries = posts.map(
          post =>
            `[${JSON.stringify(post.slug)}, () => import(${JSON.stringify(POST_PREFIX + post.slug)})]`
        );
        return `export const postLoaders = new Map([${entries.join(",\n")}]);`;
      }
      if (id === `\0${PAGES_ID}`)
        return `export const pages = ${JSON.stringify(pages)};`;
      if (id.startsWith(`\0${POST_PREFIX}`)) {
        const slug = id.slice(POST_PREFIX.length + 1);
        const post = posts.find(post => post.slug === slug);
        if (!post) throw new Error(`Unknown or unpublished post: ${slug}`);
        return `export default ${JSON.stringify(post)};`;
      }
    },
    async generateBundle() {
      if (isSSR) return;
      const { assets } = await getContent();
      for (const image of assets.values())
        this.emitFile({
          type: "asset",
          fileName: image.fileName,
          source: image.data,
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
    },
    hotUpdate({ file, modules }) {
      const isMarkdown =
        file.startsWith(`${root}/src/content/`) && file.endsWith(".md");
      if (!isMarkdown && !dependencies.has(file)) return;
      content = undefined;
      assets.clear();
      // Existing dependencies propagate through Vite's graph. A new Markdown
      // file also changes the article registry even though it has no importers yet.
      const graph = this.environment.moduleGraph;
      return [
        ...new Set([
          ...modules,
          ...CONTENT_IDS.map(id => graph.getModuleById(`\0${id}`)).filter(
            module => !!module
          ),
        ]),
      ];
    },
  };
}
