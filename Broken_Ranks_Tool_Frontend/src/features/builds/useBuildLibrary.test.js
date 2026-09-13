import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBuildPayload } from "./buildFile";
import { useBuildLibrary } from "./useBuildLibrary";

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
    afterEach(() => vi.restoreAllMocks());

    it("saves, loads, overwrites and removes local builds", () => {
        let currentSnapshot = snapshot();
        const applySnapshot = vi.fn();
        const { result } = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => currentSnapshot, applySnapshot })
        );

        let saved;
        act(() => {
            saved = result.current.saveCurrent("PvE");
        });
        expect(result.current.builds).toHaveLength(1);
        expect(result.current.notice.message).toContain("Zapisano lokalnie");

        act(() => result.current.rename(saved.id, "PvE po zmianie"));
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
        act(() => result.current.overwrite(saved.id));
        expect(result.current.builds[0].payload.build.requestData.slots.helmet.itemId).toBe(2);

        act(() => result.current.remove(saved.id));
        expect(result.current.builds).toEqual([]);
    });

    it("reports invalid snapshots and storage failures", () => {
        const { result } = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => ({}), applySnapshot: vi.fn() })
        );

        act(() => expect(result.current.saveCurrent("pusty")).toBeNull());
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
        act(() => expect(valid.result.current.saveCurrent("PvP")).toBeNull());
        expect(valid.result.current.notice.message).toContain("quota");
    });

    it("rejects unknown records and dismisses errors", () => {
        const { result } = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => snapshot(), applySnapshot: vi.fn() })
        );

        act(() => expect(result.current.rename("missing", "nazwa")).toBe(false));
        expect(result.current.notice.message).toContain("Nie znaleziono");
        act(() => expect(result.current.load("missing")).toBe(false));
        act(() => expect(result.current.exportBuild("missing")).toBe(false));
        act(() => result.current.overwrite("missing"));
        expect(result.current.notice.type).toBe("error");
        act(() => result.current.remove("missing"));
        act(() => result.current.dismissNotice());
        expect(result.current.notice).toBeNull();
    });

    it("enforces the bounded local library", () => {
        const { result } = renderHook(() =>
            useBuildLibrary({ createSnapshot: () => snapshot(), applySnapshot: vi.fn() })
        );

        for (let index = 0; index < 10; index += 1) {
            act(() => result.current.saveCurrent(`Build ${index + 1}`));
        }
        let overflow;
        act(() => {
            overflow = result.current.saveCurrent("Build 11");
        });

        expect(result.current.builds).toHaveLength(10);
        expect(overflow).toBeNull();
        expect(result.current.notice.message).toContain("maksymalnie 10 buildów");
    });
});
