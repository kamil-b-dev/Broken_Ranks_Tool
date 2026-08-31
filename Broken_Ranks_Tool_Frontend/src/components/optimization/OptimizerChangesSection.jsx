import { SLOTS } from "../../constants/equipment";
import { numericStatValue } from "./optimizerDomain";

const getSlot = (slotKey) => SLOTS.find((slot) => slot.key === slotKey);

const formatPlacement = (modifier, level) =>
    modifier ? `${modifier}${level ? ` ${level}` : ""}` : "Puste miejsce";

/** Summarizes the most important placement and calculator changes for a selected variant. */
const OptimizerChangesSection = ({ variant, maxCaps = {}, translations = {} }) => (
    <section className="optimizer-report-section optimizer-changes-section">
        <h5>Najważniejsze zmiany</h5>
        {variant?.changes?.length > 0 ? (
            <>
                <div className="optimizer-change-list">
                    {variant.changes.slice(0, 4).map((change, index) => {
                        const slot = getSlot(change.slotKey);
                        return (
                            <div
                                key={`${change.slotKey}-${index}`}
                                className="optimizer-change-row"
                            >
                                <span
                                    className={`equipment-slot-icon equipment-slot-icon-${change.slotKey}`}
                                    aria-hidden="true"
                                />
                                <span className="optimizer-change-item">
                                    <strong>{slot?.label || change.slotKey}</strong>
                                    <small>{change.itemName}</small>
                                </span>
                                <span className="optimizer-change-placement">
                                    <span>
                                        {formatPlacement(change.fromModifier, change.fromLevel)}
                                    </span>
                                    <i aria-hidden="true">→</i>
                                    <strong>
                                        {formatPlacement(change.toModifier, change.toLevel)}
                                    </strong>
                                </span>
                            </div>
                        );
                    })}
                </div>
                {variant.statChanges?.length > 0 && (
                    <div className="optimizer-stat-change-list" aria-label="Zmiany statystyk">
                        {variant.statChanges.slice(0, 4).map((change) => {
                            const before = numericStatValue(change.finalValue);
                            const after = numericStatValue(change.variantValue);
                            const improves =
                                Number(maxCaps?.[change.statKey]) < 0
                                    ? after < before
                                    : after > before;
                            return (
                                <span
                                    key={change.statKey}
                                    className={improves ? "is-positive" : "is-negative"}
                                >
                                    {translations?.[change.statKey] || change.statKey}:{" "}
                                    <strong>
                                        {change.finalValue} → {change.variantValue}
                                    </strong>
                                </span>
                            );
                        })}
                    </div>
                )}
            </>
        ) : (
            <p className="optimizer-report-empty">
                Wybierz wariant alternatywny, aby zobaczyć różnice względem wyniku głównego.
            </p>
        )}
    </section>
);

export default OptimizerChangesSection;
