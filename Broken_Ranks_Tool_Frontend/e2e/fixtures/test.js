import { test as base, expect, devices } from "@playwright/test";

// Tests expecting an application error must name its exact console message.
export const test = base.extend({
    expectedConsoleErrors: [[], { option: true }],
    browserErrors: [
        async ({ context, expectedConsoleErrors }, use, testInfo) => {
            const errors = [];
            const watched = new Set();
            const watch = (page) => {
                page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
                page.on("console", (message) => {
                    if (
                        message.type() === "error" &&
                        !expectedConsoleErrors.some((pattern) =>
                            new RegExp(pattern).test(message.text())
                        )
                    )
                        errors.push(`console.error: ${message.text()}`);
                });
            };
            const watchContext = (current) => {
                if (watched.has(current)) return;
                watched.add(current);
                current.pages().forEach(watch);
                current.on("page", watch);
            };
            watchContext(context);
            await use(watchContext);
            for (const current of watched) current.off("page", watch);
            const expected = testInfo.annotations
                .filter(({ type }) => type === "expected-console-error")
                .map(({ description }) => description);
            const unexpected = errors.filter(
                (message) =>
                    !expected.some((prefix) => message.startsWith(`console.error: ${prefix}`))
            );
            if (unexpected.length)
                await testInfo.attach("browser-errors", {
                    body: unexpected.join("\n"),
                    contentType: "text/plain",
                });
            expect(unexpected, "Unexpected browser errors").toEqual([]);
        },
        { auto: true },
    ],
    createContext: async ({ browser, browserErrors }, provide) => {
        const contexts = [];
        await provide(async (options) => {
            const context = await browser.newContext(options);
            contexts.push(context);
            browserErrors(context);
            return context;
        });
        for (const context of contexts) await context.close();
    },
});
export { expect, devices };
export const expectConsoleError = (message) =>
    test.info().annotations.push({ type: "expected-console-error", description: message });
