import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBuildFileActions } from "./useBuildFileActions";

describe("useBuildFileActions", () => {
    it("reports successful export and allows dismissing its notice", () => {
        const saveBuildToFile = vi.fn();
        const { result } = renderHook(() => useBuildFileActions({ saveBuildToFile, loadBuildFromFile: vi.fn() }));
        act(() => result.current.saveBuild());
        expect(saveBuildToFile).toHaveBeenCalledOnce();
        expect(result.current.notice).toMatchObject({ type: "success" });
        act(() => result.current.dismissNotice());
        expect(result.current.notice).toBeNull();
    });

    it("reports import failures and clears the file input value", async () => {
        const loadBuildFromFile = vi.fn().mockRejectedValue(new Error("uszkodzony plik"));
        const { result } = renderHook(() => useBuildFileActions({ saveBuildToFile: vi.fn(), loadBuildFromFile }));
        const target = { files: [new File(["{}"], "build.json")], value: "build.json" };
        await act(() => result.current.loadBuild({ target }));
        expect(result.current.notice).toEqual({ type: "error", message: "Nie udało się wczytać buildu: uszkodzony plik" });
        expect(target.value).toBe("");
    });
});
