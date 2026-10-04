import { useEffect, useMemo, useRef, useState } from "react";
import { useEquipment } from "../../shared/state/EquipmentContext";
import { calculateCurrentModDetails } from "./optimizerDomain";
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

/** Shared optimizer workflow; presentation changes never remount the current run. */
export const useOptimizerWorkspace = ({ optimizerSettings, onOptimizerSettingsChange }) => {
    const {
        gameRules,
        drifCategories,
        runDrifOptimization,
        cancelDrifOptimization,
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
        lastDurationSeconds: lastOptimizationDurationSeconds,
        status: optimizationStatus,
        activeVariantIndex,
        setActiveVariantIndex,
        reset: resetOptimization,
        run: runOptimization,
    } = useOptimizationRun(runDrifOptimization);
    const [notice, setNotice] = useState(null);
    const draftRestoredRef = useRef(false);
    const skipDraftSaveRef = useRef(false);
    useEffect(() => {
        if (draftRestoredRef.current || !gameRules?.bonusTranslations) return;
        draftRestoredRef.current = true;
        skipDraftSaveRef.current = true;
        const savedDraft = readOptimizerDraft();
        if (savedDraft) {
            try {
                const imported = parseOptimizerConfigPayload(savedDraft, gameRules);
                replaceConfiguration(imported);
                onOptimizerSettingsChange((previous) => mergeOptimizerSettings(previous, imported));
            } catch {
                // Ignore drafts from obsolete or malformed application versions.
            }
        }
    }, [gameRules, onOptimizerSettingsChange, replaceConfiguration]);
    useEffect(() => {
        if (!draftRestoredRef.current) return;
        if (skipDraftSaveRef.current) {
            skipDraftSaveRef.current = false;
            return;
        }
        writeOptimizerDraft(createOptimizerConfigPayload(prioritizedBonuses, optimizerSettings));
    }, [optimizerSettings, prioritizedBonuses]);
    useEffect(() => resetOptimization(), [optimizerSettings.mode, resetOptimization]);
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
    const currentModDetails = useMemo(
        () =>
            calculateCurrentModDetails({
                prioritizedBonuses,
                slots: requestData.slots,
                drifs: data.drifs,
                items: data.items,
                gameRules,
            }),
        [data.drifs, data.items, gameRules, prioritizedBonuses, requestData.slots]
    );
    const activeVariant = optimizationStatus?.nextVariants?.[activeVariantIndex];
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
        lastOptimizationDurationSeconds,
        optimizationStatus,
        activeVariantIndex,
        setActiveVariantIndex,
        notice,
        setNotice,
        configFiles,
        currentModDetails,
        displayedVariant,
        handleOptimizeClick,
        handleApplyVariant,
        handleCancel,
    };
};
