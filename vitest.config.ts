import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      name: "test-pages",
      resolveId: id => (id === "virtual:pages" ? id : undefined),
    },
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag.startsWith("pagefind-"),
        },
      },
    }),
  ],
  test: {
    server: { deps: { inline: ["@pagefind/component-ui"] } },
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
  },
});
