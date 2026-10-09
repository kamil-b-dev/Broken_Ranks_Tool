import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: [
      ".github/scripts/**/*.mjs",
      "scripts/**/*.mjs",
      "eslint.config.mjs",
    ],
    ...js.configs.recommended,
    languageOptions: { globals: globals.node },
  },
];
