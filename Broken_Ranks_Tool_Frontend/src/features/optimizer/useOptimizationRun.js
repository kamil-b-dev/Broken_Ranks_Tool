import { useCallback, useRef, useState } from "react";

const currentTime = () => performance.now();

/** Owns optimization execution state, timing, result, and active result variant. */
export const useOptimizationRun = (runOptimization, now = currentTime, captureInput) => {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [startedAt, setStartedAt] = useState(null);
    const [lastDurationSeconds, setLastDurationSeconds] = useState(null);
    const [status, setStatus] = useState(null);
    const [analysisInput, setAnalysisInput] = useState(null);
    const [activeVariantIndex, setActiveVariantIndex] = useState(0);
    const startedAtRef = useRef(null);
    const runVersionRef = useRef(0);

    const run = async (configuration) => {
        const runVersion = ++runVersionRef.current;
        const capturedInput = captureInput ? structuredClone(captureInput()) : null;
        const capturedConfiguration = capturedInput ? structuredClone(configuration) : null;
        setIsOptimizing(true);
        setElapsedSeconds(0);
        const startedAt = now();
        setStartedAt(startedAt);
        startedAtRef.current = startedAt;

        try {
            const result = await runOptimization(configuration);
            if (runVersion !== runVersionRef.current) return result;
            setStatus({
                ...result,
                ...(configuration.configurationMode
                    ? { configurationMode: configuration.configurationMode }
                    : {}),
            });
            setActiveVariantIndex(0);
            setAnalysisInput(
                capturedInput
                    ? {
                          ...structuredClone(capturedInput),
                          optimization: capturedConfiguration,
                      }
                    : null
            );
            return result;
        } finally {
            if (runVersion === runVersionRef.current) {
                const durationSeconds = Math.floor((now() - startedAt) / 1000);
                setElapsedSeconds(durationSeconds);
                setLastDurationSeconds(durationSeconds);
                startedAtRef.current = null;
                setStartedAt(null);
                setIsOptimizing(false);
            }
        }
    };

    const reset = useCallback(() => {
        runVersionRef.current += 1;
        startedAtRef.current = null;
        setStartedAt(null);
        setIsOptimizing(false);
        setElapsedSeconds(0);
        setStatus(null);
        setAnalysisInput(null);
        setActiveVariantIndex(0);
    }, []);

    return {
        isOptimizing,
        elapsedSeconds,
        startedAt,
        lastDurationSeconds,
        status,
        analysisInput,
        activeVariantIndex,
        setActiveVariantIndex,
        reset,
        run,
    };
};
