import { describe, expect, it } from "vitest";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import saved from "../../../test/fixtures/builds/compatibility/v2-backpack.json";
import selected from "../../../test/fixtures/builds/compatibility/v3-backpack-selection.json";
import {
    backpackWarning,
    createBackpackEntry,
    moveBackpackEntry,
    normalizeBackpack,
} from "./backpackDomain";
import { createBuildPayload } from "../../builds/buildPayload";
import { parseBuildPayload } from "../../builds/buildFile";

describe("backpack data and saved builds", () => {
    it("creates copies from trusted catalog data and rejects unknown catalog additions", () => {
        const item = builderCatalog.items[0];
        const copy = createBackpackEntry(
            "ITEM",
            { ...item, rarity: "EPIC" },
            builderCatalog,
            builderCatalog.gameRules,
            "copy"
        );
        expect(copy.equipment.drifIds).toEqual([]);
        expect(() =>
            createBackpackEntry("DRIF", { id: 999999 }, builderCatalog, builderCatalog.gameRules)
        ).toThrow(/katalogu/);
    });
    it.each([2, 3])(
        "rejects malformed v%s occurrence data and overflow without a destructuring crash",
        (version) => {
            const payload = structuredClone(saved);
            payload.version = version;
            payload.build.backpack = [null];
            expect(() => parseBuildPayload(payload, builderCatalog)).toThrow(/niepoprawne dane/);
            payload.build.backpack = Array(201).fill(null);
            expect(() => parseBuildPayload(payload, builderCatalog)).toThrow(/200/);
        }
    );
    it("round-trips v3 per-occurrence selection while v2 imports leave all drifs unselected", () => {
        const result = parseBuildPayload(selected, builderCatalog);
        expect(result.backpack.find((entry) => entry.kind === "DRIF").sendToBackend).toBe(true);
        expect(parseBuildPayload(createBuildPayload(result), builderCatalog)).toEqual(result);
        expect(
            parseBuildPayload(saved, builderCatalog).backpack.every(
                (entry) => entry.sendToBackend !== true
            )
        ).toBe(true);
    });
    it("accepts 200 slots, counts configured items as one slot and rejects 201 before inspecting entries", () => {
        const entries = Array.from({ length: 200 }, (_, index) => ({
            ...saved.build.backpack[0],
            id: `item-${index}`,
        }));
        expect(normalizeBackpack(entries)).toHaveLength(200);
        const payload = structuredClone(saved);
        payload.build.backpack = entries;
        expect(parseBuildPayload(payload, builderCatalog).backpack).toHaveLength(200);
        payload.build.backpack = [...entries, { ...entries[0], id: "overflow" }];
        expect(() => parseBuildPayload(payload, builderCatalog)).toThrow(/maksymalnie 200/);
        expect(() => createBuildPayload(payload.build)).toThrow(/maksymalnie 200/);
        expect(() => normalizeBackpack(Array(201).fill(null))).toThrow(/maksymalnie 200/);
        expect(entries).toHaveLength(200);
    });
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
        [{ id: "a", kind: "DRIF", templateId: "60", level: 1, sendToBackend: null }],
        [{ id: "a", kind: "DRIF", templateId: "60", level: 1, sendToBackend: "true" }],
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
