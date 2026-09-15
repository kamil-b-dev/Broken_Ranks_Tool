import { useCallback, useRef, useState } from "react";
import { cancelAdvisorOptimization, optimizeEquipmentDrifs } from "../../shared/api/equipmentApi";
import { createEquipmentOptimizationRequest } from "./equipmentOptimizationRequest";
import { advisorBuildSignature } from "./advisor/advisorBuildSignature";

const failureMessage = (error) =>
    error.response?.data?.summary?.message ||
    error.response?.data?.message ||
    error.response?.data?.error ||
    (error.code === "ECONNABORTED" ? "Przekroczono limit czasu optymalizacji." : error.message);

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
        if (activeAdvisor.current) await cancelAdvisorOptimization(activeAdvisor.current);
    }, []);

    const runDrifOptimization = useCallback(
        async (configuration) => {
            if (!slots || Object.values(slots).every((slot) => !slot?.itemId)) {
                return {
                    success: false,
                    message: "Wybierz przynajmniej jeden przedmiot, aby uruchomić optymalizację.",
                    applied: false,
                };
            }
            const advisory = configuration.mode === "ADVISOR";
            let advisorRunId = null;
            const request = createEquipmentOptimizationRequest({
                slots,
                characterStats: requestData?.characterStats,
                configuration,
                lockedSlots,
                lockedDrifs,
            });
            if (advisory && request.advisor) {
                advisorRunId = crypto.randomUUID();
                request.advisor = { ...request.advisor, runId: advisorRunId };
                activeAdvisor.current = advisorRunId;
            }
            try {
                const { optimizedSetup, summary, advisorReport, calculationResult } =
                    await optimizeEquipmentDrifs(request);
                if (advisory) {
                    return {
                        ...summary,
                        ...(advisorReport
                            ? {
                                  advisorReport,
                                  baselineSignature: advisorBuildSignature(slots),
                                  baselineConstraintsSignature: JSON.stringify({
                                      characterStats: configuration.characterStats || {},
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
                        hasEquipment && applyOptimizationSetup(optimizedSetup, calculationResult),
                };
            } catch (error) {
                console.error("Błąd optymalizacji drifów:", error);
                return { success: false, message: failureMessage(error), applied: false };
            } finally {
                if (activeAdvisor.current === advisorRunId) activeAdvisor.current = null;
            }
        },
        [slots, requestData?.characterStats, lockedSlots, lockedDrifs, applyOptimizationSetup]
    );

    return {
        optimizationTrigger,
        markEquipmentChanged,
        applyOptimizationSetup,
        runDrifOptimization,
        cancelDrifOptimization,
    };
};
