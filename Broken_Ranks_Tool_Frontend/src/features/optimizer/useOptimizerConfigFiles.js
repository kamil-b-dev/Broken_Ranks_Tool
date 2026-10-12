import { useRef } from "react";
import {
    createOptimizerConfigPayload,
    mergeOptimizerSettings,
    parseOptimizerConfigPayload,
    findInvalidPercentageTarget,
    findInvalidSizeConstraint,
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
    const importVersion = useRef(0);
    const save = () => {
        const advanced = settings.mode !== "ADVISOR" && settings.configurationMode !== "SIMPLE";
        const invalid =
            advanced &&
            (findInvalidPercentageTarget(priorities) || findInvalidSizeConstraint(priorities));
        if (invalid) {
            onNotice({
                type: "error",
                message: `Uzupełnij poprawne ograniczenia celu ${invalid.value || invalid.key} przed zapisaniem konfiguracji.`,
            });
            return;
        }
        downloadOptimizerConfiguration(createOptimizerConfigPayload(priorities, settings));
    };
    const load = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const version = ++importVersion.current;
        try {
            const imported = parseOptimizerConfigPayload(
                await readOptimizerConfigurationFile(file),
                gameRules
            );
            if (version !== importVersion.current) return;
            replaceConfiguration(imported);
            if (imported.maxVariantLossPercent !== null || imported.mode !== null)
                onSettingsChange((previous) => mergeOptimizerSettings(previous, imported));
            onNotice({
                type: "success",
                message: `Wczytano konfigurację: ${imported.priorities.length} priorytetów.`,
            });
        } catch (error) {
            if (version !== importVersion.current) return;
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
