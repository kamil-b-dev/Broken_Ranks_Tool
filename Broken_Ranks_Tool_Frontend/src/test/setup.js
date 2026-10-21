import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { createExclusiveLocks } from "./fixtures/browser/exclusiveLocks";

if (!navigator.locks) {
    Object.defineProperty(navigator, "locks", {
        configurable: true,
        value: createExclusiveLocks(),
    });
}

afterEach(cleanup);
