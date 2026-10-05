import { describe, expect, it } from "vitest";
import { checkOutputBudget } from "../../scripts/bundle-size-budget.mjs";

describe("production output budget", () => {
    it("counts public output and nested assets, separating crawler social cards", () => {
        expect(
            checkOutputBudget([
                { name: "assets/nested/index.js", size: 100 },
                { name: "index.html", size: 50 },
                { name: "social-preview.png", size: 1_465_386 },
            ])
        ).toEqual({ page: 150, social: 1_465_386, total: 1_465_536 });
    });
    it("rejects oversized public and nested page assets", () => {
        for (const name of ["public-image.png", "assets/nested/image.webp"]) {
            expect(() => checkOutputBudget([{ name, size: 1_000_001 }])).toThrow(name);
        }
    });
    it("enforces the social card and complete output budgets", () => {
        expect(() => checkOutputBudget([{ name: "social-preview.png", size: 2_000_001 }])).toThrow(
            "social-preview.png"
        );
        expect(() =>
            checkOutputBudget(
                Array.from({ length: 13 }, (_, index) => ({
                    name: `assets/${index}.webp`,
                    size: 1_000_000,
                }))
            )
        ).toThrow("13000000 B total");
    });
});
