import { createReorganizationReport } from "./reorganization/reorganizationReportData";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { cancelAdvisorOptimization, optimizeEquipmentDrifs } from "../../shared/api/equipmentApi";
import { createEquipmentOptimizationRequest } from "./equipmentOptimizationRequest";
import { advisorBuildSignature } from "./advisor/advisorBuildSignature";
import { applyBackpackOptimization } from "../builder/backpack/backpackOptimizationTransfer";
import { applyReorganization } from "../builder/backpack/backpackReorganizationTransfer";
import { SLOTS } from "../../shared/domain/equipment/equipmentSlots";

const failureMessage = (error) => {
    const retryAfter = Number(error.response?.headers?.["retry-after"]);
    if (error.response?.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0)
        return `Przekroczono limit żądań. Spróbuj ponownie za ${Math.ceil(retryAfter)} s.`;
    return (
        error.response?.data?.summary?.message ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        (error.code === "ECONNABORTED" ? "Przekroczono limit czasu optymalizacji." : error.message)
    );
};

const cancellationCredentials = ({ runId, cancellationToken }) => ({
    runId,
    cancellationToken,
});

const inputSignature = (requestData, lockedSlots, lockedDrifs) =>
    JSON.stringify({ requestData, lockedSlots, lockedDrifs });
const inventorySignature = (requestData, backpack, lockedSlots, lockedDrifs) =>
    JSON.stringify([inputSignature(requestData, lockedSlots, lockedDrifs), backpack]);

