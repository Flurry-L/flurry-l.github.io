import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import sharp from "sharp";

const rasterExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".tif",
  ".tiff",
]);
const optimizedImages = new Map();

export function localImagePath(src, filePath, root) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(src)) return null;
  const pathname = decodeURIComponent(src.split(/[?#]/, 1)[0]);
  return pathname.startsWith("/")
    ? path.join(root, "public", pathname)
    : path.resolve(path.dirname(filePath), pathname);
}

export function isRasterImage(filePath) {
  return rasterExtensions.has(path.extname(filePath).toLowerCase());
}

/**
 * Build-only derivatives shared by Vite and RSS; originals stay untouched.
 * Auto-orient, cap the longest edge at 1920px without upscaling, WebP quality 80.
 * GIF/SVG keep their original bytes; remote URLs are never fetched here.
 */
export async function optimizeImage(filePath) {
  const stat = await fs.stat(filePath);
  const key = `${stat.mtimeMs}:${stat.size}`;
  const cached = optimizedImages.get(filePath);
  if (cached?.key === key) return cached.result;
  const result = sharp(filePath)
    .rotate()
    .resize({
      width: 1920,
      height: 1920,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => ({
      data,
      width: info.width,
      height: info.height,
      fileName: `assets/${path.basename(filePath, path.extname(filePath))}-${createHash("sha256").update(data).digest("hex").slice(0, 16)}.webp`,
    }));
  optimizedImages.set(filePath, { key, result });
  try {
    return await result;
  } catch (error) {
    optimizedImages.delete(filePath);
    throw error;
  }
}

/** RSS uses the same optimized filename and bytes as Vite's emitted asset. */
export async function publishImage(src, filePath, root, outDir, siteUrl) {
  const absolute = localImagePath(src, filePath, root);
  if (!absolute) return src;
  if (isRasterImage(absolute)) {
    const image = await optimizeImage(absolute);
    const target = path.join(outDir, image.fileName);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, image.data);
    return {
      src: new URL(image.fileName, siteUrl).href,
      width: image.width,
      height: image.height,
    };
  }
  if (src.startsWith("/")) return new URL(src, siteUrl).href;
  // Preserve SVG/non-raster bytes rather than running them through sharp.
  const data = await fs.readFile(absolute);
  const hash = createHash("sha256").update(data).digest("hex").slice(0, 16);
  const fileName = `assets/${path.basename(absolute, path.extname(absolute))}-${hash}${path.extname(absolute)}`;
  const target = path.join(outDir, fileName);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
  return new URL(fileName, siteUrl).href;
}
