import { useEffect, useState } from "react";
import { fetchInitialEquipmentData } from "../api/equipmentApi";

const emptyData = { items: [], orbs: [], drifs: [] };

/** Loads and owns the read-only game catalog required by the equipment workspace. */
export const useEquipmentCatalog = () => {
    const [data, setData] = useState(emptyData);
    const [categoryNames, setCategoryNames] = useState({});
    const [orbCategories, setOrbCategories] = useState({});
    const [drifCategories, setDrifCategories] = useState({});
    const [gameRules, setGameRules] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialDataError, setInitialDataError] = useState(null);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const initialData = await fetchInitialEquipmentData();
                if (!active) return;
                setData({
                    items: initialData.items || [],
                    orbs: initialData.orbs || [],
                    drifs: initialData.drifs || [],
                });
                setGameRules(initialData.gameRules || {});
                setCategoryNames(initialData.dictionaries?.itemCategories || {});
                setOrbCategories(initialData.dictionaries?.orbCategories || {});
                setDrifCategories(initialData.dictionaries?.drifCategories || {});
            } catch (error) {
                if (!active) return;
                console.error("Błąd podczas ładowania danych początkowych:", error);
                setInitialDataError(
                    error.response?.data?.message || "Nie udało się połączyć z backendem."
                );
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    return {
        data,
        categoryNames,
        orbCategories,
        drifCategories,
        gameRules,
        loading,
        initialDataError,
    };
};
