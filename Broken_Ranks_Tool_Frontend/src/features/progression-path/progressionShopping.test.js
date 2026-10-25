import { describe, expect, it } from "vitest";
import { createProgressionView } from "./progressionReport";
import { reportData, legendReport } from "./progressionReport.fixtures";
import {
    progressionShoppingTasks,
    groupShoppingTasks,
    shoppingListText,
} from "./progressionShopping";

describe("progression shopping", () => {
    it("does not count moves, epic transformation or upgrades as new purchases", () => {
        const { groups } = createProgressionView(legendReport(), reportData);
        const tasks = progressionShoppingTasks(groups);
        expect(tasks.filter((task) => task.category === "items")).toHaveLength(
            groups.reduce(
                (sum, group) =>
                    sum + group.purchases.reduce((count, item) => count + item.count, 0),
                0
            )
        );
        const acquisitions = tasks.filter((task) => task.category === "stones");
        expect(new Set(acquisitions.map((task) => task.id)).size).toBe(acquisitions.length);
        expect(tasks.some((task) => task.type === "MOVE")).toBe(false);
        expect(
            tasks
                .filter((task) => task.path)
                .some((task) =>
                    task.path.states.some(
                        (state) =>
                            reportData.items.find((item) => item.id === state?.itemId)?.rarity ===
                            "LEGENDARY"
                    )
                )
        ).toBe(true);
    });
    it("aggregates different physical copies but counts repeated acquisition of one ID once", () => {
        const group = {
            level: 20,
            purchases: [{ itemId: 1, count: 2 }],
            steps: [
                {
                    result: {
                        actions: [
                            { type: "ACQUIRE", instanceId: "a", templateId: 10, level: 6 },
                            { type: "ACQUIRE", instanceId: "b", templateId: 10, level: 6 },
                            { type: "MOVE", instanceId: "a", templateId: 10, level: 6 },
                        ],
                        orbActions: [],
                    },
                },
            ],
            upgrades: [],
            itemUpgrades: [],
            builtInUpgrades: [],
        };
        const tasks = progressionShoppingTasks([group, { ...group, level: 30, purchases: [] }]);
        expect(tasks.filter((task) => task.category === "stones")).toHaveLength(2);
        const entries = groupShoppingTasks(tasks);
        expect(entries).toHaveLength(2);
        expect(entries.every((entry) => entry.ids.length === 2)).toBe(true);
        const prepared = new Set(tasks.map((task) => task.id));
        const text = shoppingListText(
            entries,
            prepared,
            {
                items: [{ id: 1, name: "Pierścień" }],
                drifs: [{ id: 10, name: "Abaf", size: "BIDRIF" }],
            },
            (value) => value
        );
        expect(text).toContain("[x] 2 × Pierścień");
        expect(text).toContain("[x] 2 × Abaf");
        expect(text).not.toContain("instanceId");
    });
});
