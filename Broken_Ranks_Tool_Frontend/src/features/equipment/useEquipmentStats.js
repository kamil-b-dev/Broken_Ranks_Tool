import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { calculateEquipmentStats } from "../../shared/api/equipmentApi";
import { equipmentRequestIdentity } from "../../shared/domain/equipment/equipmentRequestIdentity";

const EMPTY_SOURCES = Object.freeze({
    drifCategories: Object.freeze({}),
    orbBonusTypes: Object.freeze([]),
});
const emptySources = () => EMPTY_SOURCES;

/** Owns calculated statistics, their display sources, and calculation progress. */
export const useEquipmentStats = (requestData) => {
    const [stats, setStats] = useState(null);
    const [statSources, setStatSources] = useState(emptySources);
    const [calculatedRequestFingerprint, setCalculatedRequestFingerprint] = useState(null);
    const [isCalculatingStats, setIsCalculatingStats] = useState(false);
    const [calculationNotice, setCalculationNotice] = useState(null);
    const calculationVersion = useRef(0);
    const calculationRequestFingerprint = useRef(null);
    const pending = useRef(null);
    const requestFingerprint = useMemo(() => equipmentRequestIdentity(requestData), [requestData]);
    const statsAreCurrent = Boolean(stats) && calculatedRequestFingerprint === requestFingerprint;

    useLayoutEffect(() => {
        // An import may already be calculating the request being installed in state.
        if (calculationRequestFingerprint.current === requestFingerprint) return;
        pending.current?.controller.abort();
        pending.current = null;
        calculationVersion.current += 1;
        setIsCalculatingStats(false);
        setCalculationNotice(null);
    }, [requestFingerprint]);

    useEffect(
        () => () => {
            calculationVersion.current += 1;
            pending.current?.controller.abort();
            pending.current = null;
        },
        []
    );

    const calculateStatsFor = useCallback((nextRequestData) => {
        const nextFingerprint = equipmentRequestIdentity(nextRequestData);
        if (pending.current?.fingerprint === nextFingerprint) return pending.current.promise;
        pending.current?.controller.abort();
        const controller = new AbortController();
        const version = ++calculationVersion.current;
        calculationRequestFingerprint.current = nextFingerprint;
        setIsCalculatingStats(true);
        setCalculationNotice(null);
        const entry = { fingerprint: nextFingerprint, controller, promise: null };
        pending.current = entry;
        const promise = (async () => {
            try {
                const response = await calculateEquipmentStats(nextRequestData, {
                    signal: controller.signal,
                });
                if (version !== calculationVersion.current || controller.signal.aborted) return;
                setStats(response.stats || response);
                setCalculatedRequestFingerprint(nextFingerprint);
                setStatSources({
                    drifCategories: response.drifCategories || {},
                    orbBonusTypes: response.orbBonusTypes || [],
                });
            } catch (error) {
                if (version !== calculationVersion.current || controller.signal.aborted) return;
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
                if (version === calculationVersion.current) {
                    pending.current = null;
                    setIsCalculatingStats(false);
                }
            }
        })();
        entry.promise = promise;
        return promise;
    }, []);
    const calculateStats = useCallback(
        () => calculateStatsFor(requestData),
        [calculateStatsFor, requestData]
    );

    const dismissCalculationNotice = useCallback(() => setCalculationNotice(null), []);

    const restoreStats = useCallback((nextStats, nextSources = {}, nextRequestData = null) => {
        pending.current?.controller.abort();
        pending.current = null;
        calculationVersion.current += 1;
        calculationRequestFingerprint.current = nextRequestData
            ? equipmentRequestIdentity(nextRequestData)
            : null;
        setIsCalculatingStats(false);
        setCalculationNotice(null);
        setStats(nextStats || null);
        setCalculatedRequestFingerprint(
            nextStats && nextRequestData ? equipmentRequestIdentity(nextRequestData) : null
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
        restoreStats,
    };
};
