import { afterEach, describe, expect, it, vi } from "vitest";
import complete from "../../test/fixtures/builds/compatibility/v1-complete.json";
import minimal from "../../test/fixtures/builds/compatibility/v1-minimal.json";
import legacyContainers from "../../test/fixtures/builds/compatibility/v1-legacy-containers.json";
import savedLibrary from "../../test/fixtures/builds/compatibility/library-v1.json";
import savedDraft from "../../test/fixtures/builds/compatibility/equipment-draft-v1.json";
import emptyOrbPadding from "../../test/fixtures/builds/compatibility/v1-empty-orb-padding.json";
import {
    EQUIPMENT_DRAFT_STORAGE_KEY,
    WORKING_DRAFT_VERSION,
    LEGACY_EQUIPMENT_DRAFT_STORAGE_KEY,
    EQUIPMENT_DRAFT_VERSION,
    readEquipmentDraft,
    writeEquipmentDraft,
} from "../../app/storage/workingDraftStorage";
import legacyEpic from "../../test/fixtures/builds/legacy-epic-build.json";
import archer from "../../test/fixtures/builds/archer-endgame-build.json";
import legacyCatalog from "../../test/fixtures/builds/legacy-epic-catalog.json";
import archerAdditions from "../../test/fixtures/builds/compatibility/archer-catalog-additions.json";
import { builderCatalog } from "../../test/fixtures/equipment/builderCatalog";
import { createBuildPayload, parseBuildFile, parseBuildPayload } from "./buildFile";
import {
    BUILD_LIBRARY_STORAGE_KEY,
    BUILD_LIBRARY_VERSION,
    readBuildLibrary,
    writeBuildLibrary,
} from "./buildLibraryStorage";

const minimalState = {
    requestData: { slots: { helmet: { itemId: 1 } }, characterStats: {} },
    characterConfig: null,
    lockedSlots: [],
    lockedDrifs: {},
};
// Missing entries copied read-only from the production SQLite catalog on 2026-10-10.
const historicalCatalog = {
    ...legacyCatalog,
    items: [...legacyCatalog.items, ...archerAdditions.items],
    drifs: [...legacyCatalog.drifs, ...archerAdditions.drifs],
};
const file = (payload) => ({ size: 10_000, text: async () => JSON.stringify(payload) });
// The frozen document stays unchanged; the editor adds an unallocated new attribute.
const withIntelligenceDefault = (build) =>
    build.characterConfig
        ? {
              ...build,
              characterConfig: {
                  ...build.characterConfig,
                  spentPoints: { ...build.characterConfig.spentPoints, Inteligencja: 0 },
              },
          }
        : build;

afterEach(() => {
    vi.doUnmock("./buildPayload");
    vi.resetModules();
});

