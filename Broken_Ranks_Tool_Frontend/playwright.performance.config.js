import { defineConfig, devices } from "@playwright/test";
import { productionServerCommand } from "./playwright.shared.js";
export default defineConfig({
    testDir: "./e2e/performance",
    fullyParallel: false,
    workers: 1,
    timeout: 30000,
    outputDir: "./performance-results",
    reporter: [["list"], ["html", { open: "never", outputFolder: "performance-report" }]],
    use: {
        baseURL: "http://127.0.0.1:4175",
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
    },
    projects: [{ name: "production-chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: productionServerCommand(4175),
        url: "http://127.0.0.1:4175",
        reuseExistingServer: false,
    },
});
