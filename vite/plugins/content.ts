import fs from "node:fs";
import path from "node:path";

import type { Plugin } from "vite";

import { parsePage, parsePost } from "./markdown.mjs";

const POSTS_ID = "virtual:posts";
const PAGES_ID = "virtual:pages";
const RESOLVED_POSTS_ID = `\0${POSTS_ID}`;
const RESOLVED_PAGES_ID = `\0${PAGES_ID}`;

/**
 * Turns src/content/posts/*.md and src/content/pages/*.md into importable
 * virtual modules. Relative image paths inside posts are rewritten to
 * `?url` imports of the referenced files, so they go through Vite's asset
 * pipeline in both dev and build.
 */
export function contentPlugin(): Plugin {
  let root = "";

  return {
    name: "flurry-content",
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      if (id === POSTS_ID) return RESOLVED_POSTS_ID;
      if (id === PAGES_ID) return RESOLVED_PAGES_ID;
      return null;
    },
    async load(id) {
      if (id === RESOLVED_POSTS_ID) return generatePostsModule(root);
      if (id === RESOLVED_PAGES_ID) return generatePagesModule(root);
      return null;
    },
    handleHotUpdate({ file, server }) {
      if (!file.includes(`${path.sep}src${path.sep}content${path.sep}`)) return;
      for (const resolvedId of [RESOLVED_POSTS_ID, RESOLVED_PAGES_ID]) {
        const module = server.moduleGraph.getModuleById(resolvedId);
        if (module) server.moduleGraph.invalidateModule(module);
      }
      server.ws.send({ type: "full-reload" });
      return [];
    },
  };
}

async function generatePostsModule(root: string): Promise<string> {
  const postsDir = path.join(root, "src/content/posts");
  const files = fs
    .readdirSync(postsDir)
    .filter(file => file.endsWith(".md"))
    .sort();

  const imports: string[] = [];
  const entries: string[] = [];

  for (const file of files) {
    const filePath = path.join(postsDir, file);
    const images: { token: string; variable: string }[] = [];

    const post = await parsePost(filePath, {
      resolveImage: (src: string) => {
        if (!src.startsWith("./") && !src.startsWith("../")) return src;
        const absolute = path.resolve(path.dirname(filePath), src);
        const variable = `img_${entries.length}_${images.length}`;
        const token = `__POST_IMAGE_${entries.length}_${images.length}__`;
        const specifier = `/${path.relative(root, absolute).split(path.sep).join("/")}?url`;
        imports.push(`import ${variable} from ${JSON.stringify(specifier)};`);
        images.push({ token, variable });
        return token;
      },
    });

    let htmlExpression = JSON.stringify(post.html);
    for (const { token, variable } of images) {
      htmlExpression = htmlExpression.split(token).join(`" + ${variable} + "`);
    }

    entries.push(`  {
    slug: ${JSON.stringify(post.slug)},
    title: ${JSON.stringify(post.title)},
    pubDatetime: ${JSON.stringify(post.pubDatetime)},
    description: ${JSON.stringify(post.description)},
    tags: ${JSON.stringify(post.tags)},
    excerpt: ${JSON.stringify(post.excerpt)},
    html: ${htmlExpression},
    toc: ${JSON.stringify(post.toc)},
    weekendCalendar: ${JSON.stringify(post.weekendCalendar)},
  }`);
  }

  return `${imports.join("\n")}\n\nexport const posts = [\n${entries.join(",\n")}\n];\n`;
}

async function generatePagesModule(root: string): Promise<string> {
  const pagesDir = path.join(root, "src/content/pages");
  const files = fs
    .readdirSync(pagesDir)
    .filter(file => file.endsWith(".md"))
    .sort();

  const entries: string[] = [];
  for (const file of files) {
    const name = path.basename(file, ".md");
    const page = await parsePage(path.join(pagesDir, file));
    entries.push(`  ${JSON.stringify(name)}: ${JSON.stringify(page)}`);
  }

  return `export const pages = {\n${entries.join(",\n")}\n};\n`;
}
