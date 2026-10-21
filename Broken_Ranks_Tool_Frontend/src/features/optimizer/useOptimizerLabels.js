import { useCallback, useEffect, useMemo, useState } from "react";
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
    useEffect(() => {
        const changed = (event) => setMode(normalizeOptimizerLabelMode(event.detail));
        const stored = (event) => {
            if (event.key === OPTIMIZER_LABEL_STORAGE_KEY || event.key === null)
                setMode(readMode());
        };
        window.addEventListener("optimizer-label-mode-change", changed);
        window.addEventListener("storage", stored);
        return () => {
            window.removeEventListener("optimizer-label-mode-change", changed);
            window.removeEventListener("storage", stored);
        };
    }, []);
    const changeMode = useCallback((value) => {
        const next = normalizeOptimizerLabelMode(value);
        setMode(next);
        try {
            localStorage.setItem(OPTIMIZER_LABEL_STORAGE_KEY, next);
        } catch {
            /* The current session can still use the selected names. */
        }
        window.dispatchEvent(new CustomEvent("optimizer-label-mode-change", { detail: next }));
    }, []);
    return useMemo(
        () => ({ ...createOptimizerLabels(gameRules, drifs, mode), changeMode }),
        [changeMode, drifs, gameRules, mode]
    );
};
