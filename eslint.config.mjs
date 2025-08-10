import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["src/lib/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      sourceType: "module",
    },
  },
];
