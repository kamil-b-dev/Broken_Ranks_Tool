import { useLayoutEffect, useRef } from "react";
import {
    DRIF_CATEGORY_LABELS,
    DRIF_CATEGORY_ORDER,
} from "../../../shared/domain/equipment/drifCategories";

export default function MobileBonusPicker({ model, onClose }) {
    const dialog = useRef(null);
    useLayoutEffect(() => {
        const element = dialog.current;
        const opener = document.activeElement;
        element.showModal();
        return () => {
            element.close();
            if (opener?.isConnected) opener.focus();
        };
    }, []);
    return (
        <dialog
            ref={dialog}
            className="mobile-bonus-picker"
            aria-labelledby="mobile-bonus-title"
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    onClose();
                }
            }}
        >
            <header>
                <h2 id="mobile-bonus-title">Dodaj cel</h2>
                <button type="button" onClick={onClose} aria-label="Zamknij wybór celu">
                    ✕
                </button>
            </header>
            <label className="mobile-field">
                Szukaj bonusu
                <input
                    type="search"
                    value={model.searchQuery}
                    onChange={(event) => model.setSearchQuery(event.target.value)}
                />
            </label>
            <label className="mobile-field">
                Kategoria
                <select
                    value={model.selectedCategory}
                    onChange={(event) => model.setSelectedCategory(event.target.value)}
                >
                    <option value="ALL">Wszystkie</option>
                    {DRIF_CATEGORY_ORDER.map((key) => (
                        <option key={key} value={key}>
                            {model.drifCategories?.[key] || DRIF_CATEGORY_LABELS[key]}
                        </option>
                    ))}
                </select>
            </label>
            <div className="mobile-bonus-results">
                {model.availableBonuses.map((bonus) => (
                    <button
                        key={bonus.key}
                        type="button"
                        onClick={() => {
                            model.selectBonus(bonus);
                            onClose();
                        }}
                    >
                        <span>{bonus.value}</span>
                        <span aria-hidden="true">＋</span>
                    </button>
                ))}
            </div>
            {!model.availableBonuses.length && (
                <p role="status">Brak pasujących bonusów do dodania.</p>
            )}
        </dialog>
    );
}
