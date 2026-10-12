import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

const contract = YAML.parse(
    readFileSync(resolve(process.cwd(), "..", "docs", "openapi.yaml"), "utf8")
);

describe("OpenAPI optimizer contract", () => {
    it("shares intelligence validation between calculator and optimizer requests", () => {
        const schemas = contract.components.schemas;
        for (const name of ["EquipmentRequest", "OptimizationRequest"])
            expect(schemas[name].properties.characterStats.$ref).toBe(
                "#/components/schemas/CharacterStats"
            );
        const stats = schemas.CharacterStats;
        const validName = new RegExp(stats.propertyNames.pattern);
        expect(validName.test("Inteligencja")).toBe(true);
        expect(validName.test("INTELIGENCJA")).toBe(true);
        expect(validName.test("intelligence")).toBe(false);
        expect(stats.example.Inteligencja).toBe(10);
        expect(stats.additionalProperties).toMatchObject({
            type: "integer",
            minimum: 0,
            maximum: 50000,
        });
    });
    it.each([
        "configurationMode",
        "simpleProfile",
        "simpleOptions",
        "simpleAspects",
        "drifSizeQuantities",
        "strategy",
    ])("documents %s", (field) => {
        const schema = field === "strategy" ? "AdvisorOptions" : "OptimizationRequest";
        expect(contract.components.schemas[schema].properties).toHaveProperty(field);
    });

    it("documents the supported advisor budgets and action range", () => {
        const options = contract.components.schemas.AdvisorOptions.properties;
        expect(options.timeBudgetMs.enum).toEqual([3000, 6000]);
        expect(options.maxActions).toMatchObject({ type: "integer", minimum: 1, maximum: 10 });
    });

    it("requires cancellation credentials together", () => {
        expect(contract.components.schemas.AdvisorOptions.dependentRequired).toEqual({
            runId: ["cancellationToken"],
            cancellationToken: ["runId"],
        });
    });
});
