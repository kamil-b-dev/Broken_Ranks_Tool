import { afterEach, describe, expect, it, vi } from "vitest";
import {
    BUILD_FILE_FORMAT,
    BUILD_FILE_VERSION,
    MAX_BUILD_FILE_SIZE,
    createBuildPayload,
    downloadBuildPayload,
    parseBuildFile,
    parseBuildPayload,
} from "./buildFile";

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

const gameData = {
    items: [
        { id: 1, category: "HELMET", rarity: "RARE", tier: "X", capacity: 10 },
        { id: 5, name: "Allenor X", category: "HELMET", rarity: "EPIC", tier: "X" },
    ],
    orbs: [{ id: 2, size: "SUBORB", bonusType: "HEALTH", category: "DEFENSIVE" }],
    drifs: [
        { id: 3, size: "SUBDRIF", bonusType: "CRITICAL_CHANCE" },
        { id: 6, size: "MAGNIDRIF", bonusType: "DAMAGE_PHYSICAL" },
        { id: 7, size: "MAGNIDRIF", bonusType: "CRITICAL_CHANCE" },
        { id: 8, size: "MAGNIDRIF", bonusType: "DAMAGE_MAGIC" },
    ],
    gameRules: {
        slotOrbRules: { helmet: ["DEFENSIVE"] },
        drifBasePowers: { CRITICAL_CHANCE: 4 },
        elementalTypes: ["DAMAGE_FIRE"],
        epicBuiltInDrifs: { Allenor: ["DAMAGE_PHYSICAL", "CRITICAL_CHANCE"] },
    },
};

const createFile = (payload, size = 100) => ({
    size,
    text: vi
        .fn()
        .mockResolvedValue(typeof payload === "string" ? payload : JSON.stringify(payload)),
});

const validPayload = () => ({
    format: BUILD_FILE_FORMAT,
    version: BUILD_FILE_VERSION,
    build: {
        requestData: {
            slots: {
                helmet: { itemId: 1, orbIds: [2], drifIds: [3] },
            },
            characterStats: { strength: 10 },
        },
        characterConfig: { level: 140 },
        lockedSlots: ["helmet"],
        lockedDrifs: { helmet: [0] },
    },
});

describe("createBuildPayload", () => {
    it("creates a versioned export with an ISO timestamp", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-27T12:00:00.000Z"));

        const payload = createBuildPayload({
            requestData: { slots: {} },
            characterConfig: null,
            lockedSlots: [],
            lockedDrifs: {},
        });

        expect(payload).toMatchObject({
            format: BUILD_FILE_FORMAT,
            version: BUILD_FILE_VERSION,
            exportedAt: "2026-08-27T12:00:00.000Z",
        });
    });
});

describe("downloadBuildPayload", () => {
    it("downloads a dated JSON file and releases its object URL", () => {
        vi.useFakeTimers();
        const createObjectURL = vi.fn(() => "blob:build");
        const revokeObjectURL = vi.fn();
        Object.defineProperty(URL, "createObjectURL", {
            value: createObjectURL,
            configurable: true,
        });
        Object.defineProperty(URL, "revokeObjectURL", {
            value: revokeObjectURL,
            configurable: true,
        });
        const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

        downloadBuildPayload(validPayload(), new Date("2026-08-30T12:00:00Z"));

        expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        expect(click).toHaveBeenCalledOnce();
        vi.runAllTimers();
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:build");
    });
});

describe("parseBuildFile", () => {
    it("returns a detached, validated build", async () => {
        const payload = validPayload();

        const result = await parseBuildFile(createFile(payload), gameData);

        expect(result).toEqual({
            requestData: payload.build.requestData,
            characterConfig: expect.objectContaining({ level: 140 }),
            lockedSlots: ["helmet"],
            lockedDrifs: { helmet: [0] },
        });
        expect(result.requestData).not.toBe(payload.build.requestData);
    });

    it.each([
        [null, "Nie wybrano pliku buildu."],
        [createFile("{}", MAX_BUILD_FILE_SIZE + 1), "Plik buildu jest zbyt duży."],
        [createFile("invalid json"), "Plik nie zawiera poprawnego JSON-a."],
        [
            createFile({ format: "other", version: 1 }),
            "Nieobsługiwany format lub wersja pliku buildu.",
        ],
    ])("rejects an invalid file", async (file, message) => {
        await expect(parseBuildFile(file, gameData)).rejects.toThrow(message);
    });

    it.each([
        ["itemId", 999, "nieznanego przedmiotu"],
        ["orbIds", [999], "nieznane orby"],
        ["drifIds", [999], "nieznane drify"],
    ])("rejects unknown equipment references in %s", async (field, value, message) => {
        const payload = validPayload();
        payload.build.requestData.slots.helmet[field] = value;

        await expect(parseBuildFile(createFile(payload), gameData)).rejects.toThrow(message);
    });

    it.each([
        [
            "unknown slot",
            (payload) => (payload.build.requestData.slots.unknown = {}),
            "nieznany slot",
        ],
        [
            "mismatched item category",
            (payload) => {
                payload.build.requestData.slots.helmet.itemId = 4;
            },
            "nie pasuje",
            { ...gameData, items: [...gameData.items, { id: 4, category: "BOOTS" }] },
        ],
        [
            "invalid stars",
            (payload) => (payload.build.requestData.slots.helmet.itemStars = 10),
            "gwiazdek",
        ],
        [
            "invalid drif level",
            (payload) => (payload.build.requestData.slots.helmet.drifLevels = { 0: 7 }),
            "poziomy drifów",
        ],
        [
            "invalid character stat",
            (payload) => (payload.build.requestData.characterStats.strength = 50_001),
            "od 0 do 50000",
        ],
        ["orphaned lock", (payload) => (payload.build.lockedDrifs.helmet = [1]), "blokada drifa"],
    ])("rejects %s", async (_name, mutate, message, data = gameData) => {
        const payload = validPayload();
        mutate(payload);

        await expect(parseBuildFile(createFile(payload), data)).rejects.toThrow(message);
    });
});

describe("parseBuildPayload", () => {
    it("validates an in-memory payload used by the local library", () => {
        expect(parseBuildPayload(validPayload(), gameData)).toMatchObject({
            requestData: validPayload().build.requestData,
            lockedSlots: ["helmet"],
        });
    });

    it("accepts only the exact built-in drifs defined for an epic item", () => {
        const payload = validPayload();
        payload.build.requestData.slots.helmet = {
            itemId: 5,
            drifIds: [6, 7],
            drifLevels: { 0: 16, 1: 16 },
        };
        payload.build.lockedDrifs = {};

        expect(parseBuildPayload(payload, gameData).requestData.slots.helmet.drifIds).toEqual([
            6, 7,
        ]);

        payload.build.requestData.slots.helmet.drifIds = [8, 7];
        expect(() => parseBuildPayload(payload, gameData)).toThrow("Wbudowane drify");

        payload.build.requestData.slots.helmet.drifIds = [7, 6];
        expect(() => parseBuildPayload(payload, gameData)).toThrow("Wbudowane drify");
    });

    it("trims imported character points to the allowance for its level", () => {
        const payload = validPayload();
        payload.build.characterConfig = {
            level: 2,
            spentPoints: { Siła: 10, Zręczność: 10 },
        };

        const result = parseBuildPayload(payload, gameData);

        expect(result.characterConfig.level).toBe(2);
        expect(
            Object.values(result.characterConfig.spentPoints).reduce((sum, value) => sum + value, 0)
        ).toBe(4);
    });
});
