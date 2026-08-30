import React, { useState, useEffect, useMemo, useRef } from "react";
import { useEquipment } from "../context/EquipmentContext";
import {
    calculateCurrentModDetails,
    createBonusOption,
    sortBonusesByCategory,
} from "./optimization/optimizerDomain";
import {
    buildOptimizationConfig,
    createOptimizerConfigPayload,
    findInvalidPercentageTarget,
    parseOptimizerConfigPayload,
} from "./optimization/optimizerConfiguration";
import OptimizerBonusColumn from "./optimization/OptimizerBonusColumn";
import OptimizerMobileNavigation from "./optimization/OptimizerMobileNavigation";
import OptimizerRunAction from "./optimization/OptimizerRunAction";
import OptimizerLocksColumn from "./optimization/OptimizerLocksColumn";
import OptimizerPriorityToolbar from "./optimization/OptimizerPriorityToolbar";
import OptimizerPriorityCardHeader from "./optimization/OptimizerPriorityCardHeader";
import OptimizerPriorityForm from "./optimization/OptimizerPriorityForm";
import OptimizerStatusSection from "./optimization/OptimizerStatusSection";
import OptimizerItemsByBonusSection from "./optimization/OptimizerItemsByBonusSection";
import OptimizerGoalsSection from "./optimization/OptimizerGoalsSection";
import OptimizerVariantsSection from "./optimization/OptimizerVariantsSection";
import {
    downloadOptimizerConfiguration,
    readOptimizerConfigurationFile,
} from "./optimization/optimizerConfigFiles";

/**
 * Provides drif priorities, target limits, and equipment locking for optimization.
 * @returns {JSX.Element} The optimizer panel.
 */
