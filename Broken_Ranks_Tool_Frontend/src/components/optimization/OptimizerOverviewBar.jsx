import { SLOTS } from "../../constants/equipment";

const countConfigured = (values) => (values || []).filter(Boolean).length;

/** Summarizes the actual build state used as optimizer input. */
const OptimizerOverviewBar = ({
    slots = {},
    lockedSlots = [],
    lockedDrifs = {},
    onBackToBuilder,
}) => {
    const equippedCount = SLOTS.filter((slot) => slots[slot.key]?.itemId).length;
    const drifCount = Object.values(slots).reduce(
        (total, slot) => total + countConfigured(slot?.drifIds),
        0
    );
    const lockedDrifCount = Object.values(lockedDrifs).reduce(
        (total, indexes) => total + (indexes?.length || 0),
        0
    );

    return (
        <section className="optimizer-overview" aria-label="Konfiguracja źródłowa optymalizatora">
            <div className="optimizer-overview-title">
                <span>Build źródłowy</span>
                <strong>Aktualny build</strong>
            </div>
            <dl>
                <div>
                    <dt>Ekwipunek</dt>
                    <dd>
                        {equippedCount}/{SLOTS.length}
                    </dd>
                </div>
                <div>
                    <dt>Drify</dt>
                    <dd>{drifCount}</dd>
                </div>
                <div className="optimizer-overview-locks">
                    <dt>Zablokowane</dt>
                    <dd>
                        {lockedSlots.length} <small>sloty</small>
                        <span>·</span>
                        {lockedDrifCount} <small>drifów</small>
                    </dd>
                </div>
            </dl>
            {onBackToBuilder && (
                <button type="button" className="optimizer-back-action" onClick={onBackToBuilder}>
                    <span aria-hidden="true">←</span>
                    Wróć do kreatora
                </button>
            )}
        </section>
    );
};

export default OptimizerOverviewBar;
