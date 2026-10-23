import { defineConfig, devices } from "@playwright/test";
import { productionServerCommand } from "./playwright.shared.js";

export default defineConfig({
    testDir: "./e2e",
    testIgnore: ["**/integration/**", "**/performance/**"],
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
        reducedMotion: "reduce",
        baseURL: "http://127.0.0.1:4173",
        screenshot: "only-on-failure",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "mobile-webkit",
            workers: 1,
            testMatch: "**/mobile-*.spec.js",
            use: { ...devices["Desktop Safari"] },
        },
    ],
    webServer: {
        command: productionServerCommand(4173),
        url: "http://127.0.0.1:4173",
        reuseExistingServer: false,
    },
});
