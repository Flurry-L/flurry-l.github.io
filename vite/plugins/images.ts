import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import { lookup } from "mrmime";
import sharp from "sharp";

export interface ImageAsset {
  data: Buffer;
  fileName: string;
  mime: string;
  width?: number;
  height?: number;
}

const rasterExtensions: Record<string, true | undefined> = {
  ".jpg": true,
  ".jpeg": true,
  ".png": true,
  ".webp": true,
  ".avif": true,
  ".tif": true,
  ".tiff": true,
};
const imageCache = new Map<
  string,
  { key: string; result: Promise<ImageAsset> }
>();

export function localImagePath(src: string, filePath: string, root: string) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(src)) return null;
  const pathname = decodeURIComponent(src.split(/[?#]/, 1)[0]);
  return pathname.startsWith("/")
    ? path.join(root, "public", pathname)
    : path.resolve(path.dirname(filePath), pathname);
}

async function createImage(filePath: string): Promise<ImageAsset> {
  const extension = path.extname(filePath);
  let data: Buffer;
  let width: number | undefined;
  let height: number | undefined;
  let outputExtension = extension;
  if (rasterExtensions[extension.toLowerCase()]) {
    const result = await sharp(filePath)
      .rotate()
      .resize({
        width: 1920,
        height: 1920,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    data = result.data;
    width = result.info.width;
    height = result.info.height;
    outputExtension = ".webp";
  } else {
    // SVG/GIF retain their original bytes, including vector detail and animation.
    data = await fs.readFile(filePath);
  }
  const hash = createHash("sha256").update(data).digest("hex").slice(0, 16);
  return {
    data,
    width,
    height,
    mime: lookup(outputExtension) ?? "application/octet-stream",
    fileName: `assets/${path.basename(filePath, extension)}-${hash}${outputExtension}`,
  };
}

/** Shared, deterministic assets for the browser, SSR, and RSS. Originals stay intact. */
export async function prepareImage(filePath: string): Promise<ImageAsset> {
  const stat = await fs.stat(filePath);
  const key = `${stat.mtimeMs}:${stat.size}`;
  const cached = imageCache.get(filePath);
  if (cached?.key === key) return cached.result;
  const result = createImage(filePath);
  imageCache.set(filePath, { key, result });
  try {
    return await result;
  } catch (error) {
    imageCache.delete(filePath);
    throw error;
  }
}
