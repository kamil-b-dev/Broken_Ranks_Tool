import { SLOTS } from "../../constants/equipment";

const countConfigured = (values) => (values || []).filter(Boolean).length;

/** Summarizes the actual build state used as optimizer input. */
const OptimizerOverviewBar = ({ slots = {}, lockedSlots = [], lockedDrifs = {} }) => {
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
                <span>Konfiguracja źródłowa</span>
                <strong>Aktualny build</strong>
            </div>
            <dl>
                <div>
                    <dt>Wyposażone sloty</dt>
                    <dd>
                        {equippedCount}/{SLOTS.length}
                    </dd>
                </div>
                <div>
                    <dt>Umieszczone drify</dt>
                    <dd>{drifCount}</dd>
                </div>
                <div>
                    <dt>Zablokowane sloty</dt>
                    <dd>{lockedSlots.length}</dd>
                </div>
                <div>
                    <dt>Zablokowane drify</dt>
                    <dd>{lockedDrifCount}</dd>
                </div>
            </dl>
        </section>
    );
};

export default OptimizerOverviewBar;
