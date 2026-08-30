import { afterEach, describe, expect, it, vi } from "vitest";
import {
    BUILD_FILE_FORMAT,
    BUILD_FILE_VERSION,
    MAX_BUILD_FILE_SIZE,
    createBuildPayload,
    downloadBuildPayload,
    parseBuildFile,
} from "./buildFile";

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

const gameData = {
    items: [{ id: 1 }],
    orbs: [{ id: 2 }],
    drifs: [{ id: 3 }],
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
            characterConfig: { level: 140 },
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
});
