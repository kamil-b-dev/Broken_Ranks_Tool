import { useEquipmentSetup } from "../../../shared/state/EquipmentContext";
import { useCharacterDevelopment } from "../character/useCharacterDevelopment";
import { STAT_CONFIG } from "../character/characterConstants";

export default function MobileCharacterPanel() {
    const equipment = useEquipmentSetup();
    const model = useCharacterDevelopment({
        onStatsChange: equipment.handleCharacterStatsUpdate,
        externalConfig: equipment.characterConfig,
        externalStats: equipment.requestData.characterStats,
        syncTrigger: equipment.optimizationTrigger,
    });
    return (
        <section className="mobile-card" aria-label="Rozwój postaci">
            <label className="mobile-field">
                Poziom postaci
                <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={140}
                    value={model.level}
                    onChange={(event) => model.changeLevel(event.target.value)}
                />
            </label>
            <p className="mobile-points">
                Dostępne punkty{" "}
                <strong>
                    {model.pointsLeft} / {model.totalPoints}
                </strong>
            </p>
            {Object.keys(STAT_CONFIG).map((name) => (
                <div key={name} className="mobile-character-stat">
                    <span>
                        {name}
                        <strong>{model.finalStats[name]}</strong>
                        <small>{model.spentPoints[name]} pkt</small>
                    </span>
                    <button
                        type="button"
                        aria-label={`Odejmij punkt: ${name}`}
                        disabled={model.spentPoints[name] <= 0}
                        onClick={() => model.changePoints(name, -1)}
                    >
                        −
                    </button>
                    <button
                        type="button"
                        aria-label={`Dodaj punkt: ${name}`}
                        disabled={model.pointsLeft <= 0}
                        onClick={() => model.changePoints(name, 1)}
                    >
                        +
                    </button>
                </div>
            ))}
            <button type="button" className="mobile-back" onClick={model.resetPoints}>
                Zresetuj punkty
            </button>
        </section>
    );
}
