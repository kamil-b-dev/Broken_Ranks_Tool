import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { configDefaults } from "vitest/config";
import { env } from "node:process";

const domainTests = [
    "src/shared/domain/**/*.test.js",
    "src/shared/api/openApiContract.test.js",
    "src/features/builder/builderWorkspaceDomain.test.js",
    "src/features/builder/character/characterDevelopmentDomain.test.js",
    "src/features/builder/gear-slot/gearSlotDomain.test.js",
    "src/features/builder/gear-slot/gearSlotPresentation.test.js",
    "src/features/builder/item-database/itemDatabaseDomain.test.js",
    "src/features/builder/item-database/itemDatabasePresentation.test.js",
    "src/features/builder/maximizeStoneLevels.test.js",
    "src/features/builder/stats-panel/statsPanelDomain.test.js",
    "src/features/builds/comparison/*.test.js",
    "src/features/optimizer/optimizerDomain.test.js",
    "src/features/optimizer/optimizerConfiguration.test.js",
    "src/features/optimizer/equipmentOptimizationRequest.test.js",
    "src/features/optimizer/advisor/advisorBuildSignature.test.js",
    "src/features/optimizer/advisor/advisorConfiguration.test.js",
    "src/features/optimizer/advisor/optimizerRecommendation.test.js",
    "src/test/bundleSize.test.js",
];
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": env.API_PROXY_TARGET || "http://localhost:8080",
        },
    },
    test: {
        maxWorkers: 4,
        projects: [
            {
                extends: true,
                test: { name: "domain", environment: "node", setupFiles: [], include: domainTests },
            },
            {
                extends: true,
                test: {
                    name: "ui",
                    environment: "jsdom",
                    setupFiles: "./src/test/setup.js",
                    include: ["src/**/*.test.{js,jsx}"],
                    exclude: [...configDefaults.exclude, ...domainTests],
                },
            },
        ],
        testTimeout: 10000,
        exclude: [...configDefaults.exclude, "e2e/**"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov", "json-summary"],
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
