import { useCallback, useMemo, useState } from "react";
import { calculateEquipmentStats } from "../../shared/api/equipmentApi";

const emptySources = () => ({ drifCategories: {}, orbBonusTypes: [] });

/** Owns calculated statistics, their display sources, and calculation progress. */
export const useEquipmentStats = (requestData) => {
    const [stats, setStats] = useState(null);
    const [statSources, setStatSources] = useState(emptySources);
    const [calculatedRequestFingerprint, setCalculatedRequestFingerprint] = useState(null);
    const [isCalculatingStats, setIsCalculatingStats] = useState(false);
    const [calculationNotice, setCalculationNotice] = useState(null);
    const requestFingerprint = useMemo(() => JSON.stringify(requestData), [requestData]);
    const statsAreCurrent = Boolean(stats) && calculatedRequestFingerprint === requestFingerprint;

    const calculateStats = useCallback(async () => {
        setIsCalculatingStats(true);
        setCalculationNotice(null);
        try {
            const response = await calculateEquipmentStats(requestData);
            setStats(response.stats || response);
            setCalculatedRequestFingerprint(requestFingerprint);
            setStatSources({
                drifCategories: response.drifCategories || {},
                orbBonusTypes: response.orbBonusTypes || [],
            });
        } catch (error) {
            if (error.response?.data?.message) {
                setCalculationNotice({
                    type: "error",
                    message: `Błąd obliczeń: ${error.response.data.message}`,
                });
            } else {
                setCalculationNotice({
                    type: "error",
                    message: "Błąd połączenia z serwerem obliczeniowym.",
                });
            }
            console.error("Błąd podczas obliczania mocy:", error);
        } finally {
            setIsCalculatingStats(false);
        }
    }, [requestData, requestFingerprint]);

    const resetStats = useCallback(() => {
        setStats(null);
        setStatSources(emptySources());
        setCalculatedRequestFingerprint(null);
    }, []);
    const dismissCalculationNotice = useCallback(() => setCalculationNotice(null), []);

    const restoreStats = useCallback((nextStats, nextSources = {}, nextRequestData = null) => {
        setStats(nextStats || null);
        setCalculatedRequestFingerprint(
            nextStats && nextRequestData ? JSON.stringify(nextRequestData) : null
        );
        setStatSources(
            nextStats
                ? {
                      drifCategories: nextSources.drifCategories || {},
                      orbBonusTypes: nextSources.orbBonusTypes || [],
                  }
                : emptySources()
        );
    }, []);

    return {
        stats: statsAreCurrent ? stats : null,
        statSources: statsAreCurrent ? statSources : emptySources(),
        isCalculatingStats,
        calculationNotice,
        dismissCalculationNotice,
        calculateStats,
        resetStats,
        restoreStats,
    };
};
