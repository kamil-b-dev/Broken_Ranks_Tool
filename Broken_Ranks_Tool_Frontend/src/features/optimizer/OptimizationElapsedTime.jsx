import { useEffect, useState } from "react";

/** Only the counter updates once a second; editing forms never subscribe to its clock. */
export default function OptimizationElapsedTime({ startedAt, elapsedSeconds = 0 }) {
    const [time, setTime] = useState(() => performance.now());
    useEffect(() => {
        if (startedAt == null) return;
        let timer;
        const tick = () => setTime(performance.now());
        const visibility = () => {
            clearInterval(timer);
            if (!document.hidden) {
                tick();
                timer = setInterval(tick, 1000);
            }
        };
        if (!document.hidden) timer = setInterval(tick, 1000);
        document.addEventListener("visibilitychange", visibility);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", visibility);
        };
    }, [startedAt]);
    return startedAt == null ? elapsedSeconds : Math.max(0, Math.floor((time - startedAt) / 1000));
}
