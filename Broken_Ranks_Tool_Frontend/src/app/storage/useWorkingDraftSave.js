import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Coalesces automatic writes and flushes the last committed draft before leaving. */
export const useWorkingDraftSave = (save, value, enabled = true) => {
    const latest = useRef(null);
    const timer = useRef(null);
    const [saveFailed, setSaveFailed] = useState(false);
    const retrySave = useCallback(() => {
        if (latest.current == null) return false;
        if (timer.current != null) clearTimeout(timer.current);
        timer.current = null;
        try {
            const succeeded = save(latest.current) !== false;
            setSaveFailed(!succeeded);
            return succeeded;
        } catch {
            setSaveFailed(true);
            return false;
        }
    }, [save]);
    useLayoutEffect(() => {
        latest.current = enabled ? value : null;
        if (timer.current != null) clearTimeout(timer.current);
        if (enabled)
            timer.current = setTimeout(() => {
                timer.current = null;
                retrySave();
            }, 150);
    }, [enabled, retrySave, value]);
    useEffect(() => {
        const flush = () => {
            if (timer.current == null) return;
            clearTimeout(timer.current);
            timer.current = null;
            retrySave();
        };
        const visibility = () => {
            if (document.hidden) flush();
        };
        window.addEventListener("pagehide", flush);
        document.addEventListener("visibilitychange", visibility);
        return () => {
            flush();
            window.removeEventListener("pagehide", flush);
            document.removeEventListener("visibilitychange", visibility);
        };
    }, [retrySave]);
    return { saveFailed, retrySave };
};
