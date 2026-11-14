import { describe, expect, it } from "vitest";
import { createLocalBuildRecord, replaceLocalBuildRecord } from "../buildLibraryStorage";
import { restoreBuildVersion, updateBuildMetadata } from "./buildVersions";
import {
    readBuildLibraryState,
    writeBuildLibrary,
    BUILD_LIBRARY_STORAGE_KEY,
} from "../buildLibraryStorage";

const snapshot = (id) => ({
    payload: { build: { requestData: { slots: { helmet: { itemId: id } } } } },
    stats: { PŻ: id },
});

describe("persistent build versions", () => {
    it("blocks writes rather than discarding malformed version metadata", () => {
        const record = {
            ...createLocalBuildRecord({ name: "A", snapshot: snapshot(1) }),
            revisions: "corrupt",
        };
        const raw = JSON.stringify({ version: 1, builds: [record] });
        const storage = {
            getItem: () => raw,
            setItem: () => {
                throw new Error("must not overwrite");
            },
        };
        expect(readBuildLibraryState(storage).rejected).toBe(true);
        expect(() => writeBuildLibrary([], storage)).toThrow("Zapis jest zablokowany");
        expect(storage.getItem(BUILD_LIBRARY_STORAGE_KEY)).toBe(raw);
    });
    it("archives a detached previous version while preserving notes and identity", () => {
        const original = {
            ...createLocalBuildRecord({ name: "Ogień", id: "one", snapshot: snapshot(1) }),
            notes: "Cel",
            tags: ["exp"],
        };
        const next = replaceLocalBuildRecord(original, snapshot(2), "2026-10-29T12:00:00Z");
        expect(next.id).toBe(original.id);
        expect(next.notes).toBe("Cel");
        expect(next.tags).toEqual(["exp"]);
        expect(next.revisions).toHaveLength(1);
        expect(next.revisions[0].payload).toEqual(original.payload);
        original.payload.build.requestData.slots.helmet.itemId = 99;
        expect(next.revisions[0].payload.build.requestData.slots.helmet.itemId).toBe(1);
    });
    it("restores a selected version and archives the replaced state without nested histories", () => {
        const original = createLocalBuildRecord({ name: "A", snapshot: snapshot(1) });
        const next = replaceLocalBuildRecord(original, snapshot(2));
        const restored = restoreBuildVersion(next, 0);
        expect(restored.payload).toEqual(original.payload);
        expect(restored.revisions.at(-1).payload).toEqual(next.payload);
        expect(restored.revisions.every((revision) => !revision.revisions)).toBe(true);
        expect(() => restoreBuildVersion(next, 10)).toThrow();
    });
    it("bounds retained versions and rejects malformed metadata", () => {
        let record = createLocalBuildRecord({ name: "A", snapshot: snapshot(1) });
        for (let i = 2; i <= 25; i++) record = replaceLocalBuildRecord(record, snapshot(i));
        expect(record.revisions).toHaveLength(10);
        expect(
            updateBuildMetadata(record, { notes: "Opis", tags: ["exp", "exp", "pvp"] })
        ).toMatchObject({ notes: "Opis", tags: ["exp", "pvp"] });
        expect(() => updateBuildMetadata(record, { notes: "a".repeat(2001), tags: [] })).toThrow();
    });
});
