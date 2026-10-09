import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBuildPayload } from "./buildFile";
import { useBuildLibrary } from "./useBuildLibrary";
import { readBuildLibrary } from "./buildLibraryStorage";

vi.mock("./buildFile", () => ({ downloadBuildPayload: vi.fn() }));

const snapshot = (itemId = 1) => ({
    payload: {
        format: "broken-ranks-tool-build",
        version: 1,
        build: { requestData: { slots: { helmet: { itemId } } } },
    },
    stats: { Atak: 100 + itemId },
    statSources: {},
});

describe("useBuildLibrary", () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("saves, loads, overwrites and removes local builds", async () => {
        let currentSnapshot = snapshot();
        const applySnapshot = vi.fn();
        const { result } = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => currentSnapshot, applySnapshot })
        );

        let saved;
        await act(async () => {
            saved = await result.current.saveCurrent("PvE");
        });
        expect(result.current.builds).toHaveLength(1);
        expect(result.current.notice.message).toContain("Zapisano lokalnie");

        await act(async () => result.current.rename(saved.id, "PvE po zmianie"));
        expect(result.current.builds[0].name).toBe("PvE po zmianie");
        expect(result.current.notice.message).toContain("Zmieniono nazwę");

        act(() => result.current.load(saved.id));
        expect(applySnapshot).toHaveBeenCalledWith(
            expect.objectContaining({ name: "PvE po zmianie" })
        );

        act(() => result.current.exportBuild(saved.id));
        expect(downloadBuildPayload).toHaveBeenCalledWith(saved.payload);
        expect(result.current.notice.message).toContain("Wyeksportowano build");

        currentSnapshot = snapshot(2);
        await act(async () => result.current.overwrite(saved.id));
        expect(result.current.builds[0].payload.build.requestData.slots.helmet.itemId).toBe(2);

        await act(async () => result.current.remove(saved.id));
        expect(result.current.builds).toEqual([]);
    });

    it("reports invalid snapshots and storage failures", async () => {
        const { result } = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => ({}), applySnapshot: vi.fn() })
        );

        await act(async () => expect(await result.current.saveCurrent("pusty")).toBeNull());
        expect(result.current.notice).toMatchObject({
            type: "error",
            message: expect.stringContaining("pustej konfiguracji"),
        });

        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("quota");
        });
        const valid = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => snapshot(), applySnapshot: vi.fn() })
        );
        await act(async () => expect(await valid.result.current.saveCurrent("PvP")).toBeNull());
        expect(valid.result.current.notice.message).toContain("quota");
    });

    it("rejects unknown records and dismisses errors", async () => {
        const { result } = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => snapshot(), applySnapshot: vi.fn() })
        );

        await act(async () => expect(await result.current.rename("missing", "nazwa")).toBe(false));
        expect(result.current.notice.message).toContain("Nie znaleziono");
        act(() => expect(result.current.load("missing")).toBe(false));
        act(() => expect(result.current.exportBuild("missing")).toBe(false));
        await act(async () => result.current.overwrite("missing"));
        expect(result.current.notice.type).toBe("error");
        await act(async () => result.current.remove("missing"));
        act(() => result.current.dismissNotice());
        expect(result.current.notice).toBeNull();
    });

    it("enforces the bounded local library", async () => {
        const { result } = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => snapshot(), applySnapshot: vi.fn() })
        );

        for (let index = 0; index < 10; index += 1) {
            await act(async () => result.current.saveCurrent(`Build ${index + 1}`));
        }
        let overflow;
        await act(async () => {
            overflow = await result.current.saveCurrent("Build 11");
        });

        expect(result.current.builds).toHaveLength(10);
        expect(overflow).toBeNull();
        expect(result.current.notice.message).toContain("maksymalnie 10 buildów");
    });

    it("merges simultaneous saves from independent instances", async () => {
        const first = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => snapshot(1), applySnapshot: vi.fn() })
        );
        const second = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => snapshot(2), applySnapshot: vi.fn() })
        );
        await act(async () => {
            await Promise.all([
                first.result.current.saveCurrent("A"),
                second.result.current.saveCurrent("B"),
            ]);
        });
        expect(readBuildLibrary().map((record) => record.name)).toEqual(["A", "B"]);
        expect(first.result.current.builds).toHaveLength(2);
        expect(second.result.current.builds).toHaveLength(2);
    });

    it("rejects a concurrent change to the same record instead of overwriting it", async () => {
        const first = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => snapshot(), applySnapshot: vi.fn() })
        );
        const second = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => snapshot(), applySnapshot: vi.fn() })
        );
        let saved;
        await act(async () => {
            saved = await first.result.current.saveCurrent("A");
        });
        let outcomes;
        await act(async () => {
            outcomes = await Promise.all([
                first.result.current.rename(saved.id, "B"),
                second.result.current.rename(saved.id, "C"),
            ]);
        });
        expect(outcomes).toEqual([true, false]);
        expect(readBuildLibrary()[0].name).toBe("B");
        expect(second.result.current.notice.message).toContain("innej karcie");
    });

    it("does not perform an unsafe write when the browser has no cross-tab lock API", async () => {
        vi.stubGlobal("navigator", {});
        const { result } = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => snapshot(), applySnapshot: vi.fn() })
        );
        await act(async () => expect(await result.current.saveCurrent("A")).toBeNull());
        expect(readBuildLibrary()).toEqual([]);
        expect(result.current.notice.message).toContain("Web Locks");
    });
});
