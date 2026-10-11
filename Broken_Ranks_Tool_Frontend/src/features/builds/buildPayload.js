export const BUILD_FILE_FORMAT = "broken-ranks-tool-build";
export const BUILD_FILE_VERSION = 1;

const pick = (value, keys) =>
    Object.fromEntries(
        keys.filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]])
    );

/** Stable v1 wire fields: changes to editor state must not change the saved document. */
export const createBuildPayload = ({ requestData, characterConfig, lockedSlots, lockedDrifs }) => {
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
            version: BUILD_FILE_VERSION,
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
