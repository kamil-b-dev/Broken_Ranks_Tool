import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBuildFileActions } from "./useBuildFileActions";

describe("useBuildFileActions", () => {
    it("reports successful import and allows dismissing its notice", async () => {
        const loadBuildFromFile = vi.fn().mockResolvedValue(null);
        const { result } = renderHook(() => useBuildFileActions({ loadBuildFromFile }));
        const file = new File(["{}"], "build.json");
        const target = { files: [file], value: "build.json" };
        await act(() => result.current.loadBuild({ target }));
        expect(loadBuildFromFile).toHaveBeenCalledWith(file);
        expect(result.current.notice).toMatchObject({ type: "success" });
        act(() => result.current.dismissNotice());
        expect(result.current.notice).toBeNull();
    });

    it("reports import failures and clears the file input value", async () => {
        const loadBuildFromFile = vi.fn().mockRejectedValue(new Error("uszkodzony plik"));
        const { result } = renderHook(() => useBuildFileActions({ loadBuildFromFile }));
        const target = { files: [new File(["{}"], "build.json")], value: "build.json" };
        await act(() => result.current.loadBuild({ target }));
        expect(result.current.notice).toEqual({
            type: "error",
            message: "Nie udało się wczytać buildu: uszkodzony plik",
        });
        expect(target.value).toBe("");
    });
});
