import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    PROGRESSION_PROGRESS_KEY,
    progressionInputKey,
    progressionPlanKey,
    readProgressionProgress,
    restoreProgressionProgress,
    writeProgressionProgress,
} from "./progressionProgress";

const project = () => ({
    characterClass: "ARCHER",
    target: {
        characterLevel: 140,
        name: "First",
        payload: {
            exportedAt: "today",
            build: {
                requestData: { slots: { helmet: { itemId: 1, itemStars: 1 } }, characterStats: {} },
            },
        },
    },
    resSlots: [],
    balanceStats: false,
    minItemLevelGap: 0,
});
const report = () => ({
    stages: [
        {
            stage: {
                id: "stage1",
                characterLevel: 20,
                equipment: { slots: { helmet: { itemId: 1 } } },
            },
            actions: [],
        },
    ],
    resSlots: [],
});

describe("progression checkpoints", () => {
    beforeEach(() => localStorage.clear());
    it("binds input independently of names, export dates and map order, but includes all planning options", () => {
        const a = project(),
            b = project();
        b.target.name = "Renamed";
        b.target.payload.exportedAt = "tomorrow";
        expect(progressionInputKey(a)).toBe(progressionInputKey(b));
        for (const change of [
            { characterClass: "DRUID" },
            { resSlots: ["helmet"] },
            { balanceStats: true },
            { minItemLevelGap: 20 },
        ])
            expect(progressionInputKey({ ...a, ...change })).not.toBe(progressionInputKey(a));
        b.target.characterLevel = 130;
        expect(progressionInputKey(b)).not.toBe(progressionInputKey(a));
    });
    it("hashes actual instructions and equipment, ignoring runtime and opaque stage IDs", async () => {
        const a = report(),
            b = report();
        b.stages[0].stage.id = "other";
        b.executionTimeSeconds = 123;
        expect(await progressionPlanKey(a)).toBe(await progressionPlanKey(b));
        b.stages[0].stage.equipment.slots.helmet.itemId = 2;
        expect(await progressionPlanKey(a)).not.toBe(await progressionPlanKey(b));
        b.stages[0].stage.equipment.slots.helmet.itemId = 1;
        b.stages[0].actions = [{ type: "REMOVE", instanceId: "stone" }];
        expect(await progressionPlanKey(a)).not.toBe(await progressionPlanKey(b));
    });
    it("restores a matching checkpoint and requires rechecking changed plans", async () => {
        const inputKey = progressionInputKey(project()),
            planKey = await progressionPlanKey(report());
        const saved = { inputKey, planKey, playerLevel: 22, completed: [20] };
        expect(writeProgressionProgress(saved)).toBe(true);
        expect(
            restoreProgressionProgress(
                readProgressionProgress().progress,
                inputKey,
                planKey,
                [20, 140]
            )
        ).toEqual({ playerLevel: 22, completed: [20], warning: null });
        expect(restoreProgressionProgress(saved, "other", planKey, [20, 140])).toMatchObject({
            completed: [],
            warning: expect.stringContaining("Plan się zmienił"),
        });
        expect(restoreProgressionProgress(saved, inputKey, "other", [20, 140]).completed).toEqual(
            []
        );
    });
    it("does not overwrite damaged progress on read and archives it on an explicit edit", () => {
        localStorage.setItem(PROGRESSION_PROGRESS_KEY, "{broken");
        expect(readProgressionProgress().warning).toContain("ponownego sprawdzenia");
        expect(localStorage.getItem(PROGRESSION_PROGRESS_KEY)).toBe("{broken");
        expect(
            writeProgressionProgress({
                inputKey: "input",
                planKey: "a".repeat(64),
                playerLevel: 1,
                completed: [],
            })
        ).toBe(true);
        const key = Object.keys(localStorage).find((key) =>
            key.startsWith(PROGRESSION_PROGRESS_KEY + ".recovery.")
        );
        expect(localStorage.getItem(key)).toBe("{broken");
    });
    it("retains the previous checkpoint if storage is full and rejects malformed records", () => {
        const value = {
            inputKey: "input",
            planKey: "a".repeat(64),
            playerLevel: 20,
            completed: [20],
        };
        writeProgressionProgress(value);
        const raw = localStorage.getItem(PROGRESSION_PROGRESS_KEY);
        const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("quota");
        });
        expect(writeProgressionProgress({ ...value, playerLevel: 30 })).toBe(false);
        spy.mockRestore();
        expect(localStorage.getItem(PROGRESSION_PROGRESS_KEY)).toBe(raw);
        expect(writeProgressionProgress({ ...value, completed: [20, 20] })).toBe(false);
    });
});
