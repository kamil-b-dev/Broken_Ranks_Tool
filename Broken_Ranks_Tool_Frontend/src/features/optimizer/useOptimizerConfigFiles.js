import { useRef } from "react";
import {
    createOptimizerConfigPayload,
    mergeOptimizerSettings,
    parseOptimizerConfigPayload,
} from "./optimizerConfiguration";
import {
    downloadOptimizerConfiguration,
    readOptimizerConfigurationFile,
} from "./optimizerConfigFiles";

/** Owns optimizer configuration import and export interactions. */
export const useOptimizerConfigFiles = ({
    priorities,
    settings,
    gameRules,
    replaceConfiguration,
    onSettingsChange,
    onNotice = () => {},
}) => {
    const inputRef = useRef(null);
    const save = () =>
        downloadOptimizerConfiguration(createOptimizerConfigPayload(priorities, settings));
    const load = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            const imported = parseOptimizerConfigPayload(
                await readOptimizerConfigurationFile(file),
                gameRules
            );
            replaceConfiguration(imported);
            if (imported.maxVariantLossPercent !== null || imported.mode !== null)
                onSettingsChange((previous) => mergeOptimizerSettings(previous, imported));
            onNotice({
                type: "success",
                message: `Wczytano konfigurację: ${imported.priorities.length} priorytetów.`,
            });
        } catch (error) {
            const message = error.message || "niepoprawny plik JSON.";
            onNotice({
                type: "error",
                message:
                    message === "Plik konfiguracji jest zbyt duży."
                        ? message
                        : `Nie udało się wczytać konfiguracji: ${message}`,
            });
        }
    };
    return { inputRef, save, load };
};
