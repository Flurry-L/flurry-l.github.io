export interface OptimizedImage {
  data: Buffer;
  width: number;
  height: number;
  fileName: string;
}
export function localImagePath(
  src: string,
  filePath: string,
  root: string
): string | null;
export function isRasterImage(filePath: string): boolean;
export function optimizeImage(filePath: string): Promise<OptimizedImage>;
export function publishImage(
  src: string,
  filePath: string,
  root: string,
  outDir: string,
  siteUrl: string
): Promise<string | { src: string; width: number; height: number }>;
