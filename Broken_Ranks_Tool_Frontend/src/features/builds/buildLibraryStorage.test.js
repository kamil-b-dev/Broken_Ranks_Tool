import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    BUILD_LIBRARY_STORAGE_KEY,
    MAX_SAVED_BUILDS,
    createLocalBuildRecord,
    normalizeBuildName,
    readBuildLibrary,
    replaceLocalBuildRecord,
    writeBuildLibrary,
    readBuildLibraryState,
    recoverBuildLibrary,
    BUILD_LIBRARY_RECOVERY_KEY,
} from "./buildLibraryStorage";

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
    afterEach(() => vi.restoreAllMocks());

    it.each([
        "invalid JSON",
        "unsupported version",
        "partial damage",
        "duplicate IDs",
        "too many builds",
    ])("blocks destructive writes for %s until exact original bytes have been archived", (kind) => {
        const record = createLocalBuildRecord({ name: "Keep", snapshot: snapshot(), id: "keep" });
        const raw =
            kind === "invalid JSON"
                ? "{broken"
                : JSON.stringify({
                      version: kind === "unsupported version" ? 999 : 1,
                      builds:
                          kind === "partial damage"
                              ? [record, null]
                              : kind === "duplicate IDs"
                                ? [record, record]
                                : kind === "too many builds"
                                  ? Array.from({ length: 11 }, (_, index) => ({
                                        ...record,
                                        id: String(index),
                                    }))
                                  : [record],
                  });
        localStorage.setItem(BUILD_LIBRARY_STORAGE_KEY, raw);
        expect(readBuildLibraryState().rejected).toBe(true);
        expect(() => writeBuildLibrary([])).toThrow("Zapis jest zablokowany");
        expect(localStorage.getItem(BUILD_LIBRARY_STORAGE_KEY)).toBe(raw);
        const expected = readBuildLibraryState().builds;
        expect(recoverBuildLibrary()).toEqual(expected);
        expect(localStorage.getItem(BUILD_LIBRARY_RECOVERY_KEY)).toBe(raw);
        expect(readBuildLibraryState().rejected).toBe(false);
        expect(readBuildLibrary()).toEqual(expected);
    });

    it("does not overwrite original data when recovery runs out of space", () => {
        const storage = {
            getItem: (key) => (key === BUILD_LIBRARY_STORAGE_KEY ? "original" : null),
            setItem: vi.fn(() => {
                throw new DOMException("full", "QuotaExceededError");
            }),
        };
        expect(() => recoverBuildLibrary(storage)).toThrow();
        expect(storage.setItem).toHaveBeenCalledTimes(1);
        expect(storage.setItem.mock.calls[0][0]).toBe(BUILD_LIBRARY_RECOVERY_KEY);
        expect(storage.getItem(BUILD_LIBRARY_STORAGE_KEY)).toBe("original");
    });

    it("preserves an older recovery copy when another damaged library is recovered", () => {
        localStorage.setItem(BUILD_LIBRARY_RECOVERY_KEY, "older backup");
        localStorage.setItem(BUILD_LIBRARY_STORAGE_KEY, "new damage");
        recoverBuildLibrary();
        expect(localStorage.getItem(BUILD_LIBRARY_RECOVERY_KEY)).toBe("older backup");
        const extra = Object.keys(localStorage).find((key) =>
            key.startsWith(BUILD_LIBRARY_RECOVERY_KEY + ".")
        );
        expect(localStorage.getItem(extra)).toBe("new damage");
    });

    it("returns an empty library and reports unavailable storage when the getter throws", () => {
        vi.spyOn(globalThis, "localStorage", "get").mockImplementation(() => {
            throw new DOMException("Storage blocked", "SecurityError");
        });

        expect(readBuildLibrary()).toEqual([]);
        expect(() => writeBuildLibrary([])).toThrow(
            "Pamięć lokalna przeglądarki jest niedostępna."
        );
    });

    it("honors injected storage when browser storage is inaccessible", () => {
        const storage = localStorage;
        vi.spyOn(globalThis, "localStorage", "get").mockImplementation(() => {
            throw new DOMException("Storage blocked", "SecurityError");
        });
        const record = createLocalBuildRecord({ name: "PvE", snapshot: snapshot(), id: "pve" });

        writeBuildLibrary([record], storage);
        expect(readBuildLibrary(storage)).toEqual([record]);
    });

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
