import path from "node:path";

import { close, createIndex } from "pagefind";
import { loadConfigFromFile } from "vite";
import { build } from "vite-ssg/node";

// Reuse the same plugin instances for the client, SSR and publication phases.
const mode = process.env.MODE ?? "production";
const { config } = await loadConfigFromFile({ command: "build", mode });
await build({ mode }, { ...config, configFile: false });

const outDir = path.resolve(config.root ?? ".", config.build?.outDir ?? "dist");
try {
  const { errors, index } = await createIndex({ forceLanguage: "zh" });
  if (!index) throw new Error(errors.join("\n"));
  const added = await index.addDirectory({
    path: outDir,
  });
  if (added.errors.length) throw new Error(added.errors.join("\n"));
  const written = await index.writeFiles({
    outputPath: path.join(outDir, "pagefind"),
  });
  if (written.errors.length) throw new Error(written.errors.join("\n"));
  console.log(`Pagefind: processed ${added.page_count} HTML files`);
} finally {
  await close();
}
