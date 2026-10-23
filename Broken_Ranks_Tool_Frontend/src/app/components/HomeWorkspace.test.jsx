import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import HomeWorkspace from "./HomeWorkspace";

it("continues the draft and opens the three most recently updated builds", () => {
    const open = vi.fn(),
        onContinue = vi.fn(),
        onImport = vi.fn(),
        onOpenLibrary = vi.fn();
    const builds = [1, 4, 2, 3].map((number) => ({
        id: String(number),
        name: `Build ${number}`,
        savedAt: `2026-10-0${number}T10:00:00.000Z`,
    }));
    render(
        <HomeWorkspace
            builds={builds}
            hasWorkingBuild
            onContinue={onContinue}
            onImport={onImport}
            onOpenBuild={open}
            onOpenLibrary={onOpenLibrary}
        />
    );
    expect(
        within(screen.getByRole("list"))
            .getAllByRole("listitem")
            .map((row) => row.textContent)
    ).toEqual([
        expect.stringContaining("Build 4"),
        expect.stringContaining("Build 3"),
        expect.stringContaining("Build 2"),
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Kontynuuj build" }));
    fireEvent.click(screen.getByRole("button", { name: "Importuj build" }));
    fireEvent.click(screen.getByRole("button", { name: "Otwórz bibliotekę" }));
    fireEvent.click(screen.getByRole("button", { name: "Otwórz build: Build 4" }));
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onImport).toHaveBeenCalledOnce();
    expect(onOpenLibrary).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith("4");
});

it("offers creation without a draft and disables catalog-dependent actions during loading", () => {
    render(<HomeWorkspace mobile disabled />);
    expect(screen.getByRole("heading", { name: "Broken Ranks Tool", level: 1 })).toBeVisible();
    expect(screen.getByRole("button", { name: "Utwórz build" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Importuj build" })).toBeDisabled();
    expect(screen.getByText("Nie masz jeszcze zapisanych buildów.")).toBeVisible();
});
