import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import sirv from "sirv";
import { defineConfig } from "vite";
import type {} from "vite-ssg";

import { contentPlugin } from "./vite/plugins/content";

export default defineConfig({
  envPrefix: ["VITE_", "PUBLIC_"],
  plugins: [
    vue(),
    tailwindcss(),
    contentPlugin(),
    {
      name: "dev-pagefind",
      configureServer(server) {
        // Dev search uses the latest build's index without copying it into public.
        server.middlewares.use(
          "/pagefind",
          sirv(fileURLToPath(new URL("./dist/pagefind", import.meta.url)), {
            dev: true,
          })
        );
      },
    },
  ],
  ssgOptions: {
    dirStyle: "nested",
    script: "defer",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
