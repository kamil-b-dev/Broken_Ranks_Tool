import { useContext, useEffect } from "react";
import { EquipmentHistoryContext } from "../../shared/state/EquipmentContext";
import { useTranslation } from "../../shared/i18n/useTranslation";
import "./workspace-actions.css";

export default function EquipmentHistoryControls() {
    const history = useContext(EquipmentHistoryContext);
    const { t } = useTranslation();
    useEffect(() => {
        if (!history) return;
        const keydown = (event) => {
            // Keep native undo in fields, contenteditable regions and dialogs.
            if (
                event.defaultPrevented ||
                event.altKey ||
                !(event.ctrlKey || event.metaKey) ||
                event.target.closest?.(
                    "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='dialog']"
                )
            )
                return;
            const key = event.key.toLowerCase();
            const redo = (key === "z" && event.shiftKey) || (key === "y" && !event.metaKey);
            if (key !== "z" && !redo) return;
            if (redo ? history.canRedo : history.canUndo) {
                event.preventDefault();
                (redo ? history.redo : history.undo)();
            }
        };
        document.addEventListener("keydown", keydown);
        return () => document.removeEventListener("keydown", keydown);
    }, [history]);
    if (!history) return null;
    return (
        <div
            className="equipment-history-actions"
            role="group"
            aria-label={t("Historia zmian buildu")}
        >
            <button
                type="button"
                disabled={!history.canUndo}
                onClick={history.undo}
                title={t("Cofnij zmianę buildu (Ctrl/Cmd+Z)")}
            >
                <span aria-hidden="true">↶</span> {t("Cofnij")}
            </button>
            <button
                type="button"
                disabled={!history.canRedo}
                onClick={history.redo}
                title={t("Ponów zmianę buildu (Ctrl/Cmd+Shift+Z)")}
            >
                <span aria-hidden="true">↷</span> {t("Ponów")}
            </button>
        </div>
    );
}
