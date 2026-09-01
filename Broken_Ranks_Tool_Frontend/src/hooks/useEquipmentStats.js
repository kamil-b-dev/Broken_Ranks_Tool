import { useCallback, useMemo, useState } from "react";
import { calculateEquipmentStats } from "../api/equipmentApi";

const emptySources = () => ({ drifCategories: {}, orbBonusTypes: [] });

/** Owns calculated statistics, their display sources, and calculation progress. */
export const useEquipmentStats = (requestData) => {
    const [stats, setStats] = useState(null);
    const [statSources, setStatSources] = useState(emptySources);
    const [calculatedRequestFingerprint, setCalculatedRequestFingerprint] = useState(null);
    const [isCalculatingStats, setIsCalculatingStats] = useState(false);
    const requestFingerprint = useMemo(() => JSON.stringify(requestData), [requestData]);
    const statsAreCurrent = Boolean(stats) && calculatedRequestFingerprint === requestFingerprint;

    const calculateStats = useCallback(async () => {
        setIsCalculatingStats(true);
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
                alert(`BŁĄD ZAPISU: ${error.response.data.message}`);
            } else {
                alert("Błąd połączenia z serwerem obliczeniowym.");
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
        calculateStats,
        resetStats,
        restoreStats,
    };
};
