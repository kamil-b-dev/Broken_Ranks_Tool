import { useEffect, useRef, useState } from "react";

const currentTime = () => performance.now();

/** Owns optimization execution state, timing, result, and active result variant. */
export const useOptimizationRun = (runOptimization, now = currentTime) => {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [lastDurationSeconds, setLastDurationSeconds] = useState(null);
    const [status, setStatus] = useState(null);
    const [activeVariantIndex, setActiveVariantIndex] = useState(0);
    const startedAtRef = useRef(null);

    useEffect(() => {
        if (!isOptimizing) return undefined;
        const timerId = window.setInterval(() => {
            if (startedAtRef.current === null) return;
            setElapsedSeconds(Math.floor((now() - startedAtRef.current) / 1000));
        }, 250);
        return () => window.clearInterval(timerId);
    }, [isOptimizing, now]);

    const run = async (configuration) => {
        setIsOptimizing(true);
        setElapsedSeconds(0);
        const startedAt = now();
        startedAtRef.current = startedAt;

        try {
            const result = await runOptimization(configuration);
            setStatus(result);
            setActiveVariantIndex(0);
            return result;
        } finally {
            const durationSeconds = Math.floor((now() - startedAt) / 1000);
            setElapsedSeconds(durationSeconds);
            setLastDurationSeconds(durationSeconds);
            startedAtRef.current = null;
            setIsOptimizing(false);
        }
    };

    return {
        isOptimizing,
        elapsedSeconds,
        lastDurationSeconds,
        status,
        activeVariantIndex,
        setActiveVariantIndex,
        run,
    };
};
