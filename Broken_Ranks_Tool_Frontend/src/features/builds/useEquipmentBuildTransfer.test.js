import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useEquipmentBuildTransfer } from "./useEquipmentBuildTransfer";
import { parseBuildFile, parseBuildPayload } from "./buildFile";

vi.mock("./buildFile", () => ({ parseBuildFile: vi.fn(), parseBuildPayload: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
const imported = (name) => ({
    requestData: { slots: {}, characterStats: { name } },
    characterConfig: null,
    lockedSlots: [],
    lockedDrifs: {},
    backpack: [],
});
const setup = () => {
    const props = {
        data: {},
        requestData: { slots: {} },
        characterConfig: null,
        lockedSlots: [],
        lockedDrifs: {},
        backpack: [],
        setRequestData: vi.fn(),
        setCharacterConfig: vi.fn(),
        replaceLocks: vi.fn(),
        setBackpack: vi.fn(),
        restoreStats: vi.fn(),
        calculateStatsFor: vi.fn(),
        markEquipmentChanged: vi.fn(),
        onBuildImported: vi.fn(),
    };
    return { ...renderHook(() => useEquipmentBuildTransfer(props)), props };
};
it("ignores a snapshot superseded by a file before its lazy importer becomes ready", async () => {
    const file = {
        name: "new.json",
        text: async () =>
            JSON.stringify({
                format: "broken-ranks-tool-build",
                version: 3,
                build: {
                    requestData: { slots: {}, characterStats: { Siła: 14 } },
                    characterConfig: null,
                    lockedSlots: [],
                    lockedDrifs: {},
                    backpack: [],
                },
            }),
    };
    const actual = await vi.importActual("./buildFile");
    const expected = await actual.parseBuildFile(file, {});
    parseBuildFile.mockResolvedValue(expected);
    const { result, props } = setup();
    const old = result.current.loadBuildSnapshot({ payload: {} });
    const latest = result.current.loadBuildFromFile(file);
    expect(await old).toBe(false);
    await latest;
    expect(parseBuildPayload).not.toHaveBeenCalled();
    expect(props.setRequestData).toHaveBeenCalledExactlyOnceWith(expected.requestData);
});
it.each(["file", "snapshot"])(
    "retains the newer %s when a file import resolves late",
    async (newer) => {
        let finish;
        parseBuildFile
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        finish = resolve;
                    })
            )
            .mockResolvedValueOnce(imported("new"));
        parseBuildPayload.mockReturnValue(imported("new"));
        const { result, props } = setup();
        const old = result.current.loadBuildFromFile({ name: "old" });
        await waitFor(() => expect(parseBuildFile).toHaveBeenCalledTimes(1));
        if (newer === "snapshot") await result.current.loadBuildSnapshot({ payload: {} });
        else await result.current.loadBuildFromFile({ name: "new" });
        finish(imported("old"));
        expect(await old).toBe(false);
        expect(props.setRequestData).toHaveBeenCalledExactlyOnceWith(imported("new").requestData);
        expect(props.onBuildImported).toHaveBeenCalledTimes(1);
    }
);
it("suppresses an older parse failure after a successful replacement", async () => {
    let reject;
    parseBuildFile.mockImplementationOnce(
        () =>
            new Promise((_resolve, fail) => {
                reject = fail;
            })
    );
    parseBuildPayload.mockReturnValue(imported("new"));
    const { result, props } = setup();
    const old = result.current.loadBuildFromFile({});
    await waitFor(() => expect(parseBuildFile).toHaveBeenCalled());
    await result.current.loadBuildSnapshot({ payload: {} });
    reject(new Error("old"));
    expect(await old).toBe(false);
    expect(props.setRequestData).toHaveBeenCalledTimes(1);
});
