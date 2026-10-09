import { defineConfig, devices } from "@playwright/test";

// Requires a local backend on port 8082 with the real catalog and raised test rate limits.
export default defineConfig({
    testDir: "./e2e/integration",
    fullyParallel: false,
    workers: 1,
    timeout: 60000,
    forbidOnly: Boolean(process.env.CI),
    retries: 0,
    reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
    use: {
        baseURL: "http://127.0.0.1:4174",
        viewport: { width: 1440, height: 1000 },
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "npm run dev -- --configLoader native --host 127.0.0.1 --port 4174 --strictPort",
        url: "http://127.0.0.1:4174",
        env: { API_PROXY_TARGET: "http://127.0.0.1:8082" },
        reuseExistingServer: false,
    },
});
