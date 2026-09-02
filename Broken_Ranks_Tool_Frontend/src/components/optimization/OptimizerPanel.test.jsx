import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OptimizerPanel from "./OptimizerPanel";
import { useEquipment } from "../../context/EquipmentContext";

vi.mock("../../context/EquipmentContext", () => ({
    useEquipment: vi.fn(),
}));

const optimizationResult = {
    success: true,
    applied: false,
    message: "Znaleziono konfigurację.",
    drifsPlaced: 0,
    executionTimeSeconds: 0,
    warnings: [],
    goalResults: [],
    itemsByDrifBonus: {},
    nextVariants: [],
};

const equipment = {
    gameRules: {
        bonusTranslations: {
            CRITICAL_CHANCE: "Szansa na krytyk",
            ARMOR: "Pancerz",
        },
        drifBonusCategories: {
            CRITICAL_CHANCE: "OFFENSIVE",
            ARMOR: "DEFENSIVE",
        },
        drifBasePowers: {
            CRITICAL_CHANCE: 5,
            ARMOR: 10,
        },
        drifMaxCaps: {
            CRITICAL_CHANCE: 50,
            ARMOR: null,
        },
        drifPenaltyMultipliers: {},
    },
    drifCategories: {
        OFFENSIVE: "Ofensywne",
        DEFENSIVE: "Defensywne",
        UTILITY: "Użytkowe",
    },
    runDrifOptimization: vi.fn().mockResolvedValue(optimizationResult),
    requestData: { slots: {} },
    data: { items: [], drifs: [] },
    lockedSlots: [],
    lockedDrifs: {},
    toggleSlotLock: vi.fn(),
    toggleDrifLock: vi.fn(),
    applyOptimizationSetup: vi.fn(),
};

const settings = {
    forceMaximizationByDrifBonus: true,
    generateVariants: true,
    maxVariantLossPercent: 125,
};

const renderPanel = (onOptimizerSettingsChange = vi.fn()) =>
    render(
        <OptimizerPanel
            optimizerSettings={settings}
            onOptimizerSettingsChange={onOptimizerSettingsChange}
        />
    );

describe("OptimizerPanel", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        equipment.runDrifOptimization.mockResolvedValue(optimizationResult);
        useEquipment.mockReturnValue(equipment);
        vi.spyOn(window, "alert").mockImplementation(() => {});
    });

    it("builds a normalized optimization request from the selected priority", async () => {
        const user = userEvent.setup();
        renderPanel();

        await user.click(await screen.findByText("Szansa na krytyk"));

        const quantityInputs = screen.getAllByRole("spinbutton");
        fireEvent.change(quantityInputs[0], { target: { value: "-4" } });
        fireEvent.change(quantityInputs[1], { target: { value: "99" } });
        await user.click(screen.getByRole("button", { name: /Wymuś konkretny procent/i }));
        await user.type(screen.getByRole("spinbutton", { name: /Wymuszony procent/i }), "42.5");
        await user.click(screen.getByRole("button", { name: /Uruchom optymalizację/i }));

        await waitFor(() => expect(equipment.runDrifOptimization).toHaveBeenCalledOnce());
        expect(equipment.runDrifOptimization).toHaveBeenCalledWith({
            priorities: { CRITICAL_CHANCE: 15 },
            targetQuantities: { CRITICAL_CHANCE: { min: 0, max: 12 } },
            forceCapBonuses: [],
            forcedPercentageTargets: { CRITICAL_CHANCE: 42.5 },
            maximizeBonuses: [],
            forceMaximizationByDrifBonus: true,
            generateVariants: true,
            maxVariantLossPercent: 100,
        });
    });

    it("rejects an enabled percentage target without a valid value", async () => {
        const user = userEvent.setup();
        renderPanel();

        await user.click(await screen.findByText("Szansa na krytyk"));
        await user.click(screen.getByRole("button", { name: /Wymuś konkretny procent/i }));
        await user.click(screen.getByRole("button", { name: /Uruchom optymalizację/i }));

        expect(window.alert).toHaveBeenCalledWith(
            "Podaj poprawny, nieujemny procent dla: Szansa na krytyk."
        );
        expect(equipment.runDrifOptimization).not.toHaveBeenCalled();
    });

    it("filters, selects, removes, and restores available bonuses", async () => {
        const user = userEvent.setup();
        renderPanel();

        const search = screen.getByPlaceholderText("Szukaj statystyki...");
        await user.type(search, "pancerz");
        expect(screen.getByText("Pancerz")).toBeInTheDocument();
        expect(screen.queryByText("Szansa na krytyk")).not.toBeInTheDocument();

        await user.click(screen.getByText("Pancerz"));
        expect(screen.getByRole("button", { name: /Uruchom optymalizację/i })).toBeEnabled();
        await user.click(screen.getByTitle("Usuń z priorytetów"));

        expect(screen.getByRole("button", { name: /Uruchom optymalizację/i })).toBeDisabled();
        expect(screen.getByText("Pancerz")).toBeInTheDocument();
    });

    it("imports known priorities and clamps unsafe configuration values", async () => {
        const user = userEvent.setup();
        const onSettingsChange = vi.fn();
        const { container } = renderPanel(onSettingsChange);
        const configuration = new File(
            [
                JSON.stringify({
                    format: "broken-ranks-tool-optimizer-config",
                    version: 1,
                    settings: { maxVariantLossPercent: -20 },
                    priorities: [
                        {
                            key: "CRITICAL_CHANCE",
                            weight: 99,
                            min: -3,
                            max: 40,
                            forceCap: true,
                            forcePercentage: true,
                            forcedPercentage: 25,
                            maximize: true,
                        },
                        { key: "UNKNOWN_BONUS", weight: 10 },
                    ],
                }),
            ],
            "optimizer.json",
            { type: "application/json" }
        );

        await user.upload(container.querySelector('input[type="file"]'), configuration);

        expect(await screen.findByText("Szansa na krytyk")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { expanded: true }));
        expect(screen.getByText(/waga 30 · 0–12 · cel: cap/i)).toBeInTheDocument();
        expect(window.alert).toHaveBeenCalledWith("Wczytano konfigurację: 1 priorytetów.");
        const updateSettings = onSettingsChange.mock.calls[0][0];
        expect(updateSettings(settings)).toEqual({ ...settings, maxVariantLossPercent: 0 });
    });

    it("applies a selected optimization variant to the calculator", async () => {
        const user = userEvent.setup();
        const setup = { slots: { helmet: { itemId: 7 } } };
        equipment.applyOptimizationSetup.mockReturnValue(true);
        equipment.runDrifOptimization.mockResolvedValue({
            ...optimizationResult,
            nextVariants: [
                {
                    main: false,
                    bonusName: "Alternatywa krytyczna",
                    finalValue: 40,
                    variantValue: 45,
                    gain: 5,
                    totalLoss: 1,
                    changeCount: 1,
                    score: 9,
                    changes: [],
                    statChanges: [],
                    setup,
                },
            ],
        });
        renderPanel();

        await user.click(await screen.findByText("Szansa na krytyk"));
        await user.click(screen.getByRole("button", { name: /Uruchom optymalizację/i }));
        await user.click(await screen.findByRole("button", { name: /Alternatywa krytyczna/i }));
        await user.click(screen.getByRole("button", { name: /Zastosuj wybrany wariant/i }));

        expect(equipment.applyOptimizationSetup).toHaveBeenCalledWith(setup);
    });
});
