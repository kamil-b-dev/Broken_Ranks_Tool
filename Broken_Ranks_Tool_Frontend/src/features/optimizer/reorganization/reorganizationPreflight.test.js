import { describe, expect, it } from "vitest";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import {
    reorganizationItemSpace,
    reorganizationPreflight,
    reorganizationProtection,
} from "./reorganizationPreflight";
import { reservationItems, reorganizationStones } from "./reorganizationConfiguration";

const input = () => ({
    slots: {
        helmet: { itemId: 1, itemStars: 1, drifIds: [60], drifLevels: { 0: 6 } },
        armor: { itemId: 2, drifIds: [] },
    },
    data: builderCatalog,
    gameRules: builderCatalog.gameRules,
    lockedSlots: [],
    lockedDrifs: {},
    backpack: [{ id: "chosen", kind: "DRIF", templateId: 60, level: 6 }],
});
const reserve = (freeSockets, freeCapacity) => ({
    reorganization: {
        task: "RESERVE",
        reservation: { slotKey: "helmet", freeSockets, freeCapacity },
    },
});
describe("reorganization preflight", () => {
    it("reports sockets and capacity independently and detects an already satisfied reservation", () => {
        const state = input();
        const space = reorganizationItemSpace(
            reservationItems(state)[0],
            reorganizationStones(state),
            state.gameRules
        );
        expect(space).toMatchObject({ freeSockets: 2, freeCapacity: 8 });
        expect(reorganizationPreflight(reserve(1, 8), state)).toMatchObject({
            alreadySatisfied: true,
        });
        expect(reorganizationPreflight(reserve(3, 12), state)).toMatchObject({ blocked: false });
    });
    it("names fixed stones as a proven obstruction instead of running a search", () => {
        const state = input();
        state.lockedDrifs = { helmet: [0] };
        expect(reorganizationPreflight(reserve(3, 12), state)).toMatchObject({
            blocked: true,
            message: expect.stringMatching(/Blokady/),
        });
    });
    it("does not declare an unconstrained layout feasible merely because local checks pass", () => {
        const result = reorganizationPreflight(
            { reorganization: { task: "INSERT", insertEntryId: "chosen" } },
            input()
        );
        expect(result.blocked).toBe(false);
        expect(result).not.toHaveProperty("feasible");
    });
    it("rejects targets with fixed duplicates and elemental stones outside the weapon", () => {
        const state = input();
        state.lockedDrifs = { helmet: [0] };
        expect(
            reorganizationPreflight(
                {
                    reorganization: {
                        task: "INSERT",
                        insertions: [{ entryId: "chosen", targetSlotKey: "helmet" }],
                    },
                },
                state
            ).blocked
        ).toBe(true);
        state.lockedDrifs = {};
        state.data = {
            ...builderCatalog,
            drifs: [{ ...builderCatalog.drifs[0], bonusType: "DAMAGE_FIRE" }],
        };
        expect(
            reorganizationPreflight(
                { reorganization: { task: "INSERT", insertEntryId: "chosen" } },
                state
            ).blocked
        ).toBe(true);
    });
    it("does not reject highest-level search when a lower level could fit", () => {
        const state = input();
        state.data = {
            ...builderCatalog,
            drifs: [{ ...builderCatalog.drifs[0], size: "ARCYDRIF" }],
        };
        expect(
            reorganizationPreflight(
                {
                    reorganization: {
                        task: "UPGRADE",
                        source: "helmet:0",
                        targetTemplateId: 60,
                        maximizeLevel: true,
                    },
                },
                state
            ).blocked
        ).toBe(false);
    });
    it("computes protections from capped useful values with negative reductions", () => {
        expect(reorganizationProtection("CRITICAL_CHANCE", "62%", 60, "3")).toEqual({
            value: 62,
            cap: 60,
            minimum: 57,
        });
        expect(reorganizationProtection("MANA_USAGE_REDUCTION", "-62%", -60, "3")).toEqual({
            value: -62,
            cap: -60,
            minimum: -57,
        });
        expect(reorganizationProtection("MANA_REGEN", "18,5%", null, "0,5").minimum).toBe(18);
        expect(reorganizationProtection("MANA_REGEN", "18%", null, "bad").minimum).toBeNull();
    });
});
