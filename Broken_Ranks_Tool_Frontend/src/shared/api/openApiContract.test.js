import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const contract = readFileSync(resolve(process.cwd(), "..", "docs", "openapi.yaml"), "utf8");

describe("OpenAPI optimizer contract", () => {
    it.each([
        "configurationMode:",
        "simpleProfile:",
        "simpleOptions:",
        "simpleAspects:",
        "drifSizeQuantities:",
        "strategy:",
    ])("documents %s", (field) => {
        expect(contract).toContain(field);
    });

    it("documents the supported advisor budgets and action range", () => {
        expect(contract).toMatch(/timeBudgetMs:[\s\S]*?enum: \[3000, 6000\]/u);
        expect(contract).toMatch(/maxActions: \{ type: integer, minimum: 1, maximum: 10/u);
    });

    it("requires cancellation credentials together", () => {
        expect(contract).toContain("runId: [cancellationToken]");
        expect(contract).toContain("cancellationToken: [runId]");
    });
});