/** Owns a single optimizer request and explicit application of advisor recommendations. */
export const useEquipmentOptimization = ({
    requestData,
    setRequestData,
    restoreStats,
    lockedSlots,
    lockedDrifs,
    backpack = [],
    setBackpack,
    data,
    gameRules,
}) => {
    const slots = requestData?.slots;
    const [optimizationTrigger, setOptimizationTrigger] = useState(0);
    const [reorganizationUndo, setReorganizationUndo] = useState(null);
    const reorganizationUndoWarning =
        reorganizationUndo &&
        (inventorySignature(requestData, backpack, lockedSlots, lockedDrifs) !==
            reorganizationUndo.afterSignature ||
            data !== reorganizationUndo.data ||
            gameRules !== reorganizationUndo.gameRules)
            ? "Ekwipunek, plecak, blokady lub katalog zmieniły się. Cofnięcie nadpisałoby późniejsze zmiany."
            : null;
    const activeAdvisor = useRef(null);
    const optimizerRunVersion = useRef(0);
    const invalidateDrifOptimization = useCallback(() => {
        optimizerRunVersion.current += 1;
    }, []);
    const currentInputSignature = useRef(null);
    useLayoutEffect(() => {
        currentInputSignature.current = {
            standard: inputSignature(requestData, lockedSlots, lockedDrifs),
            inventory: JSON.stringify([
                inputSignature(requestData, lockedSlots, lockedDrifs),
                backpack,
            ]),
        };
    }, [requestData, lockedSlots, lockedDrifs, backpack]);
    const markEquipmentChanged = useCallback(
        () => setOptimizationTrigger((previous) => previous + 1),
        []
    );
    const applyOptimizationSetup = useCallback(
        (setup, calculationResult = null, inventoryUsages = null) => {
            if (!setup?.slots) return false;
            const nextRequestData = {
                ...requestData,
                slots: setup.slots,
                characterStats: setup.characterStats || requestData?.characterStats || {},
            };
            if (inventoryUsages !== null) {
                const builtIns = Object.keys(requestData.slots || {}).filter((key) => {
                    const item = data?.items?.find(
                        (candidate) =>
                            String(candidate.id) === String(requestData.slots[key].itemId)
                    );
                    return ["EPIC", "SET"].includes(item?.rarity);
                });
                const transfer = inventoryUsages.reorganization
                    ? applyReorganization
                    : applyBackpackOptimization;
                if (inventoryUsages.reorganization && !setBackpack)
                    throw new Error("Brak możliwości aktualizacji plecaka po reorganizacji.");
                const nextBackpack = transfer({
                    backpack,
                    previousSlots: requestData.slots,
                    nextSlots: setup.slots,
                    lockedSlots: lockedSlots || [],
                    builtInSlots: builtIns,
                    lockedDrifs,
                    backpackDrifUsages: inventoryUsages.usages,
                    reorganizationDrifUsages: inventoryUsages.usages,
                    targetSlots: inventoryUsages.targetSlots,
                    reorganizationOptions: inventoryUsages.options,
                    allowedBackpackIds: inventoryUsages.allowedBackpackIds,
                    data,
                    gameRules,
                });
                if (inventoryUsages.reorganization)
                    setReorganizationUndo({
                        before: structuredClone({ requestData, backpack }),
                        afterSignature: inventorySignature(
                            nextRequestData,
                            nextBackpack,
                            lockedSlots,
                            lockedDrifs
                        ),
                        data,
                        gameRules,
                    });
                setBackpack?.(nextBackpack);
            }
            setRequestData(nextRequestData);
            if (calculationResult?.stats) {
                restoreStats?.(calculationResult.stats, calculationResult, nextRequestData);
            }
            markEquipmentChanged();
            return true;
        },
        [
            markEquipmentChanged,
            requestData,
            restoreStats,
            setRequestData,
            backpack,
            setBackpack,
            lockedSlots,
            lockedDrifs,
            data,
            gameRules,
        ]
    );

    const undoReorganization = () => {
        if (!reorganizationUndo) return false;
        if (reorganizationUndoWarning) throw new Error(reorganizationUndoWarning);
        invalidateDrifOptimization();
        setRequestData(structuredClone(reorganizationUndo.before.requestData));
        setBackpack(structuredClone(reorganizationUndo.before.backpack));
        restoreStats?.(null);
        setReorganizationUndo(null);
        markEquipmentChanged();
        return true;
    };

    const cancelDrifOptimization = useCallback(async () => {
        const advisorRun = activeAdvisor.current;
        if (!advisorRun) return;
        advisorRun.cancellationRequested = true;
        await cancelAdvisorOptimization(cancellationCredentials(advisorRun));
    }, []);

    const runDrifOptimization = useCallback(
        async (configuration) => {
            const runVersion = ++optimizerRunVersion.current;
            const reorganize = configuration.mode === "REORGANIZE";
            const failure = (message) => ({
                success: false,
                applied: false,
                message,
                ...(reorganize
                    ? { mode: "REORGANIZE", reorganizationOptions: configuration.reorganization }
                    : {}),
            });
            const inventory =
                reorganize ||
                (configuration.mode !== "ADVISOR" &&
                    (configuration.configurationMode || "ADVANCED") === "ADVANCED" &&
                    configuration.backpackOnly === true);
            const signatureKey = inventory ? "inventory" : "standard";
            const baselineInputSignature = inventory
                ? JSON.stringify([inputSignature(requestData, lockedSlots, lockedDrifs), backpack])
                : inputSignature(requestData, lockedSlots, lockedDrifs);
            if (!slots || Object.values(slots).every((slot) => !slot?.itemId)) {
                return failure(
                    "Wybierz przynajmniej jeden przedmiot, aby uruchomić optymalizację."
                );
            }
            const advisory = configuration.mode === "ADVISOR";
            let advisorRun = null;
            let previousAdvisorRun = null;
            let request;
            try {
                request = createEquipmentOptimizationRequest({
                    slots,
                    characterStats: requestData?.characterStats,
                    configuration,
                    lockedSlots,
                    lockedDrifs,
                    backpack,
                });
            } catch (error) {
                return failure(failureMessage(error));
            }
            if (advisory && request.advisor) {
                previousAdvisorRun = activeAdvisor.current;
                advisorRun = {
                    runId: crypto.randomUUID(),
                    cancellationToken: crypto.randomUUID(),
                    cancellationRequested: false,
                    previous: previousAdvisorRun,
                    finished: false,
                };
                advisorRun.completed = new Promise((resolve) => {
                    advisorRun.complete = resolve;
                });
                request.advisor = {
                    ...request.advisor,
                    runId: advisorRun.runId,
                    cancellationToken: advisorRun.cancellationToken,
                };
                activeAdvisor.current = advisorRun;
                if (previousAdvisorRun) {
                    previousAdvisorRun.cancellationRequested = true;
                    try {
                        await cancelAdvisorOptimization(
                            cancellationCredentials(previousAdvisorRun)
                        );
                    } catch (error) {
                        console.warn("Nie udało się zatrzymać poprzedniej analizy Doradcy:", error);
                    }
                }
            }
            try {
                // Cancel acknowledges the flag; only the previous response confirms worker release.
                if (previousAdvisorRun) await previousAdvisorRun.completed;
                if (advisorRun?.cancellationRequested) {
                    return {
                        success: false,
                        message: "Analiza Doradcy została anulowana.",
                        applied: false,
                    };
                }
                const {
                    optimizedSetup,
                    summary,
                    advisorReport,
                    calculationResult,
                    targetSetup,
                    backpackDrifUsages,
                    reorganizationDrifUsages,
                    reorganizationStatChanges,
                } = await optimizeEquipmentDrifs(request);
                if (baselineInputSignature !== currentInputSignature.current[signatureKey]) {
                    return {
                        ...failure(
                            "Build lub blokady zmieniły się podczas obliczeń. Uruchom optymalizację ponownie."
                        ),
                        nextVariants: [],
                    };
                }
                if (advisory) {
                    return {
                        ...summary,
                        ...(advisorReport
                            ? {
                                  advisorReport,
                                  baselineSignature: advisorBuildSignature(slots),
                                  baselineConstraintsSignature: JSON.stringify({
                                      characterStats: request.characterStats || {},
                                      lockedSlots,
                                      lockedDrifs,
                                  }),
                                  nextVariants: (summary.nextVariants || []).map(
                                      (variant, index) => ({
                                          ...variant,
                                          advisorGain: variant.gain,
                                          advisorActions:
                                              advisorReport.plans?.[index]?.actions || [],
                                          advisorActionDetails:
                                              advisorReport.plans?.[index]?.actionDetails || [],
                                          advisorKind: advisorReport.plans?.[index]?.kind,
                                          advisorCounts: advisorReport.plans?.[index]?.drifCounts,
                                          targetReached:
                                              advisorReport.plans?.[index]?.targetReached,
                                      })
                                  ),
                              }
                            : {}),
                        applied: false,
                    };
                }
                const hasEquipment = Object.values(optimizedSetup?.slots || {}).some(
                    (slot) => slot?.itemId != null
                );
                if (
                    inventory &&
                    !reorganize &&
                    hasEquipment &&
                    (!targetSetup?.slots || !Array.isArray(backpackDrifUsages))
                )
                    throw new Error(
                        "Wynik nie zawiera buildu docelowego lub listy użytych drifów plecaka."
                    );
                if (reorganize && hasEquipment && !Array.isArray(reorganizationDrifUsages))
                    throw new Error("Wynik reorganizacji nie zawiera źródeł drifów.");
                const reorganizationReport =
                    hasEquipment && Array.isArray(reorganizationDrifUsages)
                        ? createReorganizationReport({
                              before: slots,
                              after: optimizedSetup.slots,
                              usages: reorganizationDrifUsages,
                              options: {
                                  ...request.reorganization,
                                  lockedSlots,
                                  lockedDrifs,
                              },
                              backpack,
                              data,
                              gameRules,
                          })
                        : null;
                const applied =
                    runVersion === optimizerRunVersion.current &&
                    hasEquipment &&
                    (!summary?.outcome ||
                        ["VALID_BUILD", "VALID_BUILD_SOFT_TARGETS_UNMET"].includes(
                            summary.outcome
                        )) &&
                    applyOptimizationSetup(
                        optimizedSetup,
                        calculationResult,
                        reorganize
                            ? {
                                  reorganization: true,
                                  usages: reorganizationDrifUsages,
                                  options: request.reorganization,
                                  allowedBackpackIds: request.backpackDrifs.map(
                                      (entry) => entry.id
                                  ),
                              }
                            : inventory
                              ? { usages: backpackDrifUsages, targetSlots: targetSetup.slots }
                              : null
                    );
                return {
                    ...summary,
                    ...(reorganize
                        ? {
                              mode: "REORGANIZE",
                              reorganizationOptions: request.reorganization,
                              reorganizationDrifUsages,
                              reorganizationStatChanges,
                              reorganizationReport,
                          }
                        : {}),
                    ...(inventory && !reorganize
                        ? {
                              targetSetup,
                              backpackDrifUsages,
                              optimizedSetup,
                              backpackDrifTargets: (backpackDrifUsages || []).map(
                                  ({ entryId, slotKey, drifIndex }) => {
                                      const current = optimizedSetup.slots[slotKey];
                                      const template = data?.drifs?.find(
                                          (drif) =>
                                              String(drif.id) === String(current.drifIds[drifIndex])
                                      );
                                      return {
                                          entryId,
                                          slotLabel:
                                              SLOTS.find((slot) => slot.key === slotKey)?.label ||
                                              slotKey,
                                          drifName:
                                              template?.name || String(current.drifIds[drifIndex]),
                                          size: template?.size,
                                          level: Number(current.drifLevels?.[drifIndex] ?? 1),
                                          targetLevel: Number(
                                              targetSetup?.slots?.[slotKey]?.drifLevels?.[
                                                  drifIndex
                                              ] ?? 1
                                          ),
                                      };
                                  }
                              ),
                          }
                        : {}),
                    baselineSignature: advisorBuildSignature(slots),
                    baselineConstraintsSignature: JSON.stringify({
                        characterStats: request.characterStats || {},
                        lockedSlots,
                        lockedDrifs,
                    }),
                    appliedSignature: applied ? advisorBuildSignature(optimizedSetup.slots) : null,
                    applied,
                };
            } catch (error) {
                console.error("Błąd optymalizacji drifów:", error);
                return failure(failureMessage(error));
            } finally {
                if (advisorRun) {
                    advisorRun.finished = true;
                    advisorRun.complete();
                }
                if (activeAdvisor.current === advisorRun) {
                    let previous = previousAdvisorRun;
                    while (previous?.finished) previous = previous.previous;
                    activeAdvisor.current = previous || null;
                }
            }
        },
        [
            slots,
            requestData,
            lockedSlots,
            lockedDrifs,
            applyOptimizationSetup,
            backpack,
            data,
            gameRules,
        ]
    );

    return {
        optimizationTrigger,
        markEquipmentChanged,
        invalidateDrifOptimization,
        applyOptimizationSetup,
        runDrifOptimization,
        cancelDrifOptimization,
        canUndoReorganization: Boolean(reorganizationUndo),
        reorganizationUndoWarning,
        undoReorganization,
    };
};
