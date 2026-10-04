const PREFERENCE_KEY = "broken-ranks-tool.presentation";

/** A narrow desktop window and touch laptops retain the existing desktop UI. */
export const detectPresentation = ({
    userAgent = "",
    platform = "",
    maxTouchPoints = 0,
    userAgentData,
} = {}) => {
    const isIPad = platform === "MacIntel" && maxTouchPoints > 1;
    return userAgentData?.mobile || /Android|iPhone|iPad|iPod/i.test(userAgent) || isIPad
        ? "mobile"
        : "desktop";
};

/** Explicit previews persist only in this browser tab, including route changes. */
export const getPresentation = () => {
    const requested = new URLSearchParams(window.location.search).get("ui");
    const override = ["mobile", "desktop"].includes(requested) ? requested : null;
    try {
        if (override) window.sessionStorage.setItem(PREFERENCE_KEY, override);
        const saved = override || window.sessionStorage.getItem(PREFERENCE_KEY);
        if (["mobile", "desktop"].includes(saved)) return saved;
    } catch {
        // Device detection also works when browser storage is unavailable.
    }
    return override || detectPresentation(window.navigator);
};
