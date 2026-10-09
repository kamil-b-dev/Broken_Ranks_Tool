import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import react from "eslint-plugin-react";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    globalIgnores(["coverage", "dist", "docs", "performance-results", "performance-report"]),
    {
        files: ["**/*.{js,jsx,mjs}"],
        extends: [
            js.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
                ecmaVersion: "latest",
                ecmaFeatures: { jsx: true },
                sourceType: "module",
            },
        },
        plugins: { react },
        rules: {
            "react/jsx-uses-vars": "error",
            "no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
        },
    },
    {
        files: ["playwright*.config.js", "vite.config.js", "scripts/**/*.mjs"],
        languageOptions: {
            globals: globals.node,
        },
    },
]);
