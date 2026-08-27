import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useEquipment } from "./context/EquipmentContext";

vi.mock("./context/EquipmentContext", async (importOriginal) => ({
    ...(await importOriginal()),
    useEquipment: vi.fn(),
}));

const equipment = {
    data: { items: [], orbs: [], drifs: [] },
    categoryNames: {},
    orbCategories: {},
    drifCategories: {},
    gameRules: {
        slotOrbRules: {},
        elementalTypes: [],
        drifBasePowers: {},
        epicBuiltInDrifs: {},
        bonusTranslations: {},
        drifBonusCategories: {},
    },
    initialDataError: null,
    requestData: { slots: {} },
    stats: null,
    statSources: {},
    isCalculatingStats: false,
    optimizationTrigger: 0,
    characterConfig: null,
    handleSlotUpdate: vi.fn(),
    handleCharacterStatsUpdate: vi.fn(),
    calculateStats: vi.fn(),
    saveBuildToFile: vi.fn(),
    loadBuildFromFile: vi.fn(),
    runDrifOptimization: vi.fn(),
    lockedSlots: [],
    lockedDrifs: [],
    toggleSlotLock: vi.fn(),
    toggleDrifLock: vi.fn(),
    applyOptimizationSetup: vi.fn(),
};

describe("App", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useEquipment.mockReturnValue(equipment);
    });

    it("navigates through the builder and optimizer workspaces", async () => {
        const user = userEvent.setup();
        render(<App />);

        expect(screen.getByRole("heading", { name: "Broken Ranks Tool" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Ekwipunek" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /Statystyki Postaci/i }));
        await user.click(screen.getByRole("button", { name: /Optymalizator drifów/i }));
        expect(screen.getByText("Ustawienia optymalizatora")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /Kreator ekwipunku/i }));
        await user.click(screen.getByRole("button", { name: /Zapisz build/i }));
        await user.click(screen.getByRole("button", { name: /Przelicz statystyki/i }));
        expect(equipment.saveBuildToFile).toHaveBeenCalledOnce();
        expect(equipment.calculateStats).toHaveBeenCalledOnce();
    });

    it("loads a selected build and reports success and failure", async () => {
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        const { container, rerender } = render(<App />);
        const input = container.querySelector('input[type="file"]');
        const file = new File(["{}"], "build.json", { type: "application/json" });

        fireEvent.change(input, { target: { files: [file] } });
        await vi.waitFor(() =>
            expect(alertSpy).toHaveBeenCalledWith("Build został poprawnie wczytany.")
        );

        equipment.loadBuildFromFile.mockRejectedValueOnce(new Error("uszkodzony plik"));
        rerender(<App />);
        fireEvent.change(input, { target: { files: [file] } });
        await vi.waitFor(() =>
            expect(alertSpy).toHaveBeenCalledWith("Nie udało się wczytać buildu: uszkodzony plik")
        );
    });

    it("shows the initial API error", () => {
        useEquipment.mockReturnValue({ ...equipment, initialDataError: "brak połączenia" });
        render(<App />);
        expect(screen.getByRole("alert")).toHaveTextContent("brak połączenia");
    });
});
