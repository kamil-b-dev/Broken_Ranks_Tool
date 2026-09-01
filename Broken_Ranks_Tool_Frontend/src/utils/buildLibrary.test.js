import { beforeEach, describe, expect, it } from "vitest";
import {
    BUILD_LIBRARY_STORAGE_KEY,
    MAX_SAVED_BUILDS,
    createLocalBuildRecord,
    normalizeBuildName,
    readBuildLibrary,
    replaceLocalBuildRecord,
    writeBuildLibrary,
} from "./buildLibrary";

const snapshot = (itemId = 1) => ({
    payload: {
        format: "broken-ranks-tool-build",
        version: 1,
        build: { requestData: { slots: { helmet: { itemId } } } },
    },
    stats: { Atak: 120 },
    statSources: { orbBonusTypes: [] },
});

describe("buildLibrary", () => {
    beforeEach(() => localStorage.clear());

    it("creates a detached named record and preserves its identity when overwritten", () => {
        const record = createLocalBuildRecord({
            name: "  Build   ognia  ",
            snapshot: snapshot(),
            id: "build-1",
            savedAt: "2026-09-01T10:00:00.000Z",
        });
        record.payload.build.requestData.slots.helmet.itemId = 99;

        const overwritten = replaceLocalBuildRecord(
            record,
            snapshot(2),
            "2026-09-01T11:00:00.000Z"
        );

        expect(normalizeBuildName("   ")).toBe("Nowy build");
        expect(overwritten).toMatchObject({
            id: "build-1",
            name: "Build ognia",
            savedAt: "2026-09-01T10:00:00.000Z",
            updatedAt: "2026-09-01T11:00:00.000Z",
        });
        expect(overwritten.payload.build.requestData.slots.helmet.itemId).toBe(2);
    });

    it("round-trips a versioned library and ignores damaged storage", () => {
        const record = createLocalBuildRecord({ name: "PvE", snapshot: snapshot(), id: "pve" });
        writeBuildLibrary([record]);

        expect(readBuildLibrary()).toEqual([record]);
        localStorage.setItem(BUILD_LIBRARY_STORAGE_KEY, "invalid");
        expect(readBuildLibrary()).toEqual([]);
    });

    it("enforces the ten-build limit", () => {
        const builds = Array.from({ length: MAX_SAVED_BUILDS + 1 }, (_, index) =>
            createLocalBuildRecord({ name: `Build ${index}`, snapshot: snapshot(), id: `${index}` })
        );
        expect(() => writeBuildLibrary(builds)).toThrow("maksymalnie 10 buildów");
    });
});
