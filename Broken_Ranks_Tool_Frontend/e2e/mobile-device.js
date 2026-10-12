import { devices } from "@playwright/test";
const { defaultBrowserType: _browserType, ...pixel } = devices["Pixel 7"];
export const mobileDevice = {
    ...pixel,
    userAgent: async ({ browserName }, provide) =>
        provide(browserName === "webkit" ? devices["iPhone 13"].userAgent : pixel.userAgent),
};
