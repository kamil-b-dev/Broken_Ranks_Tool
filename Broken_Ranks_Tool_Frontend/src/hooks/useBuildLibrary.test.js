import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBuildPayload } from "../utils/buildFile";
import { useBuildLibrary } from "./useBuildLibrary";

vi.mock("../utils/buildFile", () => ({ downloadBuildPayload: vi.fn() }));

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
});
