import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBuildFileActions } from "./useBuildFileActions";
import { createElement } from "react";
import AppNotice from "../../shared/ui/AppNotice";
import { LanguageContext } from "../../shared/i18n/LanguageContext";

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

    it("shows tracker recovery counts and warnings in Polish and English", async () => {
        const loadBuildFromFile = vi.fn().mockResolvedValue({
            importedItems: 12,
            importedDrifs: 33,
            importedOrbs: 0,
            importedBackpackItems: 1,
            importedBackpackDrifs: 3,
            importedBackpackOrbs: 0,
            skippedOrbs: 14,
            skippedSkins: 3,
            warnings: [
                "Zachowano bazowe statystyki postaci bez rozdziału punktów: nie pasują do zasad rozwoju (poziom 140, punkty 564/556).",
            ],
        });
        const { result } = renderHook(() => useBuildFileActions({ loadBuildFromFile }));
        await act(() =>
            result.current.loadBuild({
                target: { files: [new File(["{}"], "bolid.json")], value: "" },
            })
        );
        expect(result.current.notice.type).toBe("warning");
        const notice = result.current.notice;
        const view = (language) =>
            createElement(
                LanguageContext.Provider,
                { value: { language } },
                createElement(AppNotice, { notice })
            );
        const rendered = render(view("pl"));
        expect(screen.getByRole("status")).toHaveTextContent(
            "Plecak: 1 przedmiotów, 3 drifów, 0 orbów."
        );
        expect(screen.getByRole("status")).toHaveTextContent("Pominięto 14 orbów");
        rendered.rerender(view("en"));
        expect(screen.getByRole("status").querySelector("p").textContent).toBe(
            "Loaded build from file bolid.json. Equipment: 12/12 items, 33 drifs, 0 orbs. Backpack: 1 items, 3 drifs, 0 orbs. Skipped 14 orbs without an unambiguous match. Skipped 3 skins. Base character stats were preserved without a point allocation: they do not match the development rules (level 140, points 564/556)."
        );
    });
});
