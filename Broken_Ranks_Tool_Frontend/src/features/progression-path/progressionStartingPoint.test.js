import { describe, expect, it } from "vitest";
import {
    newProject,
    stageFromPayload,
    planningRequest,
    parseProject,
    projectPayload,
} from "./progressionProject";
import { createBuildPayload } from "../builds/buildPayload";
import { progressionInputKey } from "./progressionProgress";
const data = { items: [], orbs: [], drifs: [] };
const build = (level) =>
    createBuildPayload({
        requestData: { slots: {}, characterStats: {} },
        characterConfig: { level, spentPoints: {} },
        lockedSlots: [],
        lockedDrifs: {},
        backpack: [],
    });
describe("progression starting point and required items", () => {
    it("preserves a detached starting build and includes it in the progress identity", () => {
        const original = {
            ...newProject(),
            target: stageFromPayload(build(140), data),
            startingPoint: stageFromPayload(build(80), data, "start", "Obecny"),
            requiredItems: [],
        };
        const parsed = parseProject(projectPayload(original), data);
        expect(planningRequest(parsed, data).startingPoint).toMatchObject({
            characterLevel: 80,
            equipment: { slots: {} },
            backpack: [],
        });
        const key = progressionInputKey(parsed);
        parsed.startingPoint.characterLevel = 81;
        expect(progressionInputKey(parsed)).not.toBe(key);
    });
    it("rejects a starting level beyond the target and duplicate required slot/level pairs", () => {
        const value = {
            ...newProject(),
            target: stageFromPayload(build(80), data),
            startingPoint: stageFromPayload(build(90), data),
            requiredItems: [],
        };
        expect(() => planningRequest(value, data)).toThrow();
        value.startingPoint = null;
        value.requiredItems = [
            { slot: "helmet", characterLevel: 70, itemId: 99 },
            { slot: "helmet", characterLevel: 70, itemId: 99 },
        ];
        expect(() => parseProject(projectPayload(value), data)).toThrow();
    });
});
