import { describe, expect, it } from "vitest";
import { createBuildPayload, createVersionThreeBuildPayload } from "../../builds/buildPayload";
import { parseBuildPayload } from "../../builds/buildFile";
import { equipmentRequestIdentity } from "../../../shared/domain/equipment/equipmentRequestIdentity";
const state = {
    requestData: {
        slots: {
            ring1: {
                itemId: null,
                synergetic: { name: "Res", stats: { PŻ: 300, "Odporność ogień": 25 } },
            },
        },
        characterStats: {},
    },
    lockedSlots: [],
    lockedDrifs: {},
    backpack: [],
};
describe("synergetic build compatibility", () => {
    it("round trips explicit values in v4 and keeps the v3 exporter frozen", () => {
        const payload = createBuildPayload(state);
        expect(payload.version).toBe(4);
        expect(parseBuildPayload(payload).requestData).toEqual(state.requestData);
        expect(
            createVersionThreeBuildPayload(state).build.requestData.slots.ring1.synergetic
        ).toBeUndefined();
    });
    it("invalidates calculation identities when synergetic values change", () => {
        const changed = structuredClone(state.requestData);
        changed.slots.ring1.synergetic.stats.PŻ++;
        expect(equipmentRequestIdentity(changed)).not.toBe(
            equipmentRequestIdentity(state.requestData)
        );
    });
    it("rejects custom items outside jewellery or with unknown stats and stones", () => {
        const payload = createBuildPayload(state);
        payload.build.requestData.slots.helmet = payload.build.requestData.slots.ring1;
        expect(() => parseBuildPayload(payload)).toThrow();
        delete payload.build.requestData.slots.helmet;
        payload.build.requestData.slots.ring1.synergetic.stats.UNKNOWN = 1;
        expect(() => parseBuildPayload(payload)).toThrow();
    });
});
