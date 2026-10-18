import { useTranslation } from "../../../shared/i18n/useTranslation";
import { removalKey } from "./backpackEquipmentRemoval";
import "./equipment-removal.css";

/** One transfer action and its guarded undo, shared by desktop and touch editors. */
export default function EquipmentRemovalAction({
    actions,
    kind,
    slotKey,
    zone,
    label,
    iconOnly = false,
}) {
    const { t } = useTranslation();

    if (!actions) return null;
    const key = actions.getKey?.(kind, slotKey, zone) || removalKey(kind, slotKey, zone);
    const warning = actions.getRemovalWarning(kind, slotKey, zone);
    const undoWarning = actions.getUndoWarning(key);
    return (
        <div
            className={`equipment-removal-action${iconOnly ? " equipment-removal-action-icon" : ""}`}
            role="group"
            aria-label={t(label)}
        >
            <button
                type="button"
                aria-label={t(label)}
                disabled={Boolean(warning)}
                title={t(warning || label)}
                onClick={() => actions.removeEquipment(kind, slotKey, zone)}
            >
                {iconOnly ? (
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        aria-hidden="true"
                    >
                        <path
                            d="M8 6V5a4 4 0 0 1 8 0v1M7 6h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M8 14h8v5H8zM8 10h8M4 11H2v7h2m16-7h2v7h-2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                ) : (
                    label
                )}
            </button>
            <button
                type="button"
                className="equipment-removal-undo"
                aria-label={t("Cofnij: {0}", [t(label)])}
                title={t(undoWarning || `Cofnij: ${label}`)}
                disabled={Boolean(undoWarning)}
                onClick={() => actions.undoRemoval(key)}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                >
                    <path
                        d="M9 5 3 11l6 6M3 11h11a7 7 0 0 1 7 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
        </div>
    );
}
