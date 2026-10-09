import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";
import { createExclusiveLocks } from "./fixtures/browser/exclusiveLocks";

if (!navigator.locks) {
    Object.defineProperty(navigator, "locks", {
        configurable: true,
        value: createExclusiveLocks(),
    });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
    cleanup();
    server.resetHandlers();
});
afterAll(() => server.close());
