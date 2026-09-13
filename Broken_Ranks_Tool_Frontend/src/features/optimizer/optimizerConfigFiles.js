const MAX_CONFIG_FILE_SIZE = 1024 * 1024;

/** Downloads an optimizer configuration as a dated JSON file. */
export const downloadOptimizerConfiguration = (payload, date = new Date()) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `broken-ranks-priorytety-${date.toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Reads and parses a user-selected optimizer configuration file. */
export const readOptimizerConfigurationFile = async (file) => {
    if (file.size > MAX_CONFIG_FILE_SIZE) {
        throw new Error("Plik konfiguracji jest zbyt duży.");
    }
    return JSON.parse(await file.text());
};