const OptimizerPanel = ({ optimizerSettings, onOptimizerSettingsChange }) => {
    const {
        gameRules,
        drifCategories,
        runDrifOptimization,
        requestData,
        data,
        lockedSlots,
        lockedDrifs,
        toggleSlotLock,
        toggleDrifLock,
        applyOptimizationSetup,
    } = useEquipment();

    const [availableBonuses, setAvailableBonuses] = useState([]);
    const [prioritizedBonuses, setPrioritizedBonuses] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationElapsedSeconds, setOptimizationElapsedSeconds] = useState(0);
    const [lastOptimizationDurationSeconds, setLastOptimizationDurationSeconds] = useState(null);
    const [optimizationStatus, setOptimizationStatus] = useState(null);
    const [activeVariantIndex, setActiveVariantIndex] = useState(0);
    const [prioritySortDirection, setPrioritySortDirection] = useState("desc");
    const [expandedPriorities, setExpandedPriorities] = useState(new Set());
    const [activeMobileColumn, setActiveMobileColumn] = useState("priorities");
    const configInputRef = useRef(null);
    const optimizationStartTimeRef = useRef(null);

    useEffect(() => {
        if (!isOptimizing) return undefined;

        const timerId = window.setInterval(() => {
            if (optimizationStartTimeRef.current === null) return;
            setOptimizationElapsedSeconds(
                Math.floor((performance.now() - optimizationStartTimeRef.current) / 1000)
            );
        }, 250);

        return () => window.clearInterval(timerId);
    }, [isOptimizing]);

    useEffect(() => {
        if (gameRules?.bonusTranslations) {
            const allBonuses = Object.entries(gameRules.bonusTranslations)
                .map(([key, value]) =>
                    createBonusOption([key, value], gameRules.drifBonusCategories)
                )
                .filter((b) => gameRules.drifBasePowers[b.key] !== undefined);
            setAvailableBonuses(sortBonusesByCategory(allBonuses));
        }
    }, [gameRules, drifCategories]);

    const filteredAvailableBonuses = availableBonuses.filter((b) => {
        const matchesCategory = selectedCategory === "ALL" || b.categoryKey === selectedCategory;
        const matchesSearch = b.value.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
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

    /** Moves a selected bonus into the priority list. */
    const handleSelectBonus = (bonus) => {
        setPrioritizedBonuses((prev) => [
            ...prev,
            {
                ...bonus,
                weight: 15,
                min: 0,
                max: 12,
                forceCap: false,
                forcePercentage: false,
                forcedPercentage: "",
                maximize: false,
            },
        ]);
        setAvailableBonuses((prev) => prev.filter((b) => b.key !== bonus.key));
        setExpandedPriorities(new Set([bonus.key]));
        setActiveMobileColumn("priorities");
    };

    /** Removes a bonus from the priority list and restores it to available choices. */
    const handleRemoveBonus = (bonus) => {
        setAvailableBonuses((prev) =>
            sortBonusesByCategory([
                ...prev,
                createBonusOption([bonus.key, bonus.value], gameRules?.drifBonusCategories),
            ])
        );
        setPrioritizedBonuses((prev) => prev.filter((b) => b.key !== bonus.key));
        setExpandedPriorities((prev) => {
            const next = new Set(prev);
            next.delete(bonus.key);
            return next;
        });
    };

    /** Clears all configured priorities. */
    const handleClearAll = () => {
        setAvailableBonuses((prev) => {
            const combined = [
                ...prev,
                ...prioritizedBonuses.map((b) =>
                    createBonusOption([b.key, b.value], gameRules?.drifBonusCategories)
                ),
            ];
            return sortBonusesByCategory(combined);
        });
        setPrioritizedBonuses([]);
        setExpandedPriorities(new Set());
    };

    /** Updates one field of a configured priority. */
    const handleUpdateBonus = (key, field, value) => {
        setPrioritizedBonuses((prev) =>
            prev.map((b) => {
                if (b.key === key) {
                    if (field === "forceCap" && value) {
                        return { ...b, forceCap: true, forcePercentage: false };
                    }
                    if (field === "forcePercentage" && value) {
                        return { ...b, forcePercentage: true, forceCap: false, maximize: false };
                    }
                    if (field === "maximize" && value) {
                        return { ...b, maximize: true, forcePercentage: false };
                    }
                    return { ...b, [field]: value };
                }
                return b;
            })
        );
    };

    /** Sorts priorities by weight while preserving tie order. */
    const handleSortByPriority = () => {
        setPrioritizedBonuses((prev) => {
            const direction = prioritySortDirection === "desc" ? 1 : -1;
            return prev
                .map((bonus, index) => ({ bonus, index }))
                .sort((left, right) => {
                    const weightDifference =
                        (Number(right.bonus.weight) - Number(left.bonus.weight)) * direction;
                    return weightDifference || left.index - right.index;
                })
                .map(({ bonus }) => bonus);
        });
        setPrioritySortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    };

    const handleSaveConfiguration = () => {
        const payload = createOptimizerConfigPayload(prioritizedBonuses, optimizerSettings);
        downloadOptimizerConfiguration(payload);
    };

    const handleLoadConfiguration = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            const payload = await readOptimizerConfigurationFile(file);
            const imported = parseOptimizerConfigPayload(payload, gameRules);
            setPrioritizedBonuses(imported.priorities);
            setExpandedPriorities(
                imported.priorities.length > 0 ? new Set([imported.priorities[0].key]) : new Set()
            );
            setAvailableBonuses(imported.availableBonuses);
            if (imported.maxVariantLossPercent !== null) {
                onOptimizerSettingsChange((previous) => ({
                    ...previous,
                    maxVariantLossPercent: imported.maxVariantLossPercent,
                }));
            }
            alert(`Wczytano konfigurację: ${imported.priorities.length} priorytetów.`);
        } catch (error) {
            const message = error.message || "niepoprawny plik JSON.";
            alert(
                message === "Plik konfiguracji jest zbyt duży."
                    ? message
                    : `Nie udało się wczytać konfiguracji: ${message}`
            );
        }
    };

    /** Builds the request and starts the backend optimization process. */
    const handleOptimizeClick = async () => {
        if (prioritizedBonuses.length === 0) return;
        const invalidPercentageTarget = findInvalidPercentageTarget(prioritizedBonuses);
        if (invalidPercentageTarget) {
            alert(`Podaj poprawny, nieujemny procent dla: ${invalidPercentageTarget.value}.`);
            return;
        }
        setIsOptimizing(true);
        setOptimizationElapsedSeconds(0);
        const startedAt = performance.now();
        optimizationStartTimeRef.current = startedAt;

        try {
            const result = await runDrifOptimization(
                buildOptimizationConfig(prioritizedBonuses, optimizerSettings)
            );
            setOptimizationStatus(result);
            setActiveVariantIndex(0);
        } finally {
            const durationSeconds = Math.floor((performance.now() - startedAt) / 1000);
            setOptimizationElapsedSeconds(durationSeconds);
            setLastOptimizationDurationSeconds(durationSeconds);
            optimizationStartTimeRef.current = null;
            setIsOptimizing(false);
        }
    };

    const togglePriorityExpanded = (key) => {
        setExpandedPriorities((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <div className="optimizer-console bg-gradient-to-b from-stone-900 to-black p-3 sm:p-5 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex flex-col h-full relative">
            <OptimizerMobileNavigation
                activeColumn={activeMobileColumn}
                priorityCount={prioritizedBonuses.length}
                onChange={setActiveMobileColumn}
            />
            <div className="optimizer-main-grid grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-4">
                <OptimizerLocksColumn
                    active={activeMobileColumn === "slots"}
                    slots={requestData.slots}
                    items={data.items}
                    drifs={data.drifs}
                    lockedSlots={lockedSlots}
                    lockedDrifs={lockedDrifs}
                    onToggleSlot={toggleSlotLock}
                    onToggleDrif={toggleDrifLock}
                />

                <OptimizerBonusColumn
                    active={activeMobileColumn === "bonuses"}
                    bonuses={filteredAvailableBonuses}
                    searchQuery={searchQuery}
                    selectedCategory={selectedCategory}
                    categoryLabels={drifCategories}
                    onSearchChange={setSearchQuery}
                    onCategoryChange={setSelectedCategory}
                    onSelect={handleSelectBonus}
                />

                <div
                    className={`optimizer-workspace-column optimizer-priority-column ${activeMobileColumn === "priorities" ? "flex" : "hidden"} flex-col gap-2 lg:col-span-4 lg:flex lg:border-r lg:border-stone-800/60 lg:pr-4`}
                >
                    <OptimizerPriorityToolbar
                        fileInputRef={configInputRef}
                        priorityCount={prioritizedBonuses.length}
                        sortDirection={prioritySortDirection}
                        anyExpanded={expandedPriorities.size > 0}
                        onLoad={handleLoadConfiguration}
                        onSave={handleSaveConfiguration}
                        onSort={handleSortByPriority}
                        onToggleExpanded={() =>
                            setExpandedPriorities(
                                expandedPriorities.size > 0
                                    ? new Set()
                                    : new Set(prioritizedBonuses.map((bonus) => bonus.key))
                            )
                        }
                        onClear={handleClearAll}
                    />

                    <div className="overflow-y-auto pr-2 flex-1 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
                        {prioritizedBonuses.length === 0 ? (
                            <p className="text-center text-stone-600 italic mt-10 text-xs font-serif">
                                Wybierz bonusy z lewej listy, aby ustawić priorytety.
                            </p>
                        ) : (
                            prioritizedBonuses.map((bonus, index) => {
                                const maxCap = gameRules?.drifMaxCaps?.[bonus.key];
                                const isExpanded = expandedPriorities.has(bonus.key);
                                const potential = currentModDetails.find(
                                    (detail) => detail.key === bonus.key
                                );

                                return (
                                    <div
                                        key={bonus.key}
                                        className="flex flex-col bg-stone-900/50 border border-purple-900/40 mb-3 rounded-sm shadow-md transition-colors relative overflow-hidden"
                                    >
                                        <div
                                            className="absolute top-0 left-0 h-full bg-purple-900/10 pointer-events-none"
                                            style={{ width: `${(bonus.weight / 30) * 100}%` }}
                                        ></div>

                                        <OptimizerPriorityCardHeader
                                            index={index}
                                            bonus={bonus}
                                            expanded={isExpanded}
                                            onToggle={() => togglePriorityExpanded(bonus.key)}
                                            onRemove={() => handleRemoveBonus(bonus)}
                                        />

                                        {isExpanded && (
                                            <OptimizerPriorityForm
                                                bonus={bonus}
                                                potential={potential}
                                                maxCap={maxCap}
                                                onChange={(field, value) =>
                                                    handleUpdateBonus(bonus.key, field, value)
                                                }
                                            />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <aside
                    className={`optimizer-workspace-column optimizer-info-column ${activeMobileColumn === "result" ? "flex" : "hidden"} flex-col gap-4 lg:col-span-4 lg:flex`}
                >
                    <div className="flex items-center justify-between border-b border-stone-700 pb-2 min-h-[34px] shrink-0">
                        <h4 className="text-stone-300 font-serif font-bold uppercase tracking-widest text-xs">
                            Raport optymalizacji
                        </h4>
                    </div>

                    <div className="overflow-y-auto pr-2 flex-1 min-h-0 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
                        <OptimizerStatusSection
                            isOptimizing={isOptimizing}
                            elapsedSeconds={optimizationElapsedSeconds}
                            status={optimizationStatus}
                            lastDurationSeconds={lastOptimizationDurationSeconds}
                        />

                        <OptimizerItemsByBonusSection
                            itemsByBonus={optimizationStatus?.itemsByDrifBonus}
                        />

                        <OptimizerGoalsSection
                            goals={optimizationStatus?.goalResults}
                            currentDetails={currentModDetails}
                            activeVariant={optimizationStatus?.nextVariants?.[activeVariantIndex]}
                            maxCaps={gameRules?.drifMaxCaps}
                        />

                        <OptimizerVariantsSection
                            variants={optimizationStatus?.nextVariants}
                            activeIndex={activeVariantIndex}
                            maxCaps={gameRules?.drifMaxCaps}
                            translations={gameRules?.bonusTranslations}
                            onSelect={(variant, variantIndex) => {
                                if (applyOptimizationSetup(variant.setup)) {
                                    setActiveVariantIndex(variantIndex);
                                }
                            }}
                        />
                    </div>
                </aside>
            </div>

            <OptimizerRunAction
                priorityCount={prioritizedBonuses.length}
                isOptimizing={isOptimizing}
                elapsedSeconds={optimizationElapsedSeconds}
                lastDurationSeconds={lastOptimizationDurationSeconds}
                hasResult={Boolean(optimizationStatus)}
                onRun={handleOptimizeClick}
            />
        </div>
    );
};

export default OptimizerPanel;
