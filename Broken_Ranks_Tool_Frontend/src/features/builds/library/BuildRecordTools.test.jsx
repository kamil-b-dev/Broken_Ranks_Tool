import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BuildRecordTools from "./BuildRecordTools";
import { calculateEquipmentStats } from "../../../shared/api/equipmentApi";
import { downloadBuildCard } from "../sharing/buildCard";
import { readBuildShareLink } from "../sharing/buildShare";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
vi.mock("../../../shared/api/equipmentApi", () => ({ calculateEquipmentStats: vi.fn() }));
vi.mock("../sharing/buildCard", () => ({ downloadBuildCard: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
const record = {
    id: "a",
    name: "A",
    payload: {
        format: "broken-ranks-tool-build",
        version: 1,
        build: { requestData: { slots: {}, characterStats: {} }, lockedSlots: [], lockedDrifs: {} },
    },
};
describe("saved build tools", () => {
    it("saves metadata and recalculates a detached saved build", async () => {
        calculateEquipmentStats.mockResolvedValue({ stats: { PŻ: 300 } });
        const library = {
            updateMetadata: vi.fn(),
            updateCalculation: vi.fn(),
            createSnapshot: vi.fn(),
        };
        render(
            <BuildRecordTools
                record={record}
                data={{ items: [], drifs: [], orbs: [] }}
                library={library}
            />
        );
        fireEvent.change(screen.getByLabelText("Notatka"), { target: { value: "Plan" } });
        fireEvent.change(screen.getByLabelText("Oznaczenia (oddziel przecinkiem)"), {
            target: { value: " cel, , pve " },
        });
        fireEvent.click(screen.getByText("Zapisz opis"));
        expect(library.updateMetadata).toHaveBeenCalledWith("a", {
            notes: "Plan",
            tags: ["cel", "pve"],
        });
        await waitFor(() => expect(screen.getByText("Przelicz statystyki")).not.toBeDisabled());
        fireEvent.click(screen.getByText("Przelicz statystyki"));
        await waitFor(() =>
            expect(library.updateCalculation).toHaveBeenCalledWith(
                "a",
                JSON.stringify(record.payload),
                { stats: { PŻ: 300 } }
            )
        );
        expect(calculateEquipmentStats).toHaveBeenCalledWith({ slots: {}, characterStats: {} });
    });

    it("shares freshly calculated stats, exports a PNG and restores the selected revision", async () => {
        calculateEquipmentStats.mockResolvedValue({ PŻ: 333 });
        const library = {
            restoreVersion: vi.fn(),
            createSnapshot: () => ({ payload: record.payload }),
        };
        render(
            <BuildRecordTools
                record={{
                    ...record,
                    notes: "Plan",
                    tags: ["pve"],
                    revisions: [
                        { updatedAt: "Wczoraj", payload: record.payload },
                        { updatedAt: "Dziś", payload: record.payload },
                    ],
                }}
                data={builderCatalog}
                library={library}
            />
        );
        fireEvent.click(screen.getByText("Opis, wersje i narzędzia"));
        fireEvent.click(screen.getByText("Udostępnij link"));
        const field = await screen.findByLabelText("Link do podglądu");
        expect(readBuildShareLink(new URL(field.value).hash).stats).toEqual({ PŻ: 333 });
        fireEvent.focus(field);
        expect(field.selectionEnd).toBe(field.value.length);
        await waitFor(() => expect(screen.getByText("Pobierz PNG")).not.toBeDisabled());
        fireEvent.click(screen.getByText("Pobierz PNG"));
        expect(downloadBuildCard).toHaveBeenCalledOnce();
        await waitFor(() => expect(screen.getByText("Przywróć wersję")).not.toBeDisabled());
        fireEvent.change(screen.getByLabelText("Wersja buildu"), { target: { value: "1" } });
        fireEvent.click(screen.getByText("Przywróć wersję"));
        expect(library.restoreVersion).toHaveBeenCalledWith("a", 1);
        await waitFor(() =>
            expect(screen.getByText("Sprawdź braki do tego buildu")).not.toBeDisabled()
        );
        fireEvent.click(screen.getByText("Sprawdź braki do tego buildu"));
        await screen.findByText("Masz wszystkie potrzebne rzeczy.");
    });

    it("shows missing resources and reports a failed calculation without updating saved stats", async () => {
        const target = {
            ...record,
            payload: {
                ...record.payload,
                build: {
                    ...record.payload.build,
                    requestData: {
                        slots: { helmet: { itemId: 1, itemStars: 3 } },
                        characterStats: {},
                    },
                },
            },
        };
        const library = {
            createSnapshot: () => ({ payload: record.payload }),
            updateCalculation: vi.fn(),
        };
        render(<BuildRecordTools record={target} data={builderCatalog} library={library} />);
        fireEvent.click(screen.getByText("Opis, wersje i narzędzia"));
        fireEvent.click(screen.getByText("Sprawdź braki do tego buildu"));
        expect(await screen.findByText(/Do zdobycia/)).toHaveTextContent("Hełm podróżnika");
        await waitFor(() => expect(screen.getByText("Przelicz statystyki")).not.toBeDisabled());
        calculateEquipmentStats.mockRejectedValue({
            response: { data: { message: "Nie można przeliczyć" } },
        });
        fireEvent.click(screen.getByText("Przelicz statystyki"));
        expect(await screen.findByRole("alert")).toHaveTextContent("Nie można przeliczyć");
        expect(library.updateCalculation).not.toHaveBeenCalled();
    });
});
