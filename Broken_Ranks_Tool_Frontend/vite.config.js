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
        testTimeout: 10000,
        exclude: [...configDefaults.exclude, "e2e/**"],
        setupFiles: "./src/test/setup.js",
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov"],
            reportsDirectory: "./coverage",
            include: ["src/**/*.{js,jsx}"],
            exclude: ["src/main.jsx", "src/test/**"],
            thresholds: {
                statements: 85,
                branches: 70,
                functions: 80,
                lines: 85,
            },
        },
    },
});
