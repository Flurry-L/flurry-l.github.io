// Copies the KaTeX stylesheet and fonts out of node_modules into public/ so
// article pages can load them on demand (only posts with `math: true`).
import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../node_modules/katex/dist', import.meta.url));
const target = fileURLToPath(new URL('../public/katex', import.meta.url));

mkdirSync(target, { recursive: true });
cpSync(`${source}/katex.min.css`, `${target}/katex.min.css`);
cpSync(`${source}/fonts`, `${target}/fonts`, { recursive: true });
console.log('[katex] assets copied to public/katex');
