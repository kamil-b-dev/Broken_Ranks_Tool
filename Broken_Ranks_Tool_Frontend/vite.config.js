import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { configDefaults } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": "http://localhost:8080",
        },
    },
    test: {
        environment: "jsdom",
        exclude: [...configDefaults.exclude, "e2e/**"],
        setupFiles: "./src/test/setup.js",
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov"],
            reportsDirectory: "./coverage",
            include: ["src/**/*.{js,jsx}"],
            exclude: ["src/main.jsx", "src/test/**"],
            thresholds: {
                statements: 55,
                branches: 40,
                functions: 45,
                lines: 60,
            },
        },
    },
});
