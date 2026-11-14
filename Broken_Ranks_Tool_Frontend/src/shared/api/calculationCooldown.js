import apiClient from "./axiosConfig";

// Optimizer modes and progression planning share the server's calculation quota.
let retryAt = 0;
let timer;
const listeners = new Set();

export const getCalculationCooldown = () => Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));

const schedule = () => {
    clearTimeout(timer);
    if (listeners.size && getCalculationCooldown() > 0)
        timer = setTimeout(publish, Math.min(1000, retryAt - Date.now()));
};

function publish() {
    if (getCalculationCooldown() === 0) retryAt = 0;
    listeners.forEach((listener) => listener());
    schedule();
}

export const subscribeCalculationCooldown = (listener) => {
    if (listeners.size === 0) {
        window.addEventListener("focus", publish);
        document.addEventListener("visibilitychange", publish);
    }
    listeners.add(listener);
    publish();
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
            window.removeEventListener("focus", publish);
            document.removeEventListener("visibilitychange", publish);
        }
        schedule();
    };
};

/** Only calculation requests affect this cooldown; calculator and cancel quotas are separate. */
export const postCalculation = async (url, request, options) => {
    const remaining = getCalculationCooldown();
    if (remaining > 0) throw new Error("Przekroczono limit żądań. Spróbuj ponownie później.");
    try {
        return await (options
            ? apiClient.post(url, request, options)
            : apiClient.post(url, request));
    } catch (error) {
        const header = error.response?.headers?.["retry-after"];
        // Our API returns Retry-After as a whole number of seconds.
        if (error.response?.status === 429 && typeof header === "string" && /^\d+$/.test(header)) {
            const deadline = Date.now() + Number(header) * 1000;
            if (Number.isSafeInteger(deadline) && deadline > Date.now()) {
                retryAt = Math.max(retryAt, deadline);
                publish();
            }
        }
        throw error;
    }
};
