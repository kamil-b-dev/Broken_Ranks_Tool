import { useEffect, useState } from "react";
import { explainEquipmentStats } from "../../../shared/api/equipmentApi";

/** Keep details bound to the equipment and catalogue that produced them. */
export function useStatExplanation(requestData, gameRules, catalog) {
    const identity = JSON.stringify([requestData, gameRules]);
    const empty = { identity, catalog, selected: null, opener: null, data: null, error: false };
    const [state, setState] = useState(empty);
    const matches = state.identity === identity && state.catalog === catalog;
    if (!matches) setState(empty);
    const { selected, opener, data, error } = matches ? state : empty;
    useEffect(() => {
        if (!selected || data || error) return;
        const controller = new AbortController();
        let active = true;
        explainEquipmentStats(requestData, { signal: controller.signal }).then(
            (result) => {
                if (active) setState((previous) => ({ ...previous, data: result }));
            },
            () => {
                if (active) setState((previous) => ({ ...previous, error: true }));
            }
        );
        return () => {
            active = false;
            controller.abort();
        };
    }, [selected, data, error, requestData, identity, catalog]);
    return {
        selected,
        opener,
        data,
        error,
        open: requestData
            ? (stat, element) =>
                  setState((previous) => ({ ...previous, selected: stat, opener: element }))
            : undefined,
        close: () => setState((previous) => ({ ...previous, selected: null })),
        retry: () => setState((previous) => ({ ...previous, error: false })),
    };
}
