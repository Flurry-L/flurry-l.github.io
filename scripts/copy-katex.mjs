// public/katex is gitignored (see .gitignore), so fresh CI checkouts don't
// have it. Copy the KaTeX CSS and fonts out of the installed katex package,
// without ever overwriting existing files in public/.
import fs from "node:fs";
import path from "node:path";

const sourceDir = path.join("node_modules", "katex", "dist");
const targetDir = path.join("public", "katex");

if (!fs.existsSync(path.join(sourceDir, "katex.min.css"))) {
  console.warn("copy-katex: katex package not found, skipping");
  process.exit(0);
}

let copied = 0;

function copyIfMissing(sourceFile, targetFile) {
  if (fs.existsSync(targetFile)) return;
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.copyFileSync(sourceFile, targetFile);
  copied += 1;
}

copyIfMissing(
  path.join(sourceDir, "katex.min.css"),
  path.join(targetDir, "katex.min.css")
);

for (const font of fs.readdirSync(path.join(sourceDir, "fonts"))) {
  copyIfMissing(
    path.join(sourceDir, "fonts", font),
    path.join(targetDir, "fonts", font)
  );
}

console.log(`copy-katex: ${copied} file(s) copied to public/katex`);
