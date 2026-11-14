import { describe, expect, it } from "vitest";
import { createBuildShareLink, readBuildShareLink } from "./buildShare";
describe("self contained build links", () => {
    it("round trips Unicode without leaking backpack or changing the saved build", () => {
        const record = {
            name: "Żmij — ogień",
            payload: {
                format: "broken-ranks-tool-build",
                version: 3,
                build: { requestData: { slots: {} }, backpack: [{ private: true }] },
            },
        };
        const link = createBuildShareLink(record, "https://example.test");
        expect(link).toMatch(/^https:\/\/example.test\/builds#build=/);
        expect(readBuildShareLink(new URL(link).hash)).toMatchObject({
            name: record.name,
            payload: { build: { backpack: [] } },
        });
        expect(record.payload.build.backpack).toHaveLength(1);
    });
    it("rejects oversized and corrupt links without writing browser storage", () => {
        expect(() => readBuildShareLink("#build=%%%")).toThrow();
        expect(() => readBuildShareLink("#build=" + "a".repeat(120001))).toThrow();
        expect(readBuildShareLink("#other")).toBeNull();
    });
});
