export const BUILD_FILE_FORMAT = "broken-ranks-tool-build";
export const BUILD_FILE_VERSION = 1;

/** A small snapshot serializer independent of file parsing and catalog validation. */
export const createBuildPayload = ({ requestData, characterConfig, lockedSlots, lockedDrifs }) => ({
    format: BUILD_FILE_FORMAT,
    version: BUILD_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    build: { requestData, characterConfig, lockedSlots, lockedDrifs },
});
