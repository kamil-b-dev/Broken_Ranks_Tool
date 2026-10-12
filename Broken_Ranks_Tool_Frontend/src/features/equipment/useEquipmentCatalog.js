import { useEffect, useState } from "react";
import { fetchInitialEquipmentData } from "../../shared/api/equipmentApi";

const emptyData = { items: [], orbs: [], drifs: [] };

/** Loads and owns the read-only game catalog required by the equipment workspace. */
export const CATALOG_DEMAND_EVENT = "broken-ranks-tool:catalog-demand";
export const requestEquipmentCatalog = () => window.dispatchEvent(new Event(CATALOG_DEMAND_EVENT));

export const useEquipmentCatalog = ({ deferHome = false } = {}) => {
    const [data, setData] = useState(emptyData);
    const [categoryNames, setCategoryNames] = useState({});
    const [orbCategories, setOrbCategories] = useState({});
    const [drifCategories, setDrifCategories] = useState({});
    const [gameRules, setGameRules] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialDataError, setInitialDataError] = useState(null);

    useEffect(() => {
        let active = true;
        let started = false;
        let idle;
        let delay;
        const controller = new AbortController();
        const load = async () => {
            if (!active || started) return;
            started = true;
            try {
                const initialData = await fetchInitialEquipmentData({ signal: controller.signal });
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
        const demand = () => {
            void load();
        };
        const route = () => {
            if (window.location.pathname !== "/") demand();
        };
        window.addEventListener(CATALOG_DEMAND_EVENT, demand);
        window.addEventListener("popstate", route);
        if (deferHome && window.location.pathname === "/") {
            delay = setTimeout(() => {
                if (typeof window.requestIdleCallback === "function")
                    idle = window.requestIdleCallback(demand, { timeout: 1000 });
                else demand();
            }, 100);
        } else demand();
        return () => {
            active = false;
            controller.abort();
            clearTimeout(delay);
            if (idle != null) window.cancelIdleCallback(idle);
            window.removeEventListener(CATALOG_DEMAND_EVENT, demand);
            window.removeEventListener("popstate", route);
        };
    }, [deferHome]);

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
