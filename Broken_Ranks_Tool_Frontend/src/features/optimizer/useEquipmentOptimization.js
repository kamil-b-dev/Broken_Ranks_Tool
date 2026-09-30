import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { cancelAdvisorOptimization, optimizeEquipmentDrifs } from "../../shared/api/equipmentApi";
import { createEquipmentOptimizationRequest } from "./equipmentOptimizationRequest";
import { advisorBuildSignature } from "./advisor/advisorBuildSignature";

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
}) => {
    const slots = requestData?.slots;
    const [optimizationTrigger, setOptimizationTrigger] = useState(0);
    const activeAdvisor = useRef(null);
    const optimizerRunVersion = useRef(0);
    const currentInputSignature = useRef(null);
    useLayoutEffect(() => {
        currentInputSignature.current = inputSignature(requestData, lockedSlots, lockedDrifs);
    }, [requestData, lockedSlots, lockedDrifs]);
    const markEquipmentChanged = useCallback(
        () => setOptimizationTrigger((previous) => previous + 1),
        []
    );
    const applyOptimizationSetup = useCallback(
        (setup, calculationResult = null) => {
            if (!setup?.slots) return false;
            const nextRequestData = {
                ...requestData,
                slots: setup.slots,
                characterStats: setup.characterStats || requestData?.characterStats || {},
            };
            setRequestData(nextRequestData);
            if (calculationResult?.stats) {
                restoreStats?.(calculationResult.stats, calculationResult, nextRequestData);
            }
            markEquipmentChanged();
            return true;
        },
        [markEquipmentChanged, requestData, restoreStats, setRequestData]
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
            const baselineInputSignature = inputSignature(requestData, lockedSlots, lockedDrifs);
            if (!slots || Object.values(slots).every((slot) => !slot?.itemId)) {
                return {
                    success: false,
                    message: "Wybierz przynajmniej jeden przedmiot, aby uruchomić optymalizację.",
                    applied: false,
                };
            }
            const advisory = configuration.mode === "ADVISOR";
            let advisorRun = null;
            const request = createEquipmentOptimizationRequest({
                slots,
                characterStats: requestData?.characterStats,
                configuration,
                lockedSlots,
                lockedDrifs,
            });
            if (advisory && request.advisor) {
                const previousAdvisorRun = activeAdvisor.current;
                advisorRun = {
                    runId: crypto.randomUUID(),
                    cancellationToken: crypto.randomUUID(),
                    cancellationRequested: false,
                };
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
                if (advisorRun?.cancellationRequested) {
                    return {
                        success: false,
                        message: "Analiza Doradcy została anulowana.",
                        applied: false,
                    };
                }
                const { optimizedSetup, summary, advisorReport, calculationResult } =
                    await optimizeEquipmentDrifs(request);
                if (baselineInputSignature !== currentInputSignature.current) {
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
                return {
                    ...summary,
                    applied:
                        runVersion === optimizerRunVersion.current &&
                        hasEquipment &&
                        applyOptimizationSetup(optimizedSetup, calculationResult),
                };
            } catch (error) {
                console.error("Błąd optymalizacji drifów:", error);
                return { success: false, message: failureMessage(error), applied: false };
            } finally {
                if (activeAdvisor.current === advisorRun) activeAdvisor.current = null;
            }
        },
        [slots, requestData, lockedSlots, lockedDrifs, applyOptimizationSetup]
    );

    return {
        optimizationTrigger,
        markEquipmentChanged,
        applyOptimizationSetup,
        runDrifOptimization,
        cancelDrifOptimization,
    };
};
