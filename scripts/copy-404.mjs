// GitHub Pages expects a root 404.html. Use the rendered not-found page,
// not a copy of the homepage; published routes have their own index.html.
import { copyFileSync } from "node:fs";

copyFileSync("dist/404/index.html", "dist/404.html");
console.log("copy-404: dist/404/index.html → dist/404.html");
