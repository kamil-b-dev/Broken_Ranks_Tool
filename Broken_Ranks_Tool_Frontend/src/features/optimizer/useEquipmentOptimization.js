import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { cancelAdvisorOptimization, optimizeEquipmentDrifs } from "../../shared/api/equipmentApi";
import { createEquipmentOptimizationRequest } from "./equipmentOptimizationRequest";
import { advisorBuildSignature } from "./advisor/advisorBuildSignature";
import { applyBackpackOptimization } from "../builder/backpack/backpackOptimizationTransfer";
import { SLOTS } from "../../shared/domain/equipment/equipmentSlots";

const failureMessage = (error) =>
    error.response?.data?.summary?.message ||
    error.response?.data?.message ||
    error.response?.data?.error ||
    (error.code === "ECONNABORTED" ? "Przekroczono limit czasu optymalizacji." : error.message);

const cancellationCredentials = ({ runId, cancellationToken }) => ({
    runId,
    cancellationToken,
});

const inputSignature = (requestData, lockedSlots, lockedDrifs) =>
    JSON.stringify({ requestData, lockedSlots, lockedDrifs });

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
}) => {
    const slots = requestData?.slots;
    const [optimizationTrigger, setOptimizationTrigger] = useState(0);
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
                const nextBackpack = applyBackpackOptimization({
                    backpack,
                    previousSlots: requestData.slots,
                    nextSlots: setup.slots,
                    lockedSlots: [...(lockedSlots || []), ...builtIns],
                    lockedDrifs,
                    backpackDrifUsages: inventoryUsages.usages,
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
        ]
    );

    const cancelDrifOptimization = useCallback(async () => {
        const advisorRun = activeAdvisor.current;
        if (!advisorRun) return;
        advisorRun.cancellationRequested = true;
        await cancelAdvisorOptimization(cancellationCredentials(advisorRun));
    }, []);

    const runDrifOptimization = useCallback(
        async (configuration) => {
            const runVersion = ++optimizerRunVersion.current;
            const inventory =
                configuration.mode !== "ADVISOR" &&
                (configuration.configurationMode || "ADVANCED") === "ADVANCED" &&
                configuration.backpackOnly === true;
            const signatureKey = inventory ? "inventory" : "standard";
            const baselineInputSignature = inventory
                ? JSON.stringify([inputSignature(requestData, lockedSlots, lockedDrifs), backpack])
                : inputSignature(requestData, lockedSlots, lockedDrifs);
            if (!slots || Object.values(slots).every((slot) => !slot?.itemId)) {
                return {
                    success: false,
                    message: "Wybierz przynajmniej jeden przedmiot, aby uruchomić optymalizację.",
                    applied: false,
                };
            }
            const advisory = configuration.mode === "ADVISOR";
            let advisorRun = null;
            let previousAdvisorRun = null;
            const request = createEquipmentOptimizationRequest({
                slots,
                characterStats: requestData?.characterStats,
                configuration,
                lockedSlots,
                lockedDrifs,
                backpack,
            });
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
                } = await optimizeEquipmentDrifs(request);
                if (baselineInputSignature !== currentInputSignature.current[signatureKey]) {
                    return {
                        success: false,
                        applied: false,
                        nextVariants: [],
                        message:
                            "Build lub blokady zmieniły się podczas obliczeń. Uruchom optymalizację ponownie.",
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
                    hasEquipment &&
                    (!targetSetup?.slots || !Array.isArray(backpackDrifUsages))
                )
                    throw new Error(
                        "Wynik nie zawiera buildu docelowego lub listy użytych drifów plecaka."
                    );
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
                        inventory ? { usages: backpackDrifUsages } : null
                    );
                return {
                    ...summary,
                    ...(inventory
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
                return { success: false, message: failureMessage(error), applied: false };
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
        [slots, requestData, lockedSlots, lockedDrifs, applyOptimizationSetup, backpack, data]
    );

    return {
        optimizationTrigger,
        markEquipmentChanged,
        invalidateDrifOptimization,
        applyOptimizationSetup,
        runDrifOptimization,
        cancelDrifOptimization,
    };
};
