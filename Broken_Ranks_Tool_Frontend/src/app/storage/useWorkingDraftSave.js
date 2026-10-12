import { useEffect, useLayoutEffect, useRef } from "react";

/** Coalesces automatic writes and flushes the last committed draft before leaving. */
export const useWorkingDraftSave = (save, value, enabled = true) => {
    const latest = useRef(null);
    const timer = useRef(null);
    useLayoutEffect(() => {
        latest.current = enabled ? value : null;
        if (timer.current != null) clearTimeout(timer.current);
        if (enabled)
            timer.current = setTimeout(() => {
                timer.current = null;
                if (latest.current != null) save(latest.current);
            }, 150);
    }, [enabled, save, value]);
    useEffect(() => {
        const flush = () => {
            if (timer.current == null) return;
            clearTimeout(timer.current);
            timer.current = null;
            if (latest.current != null) save(latest.current);
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
    }, [save]);
};
