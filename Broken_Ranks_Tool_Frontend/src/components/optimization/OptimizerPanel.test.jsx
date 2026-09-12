import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OptimizerPanel from "./OptimizerPanel";
import { useEquipment } from "../../context/EquipmentContext";
import { advisorBuildSignature } from "./advisor/advisorBuildSignature";
vi.mock("../../api/equipmentApi", () => ({
    calculateEquipmentStats: vi
        .fn()
        .mockResolvedValue({ stats: { CRITICAL_CHANCE: "18.25%", ARMOR: "5%" } }),
}));

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
    mode: "BUILD_FROM_SCRATCH",
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
            mode: "BUILD_FROM_SCRATCH",
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
        expect(updateSettings(settings)).toEqual({
            ...settings,
            advisorProfession: "AUTO",
            maxVariantLossPercent: 0,
        });
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

    it("switches to advisor mode through the visible mode selector", async () => {
        const user = userEvent.setup();
        const onSettingsChange = vi.fn();
        renderPanel(onSettingsChange);

        await user.click(screen.getByRole("button", { name: /Doradca/i }));

        expect(onSettingsChange).toHaveBeenCalledWith({ ...settings, mode: "ADVISOR" });
    });

    it("builds an advisor request and applies a recommendation for the unchanged build", async () => {
        const user = userEvent.setup();
        const currentSlots = {
            helmet: {
                itemId: 1,
                itemStars: 1,
                orbIds: [],
                orbLevels: [],
                drifIds: [],
                drifLevels: {},
            },
        };
        const recommendedSetup = {
            slots: { ...currentSlots, helmet: { ...currentSlots.helmet, itemStars: 2 } },
        };
        const recommendation = {
            ...optimizationResult,
            baselineSignature: advisorBuildSignature(currentSlots),
            nextVariants: [
                {
                    bonusName: "Lepszy krytyk",
                    finalValue: 10,
                    variantValue: 12,
                    gain: 2,
                    advisorGain: 2,
                    changeCount: 1,
                    changes: [],
                    statChanges: [],
                    setup: recommendedSetup,
                },
            ],
        };
        const advisorEquipment = {
            ...equipment,
            requestData: { slots: currentSlots, characterStats: { Siła: 100 } },
            data: { items: [], drifs: [], orbs: [] },
            stats: { CRITICAL_CHANCE: "10%" },
            calculateStats: vi.fn(),
            cancelDrifOptimization: vi.fn(),
            runDrifOptimization: vi.fn().mockResolvedValue(recommendation),
            applyOptimizationSetup: vi.fn(() => true),
        };
        useEquipment.mockReturnValue(advisorEquipment);
        render(
            <OptimizerPanel
                optimizerSettings={{
                    ...settings,
                    mode: "ADVISOR",
                    advisorGoal: "CRITICAL_CHANCE",
                    advisorProfession: "PHYSICAL",
                    advisorSearch: { targetMode: "GAIN", target: "2", maxActions: 2 },
                    advisorAllowedChanges: { stars: true },
                    advisorProtectedModifiers: {},
                }}
                onOptimizerSettingsChange={vi.fn()}
            />
        );

        await user.click(screen.getByRole("button", { name: "ANALIZUJ BUILD" }));
        await screen.findByRole("button", { name: /Lepszy krytyk/i });
        expect(advisorEquipment.runDrifOptimization).toHaveBeenCalledWith({
            mode: "ADVISOR",
            priorities: { CRITICAL_CHANCE: 30 },
            characterStats: { Siła: 100 },
            advisor: expect.objectContaining({
                goal: "CRITICAL_CHANCE",
                profession: "PHYSICAL",
                targetGain: 2,
                maxActions: 2,
            }),
        });

        await user.click(screen.getByRole("button", { name: /Zastosuj wybrany wariant/i }));
        expect(advisorEquipment.applyOptimizationSetup).toHaveBeenCalledWith(recommendedSetup);
    });

    it("refreshes missing advisor stats and rejects stale recommendations", async () => {
        const user = userEvent.setup();
        const calculateStats = vi.fn();
        const applyOptimizationSetup = vi.fn();
        const advisorEquipment = {
            ...equipment,
            requestData: { slots: { helmet: { itemId: 1 } }, characterStats: {} },
            data: { items: [], drifs: [], orbs: [] },
            stats: null,
            calculateStats,
            cancelDrifOptimization: vi.fn(),
            applyOptimizationSetup,
            runDrifOptimization: vi.fn().mockResolvedValue({
                ...optimizationResult,
                baselineSignature: "stary-build",
                nextVariants: [
                    {
                        bonusName: "Nieaktualny plan",
                        finalValue: 0,
                        variantValue: 1,
                        advisorGain: 1,
                        changeCount: 1,
                        changes: [],
                        statChanges: [],
                        setup: { slots: { helmet: { itemId: 2 } } },
                    },
                ],
            }),
        };
        useEquipment.mockReturnValue(advisorEquipment);
        render(
            <OptimizerPanel
                optimizerSettings={{ ...settings, mode: "ADVISOR" }}
                onOptimizerSettingsChange={vi.fn()}
            />
        );

        expect(calculateStats).toHaveBeenCalledOnce();
        await user.click(screen.getByRole("button", { name: "ANALIZUJ BUILD" }));
        await user.click(await screen.findByRole("button", { name: /Zastosuj wybrany wariant/i }));

        expect(window.alert).toHaveBeenCalledWith(
            "Build zmienił się od analizy. Uruchom Doradcę ponownie."
        );
        expect(applyOptimizationSetup).not.toHaveBeenCalled();
    });

    it("reports a failed advisor cancellation while preserving the running request", async () => {
        let finish;
        const cancelDrifOptimization = vi.fn().mockRejectedValue(new Error("network"));
        const runDrifOptimization = vi.fn(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                })
        );
        useEquipment.mockReturnValue({
            ...equipment,
            data: { items: [], drifs: [], orbs: [] },
            stats: { CRITICAL_CHANCE: "10%" },
            calculateStats: vi.fn(),
            cancelDrifOptimization,
            runDrifOptimization,
        });
        render(
            <OptimizerPanel
                optimizerSettings={{ ...settings, mode: "ADVISOR" }}
                onOptimizerSettingsChange={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "ANALIZUJ BUILD" }));
        await userEvent.click(
            await screen.findByRole("button", { name: /Zatrzymaj i pokaż znalezione plany/i })
        );

        expect(cancelDrifOptimization).toHaveBeenCalledOnce();
        expect(window.alert).toHaveBeenCalledWith(
            "Nie udało się zatrzymać analizy. Zakończy się po upływie limitu czasu."
        );
        await act(async () => finish(optimizationResult));
    });
});
