import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import sirv from "sirv";
import { defineConfig } from "vite";
import type {} from "vite-ssg";

import { contentPlugin } from "./vite/plugins/content";

export default defineConfig({
  envPrefix: ["VITE_", "PUBLIC_"],
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag.startsWith("pagefind-"),
        },
      },
    }),
    tailwindcss(),
    contentPlugin(),
    {
      name: "dev-pagefind",
      configureServer(server) {
        // Dev search uses the latest build's index without copying it into public.
        server.middlewares.use(
          `${server.config.base}pagefind`,
          sirv(
            path.resolve(
              server.config.root,
              server.config.build.outDir,
              "pagefind"
            ),
            { dev: true }
          )
        );
      },
    },
  ],
  ssgOptions: {
    dirStyle: "nested",
    script: "defer",
  },
});
