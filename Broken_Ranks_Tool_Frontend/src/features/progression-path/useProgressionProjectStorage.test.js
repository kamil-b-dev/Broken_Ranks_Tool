import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { newProject, PROJECT_STORAGE_KEY } from "./progressionProject";
import useProgressionProjectStorage from "./useProgressionProjectStorage";

beforeEach(() => localStorage.clear());
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it("reports a failed save and recovers when the next user edit can be persisted", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw new DOMException("Full", "QuotaExceededError");
    });
    const allowed = { current: true };
    const { result, rerender } = renderHook(
        ({ project }) => useProgressionProjectStorage(project, null, allowed),
        { initialProps: { project: newProject() } }
    );
    expect(result.current[0]).toContain("Nie udało się zapisać projektu");
    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).toBeNull();
    act(() => result.current[1](null));
    rerender({ project: { ...newProject(), balanceStats: true } });
    expect(result.current[0]).toBeNull();
    expect(JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY)).project.balanceStats).toBe(true);
});

it("preserves an unsupported draft until the user explicitly replaces it", () => {
    localStorage.setItem(PROJECT_STORAGE_KEY, "unsupported draft");
    const allowed = { current: false };
    const { result, rerender } = renderHook(
        ({ project }) => useProgressionProjectStorage(project, "Unsupported version", allowed),
        { initialProps: { project: newProject() } }
    );
    expect(result.current[0]).toBe("Unsupported version");
    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).toBe("unsupported draft");
    allowed.current = true;
    act(() => result.current[1](null));
    rerender({ project: { ...newProject(), minItemLevelGap: 10 } });
    expect(JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY)).project.minItemLevelGap).toBe(10);
});

it("keeps the migration warning visible after a successful save", () => {
    const allowed = { current: true };
    const { result, rerender } = renderHook(
        ({ project }) => useProgressionProjectStorage(project, null, allowed),
        { initialProps: { project: newProject() } }
    );
    // The warning is set by the import event before its updated project is persisted.
    act(() => result.current[1]("Legacy project migrated"));
    rerender({ project: { ...newProject(), resSlots: ["ring1"] } });
    expect(result.current[0]).toBe("Legacy project migrated");
    expect(JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY)).project.resSlots).toEqual([
        "ring1",
    ]);
});
