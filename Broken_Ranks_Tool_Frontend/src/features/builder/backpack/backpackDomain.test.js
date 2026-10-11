import { describe, expect, it } from "vitest";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import saved from "../../../test/fixtures/builds/compatibility/v2-backpack.json";
import {
    backpackWarning,
    createBackpackEntry,
    moveBackpackEntry,
    normalizeBackpack,
} from "./backpackDomain";
import { createBuildPayload } from "../../builds/buildPayload";
import { parseBuildPayload } from "../../builds/buildFile";

describe("backpack data and saved builds", () => {
    it("keeps item assemblies and individual stones separate, detached and ordered in v2", () => {
        const original = structuredClone(saved);
        const result = parseBuildPayload(saved, builderCatalog);
        expect(result.backpack).toEqual(saved.build.backpack);
        result.backpack.reverse();
        expect(saved).toEqual(original);
        expect(parseBuildPayload(createBuildPayload(result), builderCatalog)).toEqual(result);
        expect(
            backpackWarning(saved.build.backpack[0], builderCatalog, builderCatalog.gameRules)
        ).toBeNull();
        expect(
            backpackWarning(saved.build.backpack[3], builderCatalog, builderCatalog.gameRules)
        ).toContain("poziomy");
    });
    it("preserves an over-capacity draft and permits repeated orb types in different alternatives", () => {
        const data = {
            ...builderCatalog,
            drifs: [{ ...builderCatalog.drifs[0], size: "ARCYDRIF" }],
        };
        const draft = structuredClone(saved.build.backpack[3]);
        expect(backpackWarning(draft, data, data.gameRules)).toContain("pojemność");
        const entries = normalizeBackpack([
            saved.build.backpack[0],
            { ...saved.build.backpack[0], id: "second" },
            draft,
        ]);
        expect(entries).toHaveLength(3);
        expect(
            entries
                .slice(0, 2)
                .every(
                    (entry) =>
                        backpackWarning(entry, builderCatalog, builderCatalog.gameRules) === null
                )
        ).toBe(true);
        expect(
            parseBuildPayload(createBuildPayload({ ...saved.build, backpack: entries }), data)
                .backpack[2]
        ).toEqual(draft);
    });
    it("preserves unknown catalog IDs with a warning instead of dropping inventory", () => {
        const entry = { id: "unknown", kind: "DRIF", templateId: "999999", level: 1 };
        expect(normalizeBackpack([entry])).toEqual([entry]);
        expect(backpackWarning(entry, builderCatalog, builderCatalog.gameRules)).toContain(
            "katalogu"
        );
    });
    it.each([
        [{ id: "a", kind: "UNKNOWN" }],
        [{ id: "a", kind: "DRIF", templateId: "60", level: 0 }],
        [{ id: "a", kind: "ORB", templateId: "50", level: 4 }],
        [{ id: "a", kind: "DRIF", templateId: true, level: 1 }],
        [saved.build.backpack[0], saved.build.backpack[0]],
        [
            {
                ...saved.build.backpack[0],
                equipment: { ...saved.build.backpack[0].equipment, drifLevels: { bad: 2 } },
            },
        ],
    ])("rejects ambiguous or malformed inventory occurrence data", (...entries) => {
        expect(() => normalizeBackpack(entries)).toThrow("niepoprawne dane");
    });
    it("creates built-in drifs without modifying catalog objects", () => {
        const item = { id: 99, name: "Epik X", category: "HELMET", rarity: "EPIC", tier: "X" };
        const data = {
            ...builderCatalog,
            items: [...builderCatalog.items, item],
            drifs: [{ ...builderCatalog.drifs[0], size: "MAGNIDRIF" }],
        };
        const rules = {
            ...builderCatalog.gameRules,
            epicBuiltInDrifs: { Epik: ["CRITICAL_CHANCE"] },
        };
        const packed = createBackpackEntry("ITEM", item, data, rules, "epic");
        expect(packed.equipment.drifIds).toEqual(["60"]);
        expect(backpackWarning(packed, data, rules)).toBeNull();
        expect(item).not.toHaveProperty("drifIds");
    });
    it("reorders occurrences without losing their configurations and ignores foreign IDs", () => {
        const entries = saved.build.backpack;
        expect(
            moveBackpackEntry(entries, "loose-drif", "candidate-helmet").map((entry) => entry.id)
        ).toEqual(["loose-drif", "candidate-helmet", "loose-orb", "unfinished-helmet"]);
        expect(moveBackpackEntry(entries, "foreign", "loose-orb")).toBe(entries);
        expect(moveBackpackEntry(entries, "loose-orb", "loose-orb")).toBe(entries);
        expect(entries[0].id).toBe("candidate-helmet");
    });
});
