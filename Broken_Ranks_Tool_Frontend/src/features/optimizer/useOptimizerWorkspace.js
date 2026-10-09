import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useEquipment } from "../../shared/state/EquipmentContext";
import {
    createModifierDetailsCalculator,
    calculatePlacedDrifCounts,
    getDrifPenaltyMultiplier,
} from "./optimizerDomain";
import {
    buildOptimizationConfig,
    createOptimizerConfigPayload,
    findInvalidPercentageTarget,
    findInvalidSizeConstraint,
    mergeOptimizerSettings,
    parseOptimizerConfigPayload,
} from "./optimizerConfiguration";
import { useOptimizerPriorities } from "./useOptimizerPriorities";
import { useOptimizationRun } from "./useOptimizationRun";
import { useOptimizerConfigFiles } from "./useOptimizerConfigFiles";
import { createRecommendationChanges } from "./advisor/optimizerRecommendation";
import { buildAdvisorConfiguration } from "./advisor/advisorConfiguration";
import { advisorBuildSignature } from "./advisor/advisorBuildSignature";
import { readOptimizerDraft, writeOptimizerDraft } from "../../app/storage/workingDraftStorage";
import { useWorkingDraftSave } from "../../app/storage/useWorkingDraftSave";

/** Shared optimizer workflow; presentation changes never remount the current run. */
export const useOptimizerWorkspace = ({ optimizerSettings, onOptimizerSettingsChange }) => {
    const {
        gameRules,
        drifCategories,
        runDrifOptimization,
        cancelDrifOptimization,
        invalidateDrifOptimization,
        requestData,
        data,
        lockedSlots,
        lockedDrifs,
        toggleSlotLock,
        toggleDrifLock,
        applyOptimizationSetup,
        stats,
        calculateStats,
    } = useEquipment();

    const {
        prioritizedBonuses,
        availableBonuses,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        prioritySortDirection,
        expandedPriorities,
        selectBonus,
        removeBonus,
        clearAll,
        updateBonus,
        sortByPriority,
        toggleExpanded,
        toggleAllExpanded,
        replaceConfiguration,
    } = useOptimizerPriorities(gameRules);
    const {
        isOptimizing,
        elapsedSeconds: optimizationElapsedSeconds,
        startedAt: optimizationStartedAt,
        lastDurationSeconds: lastOptimizationDurationSeconds,
        status: optimizationStatus,
        activeVariantIndex,
        setActiveVariantIndex,
        reset: resetRunReport,
        run: runOptimization,
    } = useOptimizationRun(runDrifOptimization);
    const resetOptimization = useCallback(() => {
        invalidateDrifOptimization?.();
        resetRunReport();
    }, [invalidateDrifOptimization, resetRunReport]);
    const [notice, setNotice] = useState(null);
    const draftRestoredRef = useRef(false);
    const [draftReady, setDraftReady] = useState(false);
    useEffect(() => {
        if (!gameRules?.bonusTranslations) return;
        let active = true;
        if (!draftRestoredRef.current) {
            draftRestoredRef.current = true;
            const savedDraft = readOptimizerDraft();
            if (savedDraft) {
                try {
                    const imported = parseOptimizerConfigPayload(savedDraft, gameRules);
                    replaceConfiguration(imported);
                    onOptimizerSettingsChange((previous) =>
                        mergeOptimizerSettings(previous, imported)
                    );
                } catch {
                    // Ignore drafts from obsolete or malformed application versions.
                }
            }
        }
        // Let the imported priorities and parent settings commit before automatic saving.
        queueMicrotask(() => {
            if (active) setDraftReady(true);
        });
        return () => {
            active = false;
        };
    }, [gameRules, onOptimizerSettingsChange, replaceConfiguration]);
    const workingDraft = useMemo(
        () => createOptimizerConfigPayload(prioritizedBonuses, optimizerSettings),
        [optimizerSettings, prioritizedBonuses]
    );
    useWorkingDraftSave(writeOptimizerDraft, workingDraft, draftReady);
    useLayoutEffect(
        () => resetOptimization(),
        [optimizerSettings.mode, optimizerSettings.configurationMode, resetOptimization]
    );
    useEffect(() => {
        if (optimizerSettings.mode === "ADVISOR" && !stats && calculateStats) calculateStats();
    }, [calculateStats, optimizerSettings.mode, stats]);
    const configFiles = useOptimizerConfigFiles({
        priorities: prioritizedBonuses,
        settings: optimizerSettings,
        gameRules,
        replaceConfiguration,
        onSettingsChange: onOptimizerSettingsChange,
        onNotice: setNotice,
    });
    const calculateDetails = useMemo(
        () =>
            createModifierDetailsCalculator({
                slots: requestData.slots,
                drifs: data.drifs,
                items: data.items,
                gameRules,
            }),
        [data.drifs, data.items, gameRules, requestData.slots]
    );
    const currentModDetails = useMemo(
        () => prioritizedBonuses.map(calculateDetails),
        [calculateDetails, prioritizedBonuses]
    );
    const activeVariant = optimizationStatus?.nextVariants?.[activeVariantIndex];
    const reportModDetails = useMemo(() => {
        const counts = activeVariant?.setup?.slots
            ? calculatePlacedDrifCounts(activeVariant.setup.slots, data.drifs)
            : null;
        return (optimizationStatus?.goalResults || []).map((goal) => {
            const count =
                activeVariant?.advisorCounts?.[goal.statKey] ??
                counts?.[goal.statKey] ??
                (counts ? 0 : goal.placedCount);
            return {
                key: goal.statKey,
                count,
                penaltyPercent:
                    (1 - getDrifPenaltyMultiplier(count, gameRules.drifPenaltyMultipliers)) * 100,
            };
        });
    }, [
        activeVariant,
        data.drifs,
        gameRules.drifPenaltyMultipliers,
        optimizationStatus?.goalResults,
    ]);
    const displayedVariant = useMemo(() => {
        if (optimizerSettings.mode !== "ADVISOR" || !activeVariant?.setup) return activeVariant;
        return {
            ...activeVariant,
            changes: createRecommendationChanges({
                currentSlots: requestData.slots,
                suggestedSlots: activeVariant.setup?.slots,
                items: data.items,
                drifs: data.drifs,
                orbs: data.orbs,
            }),
        };
    }, [
        activeVariant,
        data.drifs,
        data.items,
        data.orbs,
        optimizerSettings.mode,
        requestData.slots,
    ]);

    /** Builds the request and starts the backend optimization process. */
    const handleOptimizeClick = async () => {
        setNotice(null);
        if (optimizerSettings.mode === "ADVISOR") {
            try {
                await runOptimization(
                    buildAdvisorConfiguration(
                        optimizerSettings,
                        stats,
                        gameRules,
                        requestData.characterStats
                    )
                );
            } catch (error) {
                setNotice({ type: "error", message: error.message });
            }
            return;
        }
        const simple = optimizerSettings.configurationMode === "SIMPLE";
        if (!simple && prioritizedBonuses.length === 0) return;
        const advanced = optimizerSettings.configurationMode === "ADVANCED";
        const invalidPercentageTarget = advanced
            ? findInvalidPercentageTarget(prioritizedBonuses)
            : null;
        if (invalidPercentageTarget) {
            setNotice({
                type: "error",
                message: `Podaj poprawny, nieujemny procent dla: ${invalidPercentageTarget.value}.`,
            });
            return;
        }
        const invalidSizeConstraint = advanced
            ? findInvalidSizeConstraint(prioritizedBonuses)
            : null;
        if (invalidSizeConstraint) {
            setNotice({
                type: "error",
                message: `Zakresy rozmiarów są nieprawidłowe lub sprzeczne z łącznym limitem dla: ${invalidSizeConstraint.value}.`,
            });
            return;
        }
        const configuration = buildOptimizationConfig(prioritizedBonuses, optimizerSettings);
        await runOptimization(configuration);
    };

    /** Applies the explicitly selected result variant to the shared equipment build. */
    const handleApplyVariant = (variant, variantIndex) => {
        if (optimizationStatus?.baselineSignature) {
            const current = advisorBuildSignature(requestData.slots);
            const constraints = JSON.stringify({
                characterStats: requestData.characterStats || {},
                lockedSlots,
                lockedDrifs,
            });
            if (
                (optimizationStatus.baselineConstraintsSignature &&
                    constraints !== optimizationStatus.baselineConstraintsSignature) ||
                (current !== optimizationStatus.baselineSignature &&
                    current !== optimizationStatus.appliedSignature &&
                    !optimizationStatus.nextVariants?.some(
                        (v) => advisorBuildSignature(v.setup?.slots) === current
                    ))
            ) {
                setNotice({
                    type: "error",
                    message:
                        optimizerSettings.mode === "ADVISOR"
                            ? "Build zmienił się od analizy. Uruchom Doradcę ponownie."
                            : "Build lub blokady zmieniły się od obliczeń. Uruchom optymalizację ponownie.",
                });
                return;
            }
        }
        if (applyOptimizationSetup(variant?.setup, variant?.calculationResult)) {
            setActiveVariantIndex(variantIndex);
        }
    };

    const handleCancel = async () => {
        try {
            await cancelDrifOptimization?.();
        } catch {
            setNotice({
                type: "error",
                message: "Nie udało się zatrzymać analizy. Zakończy się po upływie limitu czasu.",
            });
        }
    };
    return {
        gameRules,
        drifCategories,
        requestData,
        data,
        lockedSlots,
        lockedDrifs,
        toggleSlotLock,
        toggleDrifLock,
        stats,
        prioritizedBonuses,
        availableBonuses,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        prioritySortDirection,
        expandedPriorities,
        selectBonus,
        removeBonus,
        clearAll,
        updateBonus,
        sortByPriority,
        toggleExpanded,
        toggleAllExpanded,
        isOptimizing,
        optimizationElapsedSeconds,
        optimizationStartedAt,
        lastOptimizationDurationSeconds,
        optimizationStatus,
        activeVariantIndex,
        setActiveVariantIndex,
        notice,
        setNotice,
        configFiles,
        currentModDetails,
        reportModDetails,
        displayedVariant,
        handleOptimizeClick,
        handleApplyVariant,
        handleCancel,
    };
};
