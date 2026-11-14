import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SharedBuildPreview from "./SharedBuildPreview";
import { createBuildShareLink } from "./buildShare";
import { calculateEquipmentStats } from "../../../shared/api/equipmentApi";
vi.mock("../../../shared/api/equipmentApi", () => ({ calculateEquipmentStats: vi.fn() }));
afterEach(() => window.history.replaceState({}, "", "/"));
describe("shared build preview", () => {
    it("does not replace the current build on opening or calculating a link", async () => {
        const record = {
            name: "Udostępniony",
            payload: {
                format: "broken-ranks-tool-build",
                version: 4,
                build: {
                    requestData: {
                        slots: { ring1: { synergetic: { name: "Res", stats: { PŻ: 50 } } } },
                        characterStats: {},
                    },
                    backpack: [],
                    lockedSlots: [],
                    lockedDrifs: {},
                },
            },
        };
        window.history.replaceState(
            {},
            "",
            new URL(createBuildShareLink(record, window.location.origin)).pathname +
                new URL(createBuildShareLink(record, window.location.origin)).hash
        );
        calculateEquipmentStats.mockResolvedValue({ stats: { PŻ: 50 } });
        const library = { loadSnapshot: vi.fn().mockResolvedValue(true) };
        const open = vi.fn();
        render(
            <SharedBuildPreview
                data={{ items: [], orbs: [], drifs: [] }}
                library={library}
                onOpenBuilder={open}
            />
        );
        expect(screen.getByText(/Res/)).toBeInTheDocument();
        expect(library.loadSnapshot).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText("Przelicz statystyki"));
        await waitFor(() => expect(screen.getByText("Skopiuj do kreatora")).not.toBeDisabled());
        expect(library.loadSnapshot).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText("Skopiuj do kreatora"));
        await waitFor(() => expect(open).toHaveBeenCalledOnce());
        expect(library.loadSnapshot).toHaveBeenCalledOnce();
    });
});

it("does not navigate after a rejected copy and exposes calculation or copy errors", async () => {
    const record = {
        name: "Test",
        stats: { PŻ: 1 },
        payload: {
            format: "broken-ranks-tool-build",
            version: 1,
            build: {
                requestData: { slots: {}, characterStats: {} },
                lockedSlots: [],
                lockedDrifs: {},
            },
        },
    };
    window.history.replaceState({}, "", createBuildShareLink(record, window.location.origin));
    const library = { loadSnapshot: vi.fn().mockResolvedValue(false) },
        open = vi.fn();
    render(
        <SharedBuildPreview
            data={{ items: [], orbs: [], drifs: [] }}
            library={library}
            onOpenBuilder={open}
        />
    );
    expect(screen.getByText("Zapisane statystyki")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Skopiuj do kreatora"));
    await waitFor(() => expect(screen.getByText("Skopiuj do kreatora")).not.toBeDisabled());
    expect(open).not.toHaveBeenCalled();
    library.loadSnapshot.mockRejectedValueOnce(new Error("Nie można wczytać"));
    fireEvent.click(screen.getByText("Skopiuj do kreatora"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nie można wczytać");
    await waitFor(() => expect(screen.getByText("Przelicz statystyki")).not.toBeDisabled());
    calculateEquipmentStats.mockRejectedValueOnce(new Error("Kalkulator niedostępny"));
    fireEvent.click(screen.getByText("Przelicz statystyki"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Kalkulator niedostępny");
});

it("ignores a missing share fragment and reports damaged shared data", async () => {
    window.history.replaceState({}, "", "/builds");
    const { container } = render(<SharedBuildPreview data={{ items: [], orbs: [], drifs: [] }} />);
    expect(container).toBeEmptyDOMElement();
    await act(async () => {
        window.history.replaceState({}, "", "/builds#build=invalid!");
        window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Link buildu jest uszkodzony");
});
