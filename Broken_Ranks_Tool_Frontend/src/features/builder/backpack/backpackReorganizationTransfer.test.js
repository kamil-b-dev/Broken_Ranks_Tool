import { describe, expect, it } from "vitest";
import { applyReorganization } from "./backpackReorganizationTransfer";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";

const slot = (itemId, ids = [], levels = {}) => ({
    itemId,
    itemStars: 1,
    drifIds: ids,
    drifLevels: levels,
    orbIds: [],
    orbLevels: [],
});
const input = () => ({
    backpack: [
        { id: "selected", kind: "DRIF", templateId: "60", level: 6, sendToBackend: true },
        { id: "unused", kind: "DRIF", templateId: "60", level: 1 },
    ],
    previousSlots: { helmet: slot(1, [60], { 0: 2 }) },
    nextSlots: { helmet: slot(1, [60], { 0: 6 }) },
    reorganizationDrifUsages: [
        {
            entryId: "selected",
            sourceSlotKey: null,
            sourceDrifIndex: null,
            slotKey: "helmet",
            drifIndex: 0,
        },
    ],
    lockedSlots: [],
    lockedDrifs: {},
    builtInSlots: [],
    data: builderCatalog,
    gameRules: builderCatalog.gameRules,
});

describe("reorganization inventory transfer", () => {
    it("counts insertion and returning the replaced stone separately against the selected limit", () => {
        const source = input();
        source.reorganizationOptions = {
            task: "INSERT",
            insertEntryId: "selected",
            allowUnequip: true,
            maxMoves: 1,
        };
        const initial = structuredClone(source.backpack);
        expect(() => applyReorganization(source)).toThrow(/limit przełożeń/);
        expect(source.backpack).toEqual(initial);
        source.reorganizationOptions.maxMoves = 2;
        expect(applyReorganization(source).some((entry) => entry.id === "selected")).toBe(false);
    });
    it("counts swapping two equipped stones as two moves", () => {
        const source = input();
        source.previousSlots.armor = slot(2, [60], { 0: 6 });
        source.nextSlots = { helmet: slot(1, [60], { 0: 6 }), armor: slot(2, [60], { 0: 2 }) };
        source.reorganizationDrifUsages = [
            {
                entryId: null,
                sourceSlotKey: "armor",
                sourceDrifIndex: 0,
                slotKey: "helmet",
                drifIndex: 0,
            },
            {
                entryId: null,
                sourceSlotKey: "helmet",
                sourceDrifIndex: 0,
                slotKey: "armor",
                drifIndex: 0,
            },
        ];
        source.reorganizationOptions = {
            task: "RESERVE",
            maxMoves: 1,
            reservation: { slotKey: "helmet", freeSockets: 1, freeCapacity: 0 },
        };
        expect(() => applyReorganization(source)).toThrow(/limit przełożeń/);
        source.reorganizationOptions.maxMoves = 2;
        expect(applyReorganization(source)).toEqual(source.backpack);
    });
    it("consumes an explicitly chosen loose stone without requiring its general pool checkbox", () => {
        const source = input();
        source.backpack[0].sendToBackend = false;
        source.reorganizationOptions = {
            task: "INSERT",
            insertEntryId: "selected",
            allowUnequip: true,
        };
        source.allowedBackpackIds = ["selected"];
        const next = applyReorganization(source);
        expect(next.some((entry) => entry.id === "selected")).toBe(false);
        expect(source.backpack[0].sendToBackend).toBe(false);
        expect(next.some((entry) => entry.level === 2)).toBe(true);
    });
    it("checks every requested upgrade and rejects unrequested level changes", () => {
        const source = input();
        source.previousSlots.armor = slot(2, [60], { 0: 1 });
        source.nextSlots = { helmet: slot(1, [60], { 0: 6 }), armor: slot(2, [60], { 0: 5 }) };
        source.reorganizationOptions = {
            task: "UPGRADE",
            upgrades: [
                {
                    sourceSlotKey: "helmet",
                    sourceDrifIndex: 0,
                    targetTemplateId: 60,
                    targetLevel: 6,
                },
                {
                    sourceSlotKey: "armor",
                    sourceDrifIndex: 0,
                    targetTemplateId: 60,
                    targetLevel: 5,
                },
            ],
        };
        source.reorganizationDrifUsages = ["helmet", "armor"].map((slotKey) => ({
            entryId: null,
            sourceSlotKey: slotKey,
            sourceDrifIndex: 0,
            slotKey,
            drifIndex: 0,
        }));
        expect(applyReorganization(source)).toEqual(source.backpack);
        source.nextSlots.armor.drifLevels[0] = 6;
        expect(() => applyReorganization(source)).toThrow();
    });
    it("requires the chosen backpack occurrence and the requested reserve", () => {
        const source = input();
        source.nextSlots.helmet = slot(1);
        source.reorganizationDrifUsages = [];
        source.reorganizationOptions = {
            task: "INSERT",
            insertEntryId: "unused",
            allowUnequip: true,
        };
        expect(() => applyReorganization(source)).toThrow(/wybrany drif/);
        source.nextSlots.helmet = slot(1, [60], { 0: 2 });
        source.reorganizationDrifUsages = [
            {
                entryId: null,
                sourceSlotKey: "helmet",
                sourceDrifIndex: 0,
                slotKey: "helmet",
                drifIndex: 0,
            },
        ];
        source.reorganizationOptions = {
            task: "RESERVE",
            allowUnequip: true,
            reservation: { slotKey: "helmet", freeSockets: 3, freeCapacity: 12 },
        };
        expect(() => applyReorganization(source)).toThrow(/wymaganego miejsca/);
    });
    it.each(["UPGRADE", "RESERVE", "INSERT"])(
        "rejects an unrequested backpack source during %s before publishing inventory",
        (task) => {
            const source = input();
            source.reorganizationOptions = {
                task,
                insertEntryId: "unused",
                upgrades:
                    task === "UPGRADE"
                        ? [
                              {
                                  sourceSlotKey: "helmet",
                                  sourceDrifIndex: 0,
                                  targetTemplateId: 60,
                                  targetLevel: 6,
                              },
                          ]
                        : undefined,
            };
            source.allowedBackpackIds = ["selected", "unused"];
            const original = structuredClone(source.backpack);
            expect(() => applyReorganization(source)).toThrow(/nie pozwala użyć/);
            expect(source.backpack).toEqual(original);
        }
    );
    it("upgrades only the explicitly selected equipped occurrence without duplicating it", () => {
        const source = input();
        source.reorganizationOptions = {
            task: "UPGRADE",
            maxMoves: 1,
            goal: "CRITICAL_CHANCE",
            allowUnequip: false,
            upgrade: {
                sourceSlotKey: "helmet",
                sourceDrifIndex: 0,
                targetTemplateId: 60,
                targetLevel: 6,
            },
        };
        source.reorganizationDrifUsages = [
            {
                entryId: null,
                sourceSlotKey: "helmet",
                sourceDrifIndex: 0,
                slotKey: "helmet",
                drifIndex: 0,
            },
        ];
        expect(applyReorganization(source)).toEqual(source.backpack);
        source.nextSlots.helmet.drifLevels[0] = 5;
        expect(() => applyReorganization(source)).toThrow(/nieposiadanego/);
    });
    it("rejects silently returning an equipped stone and using an excluded backpack occurrence", () => {
        const source = input();
        source.reorganizationOptions = { task: "ARRANGE", allowUnequip: false };
        expect(() => applyReorganization(source)).toThrow(/bez zgody/);
        source.reorganizationOptions.allowUnequip = true;
        source.allowedBackpackIds = [];
        expect(() => applyReorganization(source)).toThrow(/wybranej puli/);
    });
    it("swaps equipped occurrences between slots while preserving sparse socket indexes", () => {
        const source = input();
        source.previousSlots.armor = slot(2, [60], { 0: 6 });
        source.nextSlots = {
            helmet: slot(1, [null, 60], { 1: 6 }),
            armor: slot(2, [60], { 0: 2 }),
        };
        source.reorganizationDrifUsages = [
            {
                entryId: null,
                sourceSlotKey: "armor",
                sourceDrifIndex: 0,
                slotKey: "helmet",
                drifIndex: 1,
            },
            {
                entryId: null,
                sourceSlotKey: "helmet",
                sourceDrifIndex: 0,
                slotKey: "armor",
                drifIndex: 0,
            },
        ];
        const before = structuredClone(source);
        expect(applyReorganization(source)).toEqual(source.backpack);
        expect(source).toEqual(before);
    });

    it("can fill the last backpack slot with an unused equipped drif", () => {
        const source = input();
        source.backpack = Array.from({ length: 199 }, (_, index) => ({
            id: `kept-${index}`,
            kind: "DRIF",
            templateId: "60",
            level: 1,
        }));
        source.nextSlots.helmet = slot(1);
        source.reorganizationDrifUsages = [];
        const next = applyReorganization(source);
        expect(next).toHaveLength(200);
        expect(next.slice(0, 199)).toEqual(source.backpack);
        expect(next[199]).toMatchObject({ kind: "DRIF", templateId: "60", level: 2 });
        expect(next[199].sendToBackend).toBeFalsy();
    });

    it("exchanges occurrences atomically even when the backpack is full", () => {
        const source = input();
        source.backpack.push(
            ...Array.from({ length: 198 }, (_, index) => ({
                id: `kept-${index}`,
                kind: "DRIF",
                templateId: "60",
                level: 1,
            }))
        );
        const next = applyReorganization(source);
        expect(next).toHaveLength(200);
        expect(next.some((entry) => entry.id === "selected")).toBe(false);
        expect(next.filter((entry) => entry.level === 2)).toHaveLength(1);
        expect(next.slice(0, 199)).toEqual(source.backpack.slice(1));
    });

    it.each([
        [
            "item",
            (s) => {
                s.nextSlots.helmet.itemId = 2;
            },
        ],
        [
            "stars",
            (s) => {
                s.nextSlots.helmet.itemStars = 2;
            },
        ],
        [
            "orbs",
            (s) => {
                s.nextSlots.helmet.orbIds = [50];
                s.nextSlots.helmet.orbLevels = [1];
            },
        ],
    ])(
        "rejects a result changing %s without altering either source inventory",
        (_field, mutate) => {
            const source = input();
            mutate(source);
            const before = structuredClone(source);
            expect(() => applyReorganization(source)).toThrow(/przedmiot|gwiazdki|orby/);
            expect(source).toEqual(before);
        }
    );

    it("rejects reusing a backpack occurrence in two different slots", () => {
        const source = input();
        source.previousSlots.armor = slot(2);
        source.nextSlots.armor = slot(2, [60], { 0: 6 });
        source.reorganizationDrifUsages.push({
            ...source.reorganizationDrifUsages[0],
            slotKey: "armor",
        });
        expect(() => applyReorganization(source)).toThrow(/plecaka/);
    });

    it("rejects moving a locked equipped source into an unlocked slot", () => {
        const source = input();
        source.lockedDrifs = { helmet: [0] };
        source.nextSlots.helmet = slot(1, [60], { 0: 2 });
        source.previousSlots.armor = slot(2);
        source.nextSlots.armor = slot(2, [60], { 0: 2 });
        source.reorganizationDrifUsages = [
            {
                entryId: null,
                sourceSlotKey: "helmet",
                sourceDrifIndex: 0,
                slotKey: "armor",
                drifIndex: 0,
            },
        ];
        expect(() => applyReorganization(source)).toThrow(/nieposiadanego/);
    });

    it("rejects changes to a built-in stone even when it is not explicitly locked", () => {
        const source = input();
        source.builtInSlots = ["helmet"];
        source.reorganizationDrifUsages = [];
        expect(() => applyReorganization(source)).toThrow(/wbudowane/);
    });
    it("consumes the exact selected occurrence and returns the unused equipped stone", () => {
        const next = applyReorganization(input());
        expect(next).toHaveLength(2);
        expect(next[0].id).toBe("unused");
        expect(next[1]).toMatchObject({
            kind: "DRIF",
            templateId: "60",
            level: 2,
        });
    });
    it("moves an equipped stone without duplicating or consuming identical backpack copies", () => {
        const source = input();
        source.nextSlots.helmet.drifLevels = { 0: 2 };
        source.reorganizationDrifUsages = [
            {
                entryId: null,
                sourceSlotKey: "helmet",
                sourceDrifIndex: 0,
                slotKey: "helmet",
                drifIndex: 0,
            },
        ];
        expect(applyReorganization(source)).toEqual(source.backpack);
    });
    it("rejects missing mappings, level changes, repeated sources and fixed destinations atomically", () => {
        for (const mutate of [
            (s) => {
                s.reorganizationDrifUsages = [];
            },
            (s) => {
                s.nextSlots.helmet.drifLevels[0] = 5;
            },
            (s) => {
                s.reorganizationDrifUsages.push(s.reorganizationDrifUsages[0]);
            },
            (s) => {
                s.lockedDrifs = { helmet: [0] };
            },
            (s) => {
                s.lockedSlots = ["helmet"];
            },
            (s) => {
                s.reorganizationDrifUsages[0].sourceSlotKey = "helmet";
            },
            (s) => {
                s.backpack[0].sendToBackend = false;
            },
        ]) {
            const source = input();
            mutate(source);
            const snapshot = structuredClone(source);
            expect(() => applyReorganization(source)).toThrow();
            expect(source).toEqual(snapshot);
        }
    });
    it("rejects duplication of an equipped source into two different sockets", () => {
        const source = input();
        source.nextSlots.helmet.drifLevels[0] = 2;
        source.previousSlots.armor = slot(2);
        source.nextSlots.armor = slot(2, [60], { 0: 2 });
        source.reorganizationDrifUsages = ["helmet", "armor"].map((slotKey) => ({
            entryId: null,
            sourceSlotKey: "helmet",
            sourceDrifIndex: 0,
            slotKey,
            drifIndex: 0,
        }));
        expect(() => applyReorganization(source)).toThrow(/nieposiadanego/);
    });
    it("checks backpack capacity before returning unused stones", () => {
        const source = input();
        source.backpack = Array.from({ length: 200 }, (_, index) => ({
            id: `spare-${index}`,
            kind: "DRIF",
            templateId: "60",
            level: 1,
        }));
        source.nextSlots.helmet = slot(1);
        source.reorganizationDrifUsages = [];
        expect(() => applyReorganization(source)).toThrow(/Brak miejsca/);
    });
});
