import { describe, expect, it } from "vitest";
import { createBuildPayload } from "../builds/buildPayload";
import {
    parseProject,
    newProject,
    stageFromPayload,
    projectPayload,
    planningRequest,
    stageBuildPayload,
} from "./progressionProject";

const data = { items: [], orbs: [], drifs: [] };
const payload = createBuildPayload({
    requestData: { slots: {}, characterStats: {} },
    characterConfig: null,
    lockedSlots: [],
    lockedDrifs: {},
    backpack: [],
});
const project = () => ({
    ...newProject(),
    target: stageFromPayload(payload, data, "target", "Cel"),
});

describe("target progression project", () => {
    it("round trips detached target inputs without restoring old reports", () => {
        const original = project();
        const saved = projectPayload(original);
        original.target = null;
        const loaded = parseProject({ ...saved, report: { outcome: "VALID_PATH" } }, data);
        expect(loaded.target.name).toBe("Cel");
        expect(loaded.report).toBeUndefined();
        expect(saved.version).toBe(2);
        expect(planningRequest(loaded, data)).toEqual({
            characterClass: "ARCHER",
            targetLevel: 140,
            targetEquipment: { slots: {}, characterStats: {} },
            resSlots: [],
            balanceStats: false,
            minItemLevelGap: 0,
        });
    });
    it("preserves the balancing option and defaults older projects to the original planner", () => {
        const input = project();
        input.balanceStats = true;
        const saved = projectPayload(input);
        const loaded = parseProject(saved, data);
        expect(loaded.balanceStats).toBe(true);
        expect(planningRequest(loaded, data).balanceStats).toBe(true);
        delete saved.project.balanceStats;
        expect(parseProject(saved, data).balanceStats).toBe(false);
        saved.project.balanceStats = "true";
        expect(() => parseProject(saved, data)).toThrow(/statystyk/);
    });
    it("round trips the item interval and rejects values outside its range", () => {
        const input = project();
        input.minItemLevelGap = 20;
        const saved = projectPayload(input);
        const loaded = parseProject(saved, data);
        expect(loaded.minItemLevelGap).toBe(20);
        expect(planningRequest(loaded, data).minItemLevelGap).toBe(20);
        delete saved.project.minItemLevelGap;
        expect(parseProject(saved, data).minItemLevelGap).toBe(0);
        for (const minItemLevelGap of [-1, 141, 2.5, "20", true]) {
            saved.project.minItemLevelGap = minItemLevelGap;
            expect(() => parseProject(saved, data)).toThrow(/Odstęp wymian/);
        }
    });
    it("rejects unknown versions, invalid reservations, and missing or contradictory target levels", () => {
        const saved = projectPayload(project());
        expect(() => parseProject({ ...saved, version: 3 }, data)).toThrow();
        for (const resSlots of [["weapon"], ["ring1", "ring1"]])
            expect(() =>
                parseProject({ ...saved, project: { ...saved.project, resSlots } }, data)
            ).toThrow();
        expect(() => planningRequest(newProject(), data)).toThrow(/docelowy/);
        saved.project.target.payload.build.characterConfig = { level: 140, spentPoints: {} };
        saved.project.target.characterLevel = 1;
        expect(() => parseProject(saved, data)).toThrow(/Poziom celu/);
    });
    it("reserves jewelry in the request while preserving the target snapshot", () => {
        const input = project();
        input.resSlots = ["ring1"];
        const request = planningRequest(input, data);
        expect(request.targetEquipment.slots.ring1.itemId).toBeNull();
        expect(request.targetEquipment.slots.ring1.orbIds).toEqual([]);
        expect(input.target.payload.build.requestData.slots.ring1).toBeUndefined();
    });
    it("migrates the last checkpoint of a legacy project explicitly and drops the old manual assumptions", () => {
        const loaded = parseProject(
            {
                format: projectPayload(project()).format,
                version: 1,
                project: {
                    characterClass: "DRUID",
                    stages: [
                        stageFromPayload(payload, data, "a", "Start"),
                        stageFromPayload(payload, data, "b", "Stary cel"),
                    ],
                    allowAcquisition: false,
                },
            },
            data
        );
        expect(loaded.target.name).toBe("Stary cel");
        expect(loaded.legacyMigration).toBe(true);
        expect(loaded.stages).toBeUndefined();
        expect(projectPayload(loaded).project.legacyMigration).toBeUndefined();
    });
    it("exports the actual generated character allocation with no target backpack or stale config", () => {
        const result = stageBuildPayload({
            stage: { characterLevel: 20, equipment: { slots: {}, characterStats: { Siła: 25 } } },
        });
        expect(result.build.requestData.characterStats).toEqual({ Siła: 25 });
        expect(result.build.characterConfig).toBeNull();
        expect(result.build.backpack).toEqual([]);
    });
});
