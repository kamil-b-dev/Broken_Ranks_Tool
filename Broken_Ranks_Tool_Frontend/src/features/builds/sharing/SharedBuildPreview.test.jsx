import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
