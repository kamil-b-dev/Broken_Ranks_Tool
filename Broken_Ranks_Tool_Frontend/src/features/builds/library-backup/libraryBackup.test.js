import { describe, expect, it } from "vitest";
import { createLocalBuildRecord } from "../buildLibraryStorage";
import { createBuildPayload } from "../buildPayload";
import { builderCatalog as data } from "../../../test/fixtures/equipment/builderCatalog";
import {
    createLibraryBackup,
    MAX_LIBRARY_BACKUP_SIZE,
    mergeLibraryBackup,
    parseLibraryBackup,
    planLibraryImport,
    readLibraryBackup,
} from "./libraryBackup";

const record = (id = "one", name = "Build") =>
    createLocalBuildRecord({
        id,
        name,
        snapshot: {
            payload: createBuildPayload({
                requestData: { slots: { helmet: { itemId: 1, itemStars: 1 } }, characterStats: {} },
                characterConfig: null,
                lockedSlots: [],
                lockedDrifs: {},
                backpack: [
                    { id: "owned", kind: "DRIF", templateId: "60", level: 6, sendToBackend: true },
                ],
            }),
        },
    });

describe("whole-library backups", () => {
    it("round trips names, timestamps, equipment, locks and the owned backpack selection", () => {
        const original = [record()];
        const exported = createLibraryBackup(original);
        const imported = parseLibraryBackup(JSON.parse(JSON.stringify(exported)), data);
        expect(imported).toEqual(original);
        exported.builds[0].name = "Changed";
        expect(original[0].name).toBe("Build");
    });
    it("validates every build before allowing any import", () => {
        const backup = createLibraryBackup([record("a"), record("b")]);
        backup.builds[1].payload.build.requestData.slots.helmet.itemId = 99999;
        expect(() => parseLibraryBackup(backup, data)).toThrow();
        expect(() => parseLibraryBackup(createLibraryBackup([record(), record()]), data)).toThrow();
        expect(() => parseLibraryBackup({ ...backup, version: 999 }, data)).toThrow();
    });
    it("allows a separate decision for every ID or name conflict and keeps instance ownership detached", () => {
        const existing = [record("one", "Mage")];
        const incoming = [record("one", "Renamed"), record("two", "mage")];
        const both = mergeLibraryBackup(
            existing,
            incoming,
            { one: "copy", two: "skip" },
            () => "copy-id"
        );
        expect(both.map((entry) => entry.id)).toEqual(["one", "copy-id"]);
        expect(both[1].name).toBe("Renamed (2)");
        both[1].payload.build.backpack[0].level = 1;
        expect(incoming[0].payload.build.backpack[0].level).toBe(6);
        const replaced = mergeLibraryBackup(existing, incoming, {
            one: "replace:one",
            two: "skip",
        });
        expect(replaced).toHaveLength(1);
        expect(replaced[0].name).toBe("Renamed");
        expect(() =>
            mergeLibraryBackup(existing, incoming, { one: "replace:one", two: "replace:one" })
        ).toThrow("tego samego zapisu");
    });
    it("previews and enforces the ten-build limit without discarding records", () => {
        const existing = Array.from({ length: 10 }, (_, index) =>
            record(String(index), String(index))
        );
        expect(planLibraryImport(existing, [record("new", "New")]).fits).toBe(false);
        expect(() => mergeLibraryBackup(existing, [record("new", "New")])).toThrow("limit 10");
        expect(existing).toHaveLength(10);
        expect(mergeLibraryBackup(existing, [record("new", "New")], { new: "skip" })).toEqual(
            existing
        );
    });
    it("checks size before reading and rejects invalid JSON", async () => {
        await expect(
            readLibraryBackup(
                {
                    size: MAX_LIBRARY_BACKUP_SIZE + 1,
                    text: () => {
                        throw new Error("must not read");
                    },
                },
                data
            )
        ).rejects.toThrow("10 MB");
        await expect(
            readLibraryBackup({ size: 1, text: async () => "{broken" }, data)
        ).rejects.toThrow("JSON");
    });
});
