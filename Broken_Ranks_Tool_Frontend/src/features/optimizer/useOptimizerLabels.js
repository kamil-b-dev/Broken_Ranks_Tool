import { useCallback, useMemo, useState } from "react";
import {
    createOptimizerLabels,
    normalizeOptimizerLabelMode,
    OPTIMIZER_LABEL_STORAGE_KEY,
} from "./optimizerLabels";

const readMode = () => {
    try {
        return normalizeOptimizerLabelMode(localStorage.getItem(OPTIMIZER_LABEL_STORAGE_KEY));
    } catch {
        return "MODIFIERS";
    }
};

/** Stores a shared interface preference independently of builds and optimizer requests. */
export const useOptimizerLabels = (gameRules, drifs) => {
    const [mode, setMode] = useState(readMode);
    const changeMode = useCallback((value) => {
        const next = normalizeOptimizerLabelMode(value);
        setMode(next);
        try {
            localStorage.setItem(OPTIMIZER_LABEL_STORAGE_KEY, next);
        } catch {
            /* The current session can still use the selected names. */
        }
    }, []);
    return useMemo(
        () => ({ ...createOptimizerLabels(gameRules, drifs, mode), changeMode }),
        [changeMode, drifs, gameRules, mode]
    );
};
