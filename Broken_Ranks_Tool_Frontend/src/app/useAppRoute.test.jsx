import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { requestEquipmentCatalog } from "../features/equipment/useEquipmentCatalog";
import { useAppRoute } from "./useAppRoute";

vi.mock("../features/equipment/useEquipmentCatalog", () => ({ requestEquipmentCatalog: vi.fn() }));

beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/");
});

const routes = [
    ["builder", "/builder", "/kreator"],
    ["optimizer", "/optimizer", "/optymalizator"],
    ["builds", "/builds", "/buildy"],
    ["progression", "/progression-path", "/sciezka-rozwoju"],
];

it.each(routes)("opens the canonical %s route without changing the URL", (view, path) => {
    window.history.replaceState(null, "", `${path}?ui=mobile#details`);
    const { result } = renderHook(useAppRoute);
    expect(result.current.activeView).toBe(view);
    expect(window.location.pathname).toBe(path);
    expect(window.location.search).toBe("?ui=mobile");
    expect(window.location.hash).toBe("#details");
});

it.each(routes)(
    "replaces the legacy %s URL while retaining its parameters and history state",
    (view, path, legacy) => {
        window.history.replaceState(
            { selected: "helmet" },
            "",
            `${legacy}?ui=mobile&slot=helmet#details`
        );
        const length = window.history.length;
        const { result } = renderHook(useAppRoute);
        expect(result.current.activeView).toBe(view);
        expect(window.location.pathname).toBe(path);
        expect(window.location.search).toBe("?ui=mobile&slot=helmet");
        expect(window.location.hash).toBe("#details");
        expect(window.history.state).toEqual({ selected: "helmet" });
        expect(window.history.length).toBe(length);
    }
);

it("navigates to English paths and normalizes legacy history entries", () => {
    const { result } = renderHook(useAppRoute);
    for (const [view, path] of routes) {
        act(() => result.current.navigate(view));
        expect(window.location.pathname).toBe(path);
        expect(result.current.activeView).toBe(view);
    }
    expect(requestEquipmentCatalog).toHaveBeenCalledTimes(4);
    act(() => {
        window.history.pushState(null, "", "/kreator?ui=desktop");
        window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.activeView).toBe("builder");
    expect(window.location.pathname + window.location.search).toBe("/builder?ui=desktop");
});

it("falls back to home for unknown paths", () => {
    window.history.replaceState(null, "", "/does-not-exist");
    const { result } = renderHook(useAppRoute);
    expect(result.current.activeView).toBe("home");
    expect(window.location.pathname).toBe("/");
});
