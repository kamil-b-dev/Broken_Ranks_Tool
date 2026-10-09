import { useRef, useState } from "react";

/** Coordinates build import and the user-facing result notice. */
export const useBuildFileActions = ({ loadBuildFromFile }) => {
    const fileInputRef = useRef(null);
    const [notice, setNotice] = useState(null);

    const loadBuild = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const summary = await loadBuildFromFile(file);
            const skipped = (summary?.skippedDrifs || 0) + (summary?.skippedOrbs || 0);
            const details = summary
                ? ` (${summary.importedItems}/12 przedmiotów, ${summary.importedDrifs} drifów${skipped ? `; pominięto ${skipped} nierozpoznanych dodatków` : ""})`
                : "";
            setNotice({
                type: skipped ? "warning" : "success",
                message: `Wczytano build z pliku ${file.name}${details}.`,
            });
        } catch (error) {
            setNotice({ type: "error", message: `Nie udało się wczytać buildu: ${error.message}` });
        } finally {
            event.target.value = "";
        }
    };

    return { fileInputRef, notice, dismissNotice: () => setNotice(null), loadBuild };
};
