import { useRef, useState } from "react";

/** Coordinates build import/export and the user-facing result notice. */
export const useBuildFileActions = ({ saveBuildToFile, loadBuildFromFile }) => {
    const fileInputRef = useRef(null);
    const [notice, setNotice] = useState(null);

    const saveBuild = () => {
        try {
            saveBuildToFile();
            setNotice({ type: "success", message: "Build został zapisany w pliku JSON." });
        } catch (error) {
            setNotice({ type: "error", message: `Nie udało się zapisać buildu: ${error.message}` });
        }
    };
    const loadBuild = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            await loadBuildFromFile(file);
            setNotice({ type: "success", message: `Wczytano build z pliku ${file.name}.` });
        } catch (error) {
            setNotice({ type: "error", message: `Nie udało się wczytać buildu: ${error.message}` });
        } finally {
            event.target.value = "";
        }
    };

    return { fileInputRef, notice, dismissNotice: () => setNotice(null), saveBuild, loadBuild };
};
