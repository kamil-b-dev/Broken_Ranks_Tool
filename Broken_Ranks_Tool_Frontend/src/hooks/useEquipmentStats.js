import { useCallback, useState } from "react";
import { calculateEquipmentStats } from "../api/equipmentApi";

const emptySources = () => ({ drifCategories: {}, orbBonusTypes: [] });

/** Owns calculated statistics, their display sources, and calculation progress. */
export const useEquipmentStats = (requestData) => {
    const [stats, setStats] = useState(null);
    const [statSources, setStatSources] = useState(emptySources);
    const [isCalculatingStats, setIsCalculatingStats] = useState(false);

    const calculateStats = useCallback(async () => {
        setIsCalculatingStats(true);
        try {
            const response = await calculateEquipmentStats(requestData);
            setStats(response.stats || response);
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
    }, [requestData]);

    const resetStats = useCallback(() => {
        setStats(null);
        setStatSources(emptySources());
    }, []);

    return { stats, statSources, isCalculatingStats, calculateStats, resetStats };
};