describe("saved build compatibility contract", () => {
    it("reads the frozen empty-orb padding representation without requiring an orb", () => {
        expect(parseBuildPayload(emptyOrbPadding, builderCatalog)).toEqual({
            ...minimalState,
            requestData: {
                slots: { helmet: { itemId: 1, orbIds: [], orbLevels: [] } },
                characterStats: {},
            },
        });
    });
    it.each(["payload", "file"])("loads every complete v1 field via %s", async (source) => {
        const original = structuredClone(complete);
        const result =
            source === "file"
                ? await parseBuildFile(file(complete), builderCatalog)
                : parseBuildPayload(complete, builderCatalog);
        expect(result).toEqual(withIntelligenceDefault(complete.build));
        expect(complete).toEqual(original);
        expect(parseBuildPayload(createBuildPayload(result), builderCatalog)).toEqual({
            ...result,
            backpack: [],
        });
    });

    it("keeps legacy optional-field defaults", () => {
        expect(parseBuildPayload(minimal, builderCatalog)).toEqual(minimalState);
    });

    it("still converts legacy level arrays and maps without changing equipment", () => {
        expect(parseBuildPayload(legacyContainers, builderCatalog)).toEqual({
            requestData: {
                slots: {
                    helmet: {
                        itemId: "1",
                        itemStars: null,
                        orbIds: [50],
                        orbLevels: [1],
                        drifIds: ["60"],
                        drifLevels: { 0: 6 },
                    },
                },
                characterStats: {},
            },
            characterConfig: null,
            lockedSlots: [],
            lockedDrifs: {},
        });
    });

    it.each([
        ["epic", legacyEpic],
        ["archer", archer],
    ])(
        "loads the existing historical %s fixture and retains its equipment and locks",
        (_name, payload) => {
            const imported = parseBuildPayload(payload, historicalCatalog);
            expect(imported).toEqual(withIntelligenceDefault(payload.build));
            expect(parseBuildPayload(createBuildPayload(imported), historicalCatalog)).toEqual({
                ...imported,
                backpack: [],
            });
        }
    );

    it("keeps the persisted library key, wrapper and payload readable after an update", () => {
        expect(BUILD_LIBRARY_STORAGE_KEY).toBe("broken-ranks-tool.build-library.v1");
        expect(BUILD_LIBRARY_VERSION).toBe(1);
        const values = new Map([
            ["broken-ranks-tool.build-library.v1", JSON.stringify(savedLibrary)],
        ]);
        const storage = {
            getItem: (key) => values.get(key),
            setItem: (key, value) => values.set(key, value),
        };
        const records = readBuildLibrary(storage);
        expect(records).toEqual(savedLibrary.builds);
        expect(parseBuildPayload(records[0].payload, builderCatalog)).toEqual(minimalState);
        writeBuildLibrary(records, storage);
        expect(JSON.parse(values.get("broken-ranks-tool.build-library.v1"))).toEqual(savedLibrary);
    });

    it("reads v1 even after a future exporter changes its format and version constants", async () => {
        vi.resetModules();
        vi.doMock("./buildPayload", async (importOriginal) => ({
            ...(await importOriginal()),
            BUILD_FILE_FORMAT: "future-build-format",
            BUILD_FILE_VERSION: 999,
        }));
        const future = await import("./buildFile");
        expect(future.BUILD_FILE_VERSION).toBe(999);
        expect(future.parseBuildPayload(complete, builderCatalog)).toEqual(
            withIntelligenceDefault(complete.build)
        );
        expect(await future.parseBuildFile(file(complete), builderCatalog)).toEqual(
            withIntelligenceDefault(complete.build)
        );
        // Extra historical metadata must not turn a recognized app save into a game import.
        expect(
            await future.parseBuildFile(
                file({ ...complete, stats: {}, equipped: {}, equipmentList: [] }),
                builderCatalog
            )
        ).toEqual(withIntelligenceDefault(complete.build));
    });

    it("keeps the automatic equipment draft key and document readable", () => {
        expect(LEGACY_EQUIPMENT_DRAFT_STORAGE_KEY).toBe("broken-ranks-tool.equipment-draft.v1");
        expect(EQUIPMENT_DRAFT_STORAGE_KEY).toBe("broken-ranks-tool.equipment-draft.v2");
        expect(WORKING_DRAFT_VERSION).toBe(1);
        const values = new Map([
            ["broken-ranks-tool.equipment-draft.v1", JSON.stringify(savedDraft)],
        ]);
        const storage = {
            getItem: (key) => values.get(key),
            setItem: (key, value) => values.set(key, value),
        };
        const draft = readEquipmentDraft(storage);
        expect(draft).toEqual(savedDraft.value);
        expect(parseBuildPayload(createBuildPayload(draft), builderCatalog)).toEqual({
            ...minimalState,
            backpack: [],
        });
        expect(writeEquipmentDraft(draft, storage)).toBe(true);
        expect(JSON.parse(values.get("broken-ranks-tool.equipment-draft.v1"))).toEqual(savedDraft);
        expect(JSON.parse(values.get(EQUIPMENT_DRAFT_STORAGE_KEY))).toEqual({
            version: EQUIPMENT_DRAFT_VERSION,
            value: { ...draft, backpack: [] },
        });
    });

    it.each([0, 3, 999, "1", null])(
        "rejects unsupported version %s rather than guessing a migration",
        (version) => {
            expect(() => parseBuildPayload({ ...complete, version }, builderCatalog)).toThrow(
                "Nieobsługiwany format lub wersja"
            );
        }
    );
});
