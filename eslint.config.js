import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "node_modules/",
      "public/",
      ".astro/",
      "draft/",
      "**/*.css",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: [
      "scripts/**/*.mjs",
      "vite/**/*.mjs",
      "*.config.{js,ts}",
      "vite.config.ts",
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["src/**/*.{ts,vue}", "tests/**/*.ts"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    rules: {
      "vue/multi-word-component-names": "off",
      // TypeScript already checks undefined identifiers.
      "no-undef": "off",
      // Formatting is Prettier's job.
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-closing-bracket-newline": "off",
      "vue/html-indent": "off",
      "vue/first-attribute-linebreak": "off",
      "vue/html-self-closing": "off",
    },
  }
);
