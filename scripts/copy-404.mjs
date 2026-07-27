// GitHub Pages serves 404.html for unknown paths; copying index.html lets the
// SPA router take over on deep links.
import { copyFileSync } from "node:fs";

copyFileSync("dist/index.html", "dist/404.html");
console.log("copy-404: dist/index.html → dist/404.html");
