import { describe, expect, it } from "vitest";
import {
    createProgressionView,
    nearestProgressionGroup,
    itemUpgradeDescription,
} from "./progressionReport";

import { reportData, legendReport, position, orb } from "./progressionReport.fixtures";

describe("player progression summary", () => {
    it("distinguishes starring a purchased replacement from upgrading an epic to its legend", () => {
        const data = {
            items: [
                { id: 1, name: "Htagan" },
                { id: 2, name: "Miłość Morany" },
            ],
        };
        expect(
            itemUpgradeDescription(
                {
                    states: [
                        { itemId: 1, itemStars: 1 },
                        { itemId: 2, itemStars: 9 },
                    ],
                },
                data
            )
        ).toBe("Miłość Morany 1★ → 9★");
        const group = createProgressionView(legendReport(), reportData).groups[1];
        expect(itemUpgradeDescription(group.paths[0], reportData)).toContain(
            "Żmij · epik 9★ → Żmij · legenda 1★"
        );
    });
    it("groups a level without losing the epic prerequisite, reset, or ordered snapshots", () => {
        const report = legendReport();
        const before = structuredClone(report);
        const view = createProgressionView(report, reportData);
        expect(view.groups.map((group) => group.level)).toEqual([60, 120, 140]);
        const group = view.groups[1];
        expect(group.paths[0].states.map((slot) => [slot.itemId, slot.itemStars])).toEqual([
            [100, 1],
            [100, 9],
            [101, 1],
            [101, 9],
        ]);
        expect(group.steps.map((step) => step.result.stage.id)).toEqual([
            "epic-nine",
            "legend-one",
            "legend-nine",
        ]);
        expect(group.final.stage.id).toBe("legend-nine");
        expect(report).toEqual(before);
    });
    it("counts one reused orb rather than detach and attach operations and never buys the legend", () => {
        const groups = createProgressionView(legendReport(), reportData).groups;
        expect(groups[0].prepareCount).toBe(2); // Epic and one new orb; socketing is not another purchase.
        expect(groups[1].purchases).toEqual([]);
        expect(groups[1].prepareCount).toBe(0);
        expect(groups[1].moves).toHaveLength(1);
        expect(groups[1].upgrades).toHaveLength(1);
        expect(groups[1].moves[0].templateId).toBe(12);
        expect(groups[1].itemUpgrades).toHaveLength(1);
    });
    it("counts identical acquired drifs as separate copies while grouping the shopping list", () => {
        const report = legendReport();
        report.stages[0].actions = ["a", "b"].flatMap((instanceId) => [
            { type: "ACQUIRE", instanceId, templateId: 1, level: 6 },
            { type: "MOVE", instanceId, templateId: 1, level: 6, from: null, to: position },
        ]);
        const view = createProgressionView(report, reportData);
        expect(view.groups[0].supplies.find((entry) => entry.kind === "drif").count).toBe(2);
        expect(view.groups[0].moves).toEqual([]);
        expect(view.groups[0].steps[0].result.actions.map((action) => action.instanceId)).toEqual([
            "a",
            "a",
            "b",
            "b",
        ]);
    });
    it("does not present same-socket reinsertion into the same item as a transfer", () => {
        const report = legendReport();
        report.stages = report.stages.slice(0, 2);
        report.stages[1].orbActions = [orb("MOVE", position, null), orb("MOVE", null, position)];
        const group = createProgressionView(report, reportData).groups[1];
        expect(group.moveCount).toBe(0);
        expect(group.steps[0].result.orbActions).toHaveLength(2);
    });
    it("suggests an unfinished upcoming milestone without marking earlier levels done", () => {
        const { groups } = createProgressionView(legendReport(), reportData);
        expect(nearestProgressionGroup(groups, 100, new Set()).level).toBe(120);
        expect(nearestProgressionGroup(groups, 100, new Set([120])).level).toBe(140);
        expect(nearestProgressionGroup(groups, 140, new Set([60, 120, 140]))).toBeNull();
    });
    it("shows embedded drif upgrades without treating them as acquired transferable stones", () => {
        const report = legendReport();
        for (const entry of report.stages.slice(0, 2)) {
            entry.stage.equipment.slots.weapon.drifIds = [1];
            entry.stage.equipment.slots.weapon.drifLevels = { 0: 16 };
        }
        const { groups } = createProgressionView(report, reportData);
        expect(groups[0].builtInUpgrades).toEqual([
            {
                key: "weapon:0",
                slot: "weapon",
                itemId: 100,
                templateId: 1,
                beforeLevel: 1,
                level: 16,
            },
        ]);
        expect(groups[0].prepareCount).toBe(2);
        expect(groups[0].upgradeCount).toBe(1);
        expect(groups[0].moves).toEqual([]);
        expect(groups[1].builtInUpgrades).toEqual([]);
    });
});
