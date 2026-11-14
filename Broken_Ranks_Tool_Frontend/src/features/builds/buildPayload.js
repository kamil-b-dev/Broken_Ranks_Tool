export const BUILD_FILE_FORMAT = "broken-ranks-tool-build";
import { normalizeBackpack } from "../builder/backpack/backpackSerialization.js";
export const BUILD_FILE_VERSION = 4;

const pick = (value, keys) =>
    Object.fromEntries(
        keys.filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]])
    );

/** Stable v1 wire fields: changes to editor state must not change the saved document. */
export const createVersionOneBuildPayload = ({
    requestData,
    characterConfig,
    lockedSlots,
    lockedDrifs,
}) => {
    const request = pick(requestData, ["slots", "characterStats"]);
    request.slots = Object.fromEntries(
        Object.entries(request.slots).map(([key, slot]) => [
            key,
            pick(slot, ["itemId", "itemStars", "orbIds", "orbLevels", "drifIds", "drifLevels"]),
        ])
    );
    // Detach nested containers as well: a later editor update must not change a captured save.
    return JSON.parse(
        JSON.stringify({
            format: BUILD_FILE_FORMAT,
            version: 1,
            exportedAt: new Date().toISOString(),
            build: {
                requestData: request,
                characterConfig:
                    characterConfig == null
                        ? characterConfig
                        : pick(characterConfig, ["level", "spentPoints"]),
                lockedSlots,
                lockedDrifs,
            },
        })
    );
};

/** Frozen v2 exporter; selection metadata belongs to v3. */
export const createVersionTwoBuildPayload = (state) => {
    const previous = createVersionOneBuildPayload(state);
    return {
        ...previous,
        version: 2,
        build: {
            ...previous.build,
            backpack: normalizeBackpack(state.backpack || [], { preserveSelection: false }),
        },
    };
};
export const createVersionThreeBuildPayload = (state) => {
    const previous = createVersionOneBuildPayload(state);
    return {
        ...previous,
        version: 3,
        build: {
            ...previous.build,
            backpack: normalizeBackpack(state.backpack || []),
        },
    };
};

export const createBuildPayload = (state) => {
    const payload = createVersionThreeBuildPayload(state);
    payload.version = BUILD_FILE_VERSION;
    for (const [key, slot] of Object.entries(state.requestData.slots)) {
        if (slot.synergetic)
            payload.build.requestData.slots[key].synergetic = structuredClone(slot.synergetic);
    }
    return payload;
};
