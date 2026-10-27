import { useRef, useState } from "react";

/** Coordinates build import and the user-facing result notice. */
export const useBuildFileActions = ({ loadBuildFromFile }) => {
    const fileInputRef = useRef(null);
    const [notice, setNotice] = useState(null);
    const importVersion = useRef(0);

    const loadBuild = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const input = event.target;
        input.value = "";
        const version = ++importVersion.current;
        try {
            const summary = await loadBuildFromFile(file);
            if (version !== importVersion.current || summary === false) return;
            const skipped = (summary?.skippedDrifs || 0) + (summary?.skippedOrbs || 0);
            const warnings = summary?.warnings || [];
            const details = [];
            if (summary)
                details.push(
                    `Ekwipunek: ${summary.importedItems}/12 przedmiotów, ${summary.importedDrifs} drifów, ${summary.importedOrbs || 0} orbów.`
                );
            if (summary?.importedBackpackItems)
                details.push(
                    `Plecak: ${summary.importedBackpackItems} przedmiotów, ${summary.importedBackpackDrifs || 0} drifów, ${summary.importedBackpackOrbs || 0} orbów.`
                );
            const omissions = [];
            if (summary?.skippedOrbs)
                omissions.push(
                    `Pominięto ${summary.skippedOrbs} orbów bez jednoznacznego odpowiednika.`
                );
            if (summary?.skippedDrifs)
                omissions.push(`Pominięto ${summary.skippedDrifs} nierozpoznanych drifów.`);
            if (summary?.skippedBackpackItems)
                omissions.push(
                    `Pominięto ${summary.skippedBackpackItems} nierozpoznanych przedmiotów plecaka.`
                );
            if (summary?.skippedSkins) omissions.push(`Pominięto ${summary.skippedSkins} skórek.`);
            setNotice({
                type:
                    skipped || summary?.skippedBackpackItems || warnings.length
                        ? "warning"
                        : "success",
                message: `Wczytano build z pliku ${file.name}.`,
                details: [...details, ...omissions, ...warnings],
            });
            return true;
        } catch (error) {
            if (version !== importVersion.current) return;
            setNotice({ type: "error", message: `Nie udało się wczytać buildu: ${error.message}` });
            return false;
        }
    };

    return { fileInputRef, notice, dismissNotice: () => setNotice(null), loadBuild };
};
