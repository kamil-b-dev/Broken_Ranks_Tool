import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { calculateEquipmentStats } from "../../shared/api/equipmentApi";

const emptySources = () => ({ drifCategories: {}, orbBonusTypes: [] });

/** Owns calculated statistics, their display sources, and calculation progress. */
export const useEquipmentStats = (requestData) => {
    const [stats, setStats] = useState(null);
    const [statSources, setStatSources] = useState(emptySources);
    const [calculatedRequestFingerprint, setCalculatedRequestFingerprint] = useState(null);
    const [isCalculatingStats, setIsCalculatingStats] = useState(false);
    const [calculationNotice, setCalculationNotice] = useState(null);
    const calculationVersion = useRef(0);
    const calculationRequestFingerprint = useRef(null);
    const requestFingerprint = useMemo(() => JSON.stringify(requestData), [requestData]);
    const statsAreCurrent = Boolean(stats) && calculatedRequestFingerprint === requestFingerprint;

    useLayoutEffect(() => {
        // An import may already be calculating the request being installed in state.
        if (calculationRequestFingerprint.current === requestFingerprint) return;
        calculationVersion.current += 1;
        setIsCalculatingStats(false);
        setCalculationNotice(null);
    }, [requestFingerprint]);

    const calculateStatsFor = useCallback(async (nextRequestData) => {
        const nextFingerprint = JSON.stringify(nextRequestData);
        const version = ++calculationVersion.current;
        calculationRequestFingerprint.current = nextFingerprint;
        setIsCalculatingStats(true);
        setCalculationNotice(null);
        try {
            const response = await calculateEquipmentStats(nextRequestData);
            if (version !== calculationVersion.current) return;
            setStats(response.stats || response);
            setCalculatedRequestFingerprint(nextFingerprint);
            setStatSources({
                drifCategories: response.drifCategories || {},
                orbBonusTypes: response.orbBonusTypes || [],
            });
        } catch (error) {
            if (version !== calculationVersion.current) return;
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
            if (version === calculationVersion.current) setIsCalculatingStats(false);
        }
    }, []);
    const calculateStats = useCallback(
        () => calculateStatsFor(requestData),
        [calculateStatsFor, requestData]
    );

    const resetStats = useCallback(() => {
        calculationVersion.current += 1;
        calculationRequestFingerprint.current = null;
        setIsCalculatingStats(false);
        setCalculationNotice(null);
        setStats(null);
        setStatSources(emptySources());
        setCalculatedRequestFingerprint(null);
    }, []);
    const dismissCalculationNotice = useCallback(() => setCalculationNotice(null), []);

    const restoreStats = useCallback((nextStats, nextSources = {}, nextRequestData = null) => {
        calculationVersion.current += 1;
        calculationRequestFingerprint.current = nextRequestData
            ? JSON.stringify(nextRequestData)
            : null;
        setIsCalculatingStats(false);
        setCalculationNotice(null);
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
        calculateStatsFor,
        resetStats,
        restoreStats,
    };
};
