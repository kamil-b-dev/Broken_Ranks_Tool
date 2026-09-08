import { useRef } from "react";
import {
    createOptimizerConfigPayload,
    parseOptimizerConfigPayload,
} from "../components/optimization/optimizerConfiguration";
import {
    downloadOptimizerConfiguration,
    readOptimizerConfigurationFile,
} from "../components/optimization/optimizerConfigFiles";

/** Owns optimizer configuration import and export interactions. */
export const useOptimizerConfigFiles = ({
    priorities,
    settings,
    gameRules,
    replaceConfiguration,
    onSettingsChange,
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
                onSettingsChange((previous) => ({
                    ...previous,
                    advisorProfession: imported.advisorProfession,
                    ...(imported.advisorGoal !== null ? { advisorGoal: imported.advisorGoal } : {}),
                    ...(imported.advisorSearch !== null
                        ? { advisorSearch: imported.advisorSearch }
                        : {}),
                    ...(imported.advisorProtectedModifiers !== null
                        ? { advisorProtectedModifiers: imported.advisorProtectedModifiers }
                        : {}),
                    ...(imported.advisorAllowedChanges !== null
                        ? { advisorAllowedChanges: imported.advisorAllowedChanges }
                        : {}),
                    ...(imported.maxVariantLossPercent !== null
                        ? { maxVariantLossPercent: imported.maxVariantLossPercent }
                        : {}),
                    ...(imported.mode !== null ? { mode: imported.mode } : {}),
                }));
            alert(`Wczytano konfigurację: ${imported.priorities.length} priorytetów.`);
        } catch (error) {
            const message = error.message || "niepoprawny plik JSON.";
            alert(
                message === "Plik konfiguracji jest zbyt duży."
                    ? message
                    : `Nie udało się wczytać konfiguracji: ${message}`
            );
        }
    };
    return { inputRef, save, load };
};
