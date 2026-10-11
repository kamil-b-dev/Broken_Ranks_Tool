import { describe, expect, it } from "vitest";
import { normalizeTrailingOrbSlots } from "./orbSelectionNormalization";

describe("orb selection normalization", () => {
    it.each([
        [
            { orbIds: [null, null], orbLevels: [null, null] },
            { orbIds: [], orbLevels: [] },
        ],
        [
            { orbIds: [29, null], orbLevels: [1, null] },
            { orbIds: [29], orbLevels: [1] },
        ],
        [
            { orbIds: [29, null], orbLevels: { 0: 1, 1: null } },
            { orbIds: [29], orbLevels: { 0: 1 } },
        ],
        [{ orbIds: ["", ""] }, { orbIds: [] }],
    ])("removes trailing empty positions and their null placeholders", (source, expected) => {
        const before = structuredClone(source);
        expect(normalizeTrailingOrbSlots(source)).toEqual(expected);
        expect(source).toEqual(before);
    });

    it.each([
        [{ orbIds: [29, null], orbLevels: [null, null] }, [null]],
        [{ orbIds: [29, null], orbLevels: [1, 99] }, [1, 99]],
        [{ orbIds: [29, null], orbLevels: { bad: null } }, { bad: null }],
        [{ orbIds: [29], orbLevels: [1, null] }, [1, null]],
    ])("preserves invalid occupied or orphan levels for validation", (source, expectedLevels) => {
        const normalized = normalizeTrailingOrbSlots(source);
        expect(normalized.orbLevels).toEqual(expectedLevels);
    });

    it.each([
        null,
        {},
        { orbIds: [null, 29] },
        { orbIds: [29, 30] },
        { orbIds: [null, null, null] },
    ])("preserves gaps, two actual stones and oversized input", (slot) => {
        expect(normalizeTrailingOrbSlots(slot)).toBe(slot);
    });
});
