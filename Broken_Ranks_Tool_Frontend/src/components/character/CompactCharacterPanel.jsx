import { STAT_CONFIG } from "../../constants/character";

const CompactCharacterPanel = ({ development }) => (
    <section className="character-summary" aria-label="Rozwój bohatera">
        <div className="character-level-control">
            <span>Poziom</span>
            <input
                type="number"
                min="1"
                max="140"
                value={development.level}
                onChange={(event) => development.changeLevel(event.target.value)}
                aria-label="Poziom postaci"
            />
        </div>
        <div className="character-stat-strip custom-scrollbar">
            {Object.keys(STAT_CONFIG).map((name) => (
                <div className="character-stat-control" key={name}>
                    <span className="character-stat-icon" aria-hidden="true" />
                    <div>
                        <span>{name}</span>
                        <strong>{development.finalStats[name]}</strong>
                    </div>
                    <div className="character-stat-actions">
                        <button
                            type="button"
                            onClick={() => development.changePoints(name, -10)}
                            disabled={development.spentPoints[name] < 10}
                            aria-label={`Odejmij 10 punktów: ${name}`}
                        >
                            −10
                        </button>
                        <button
                            type="button"
                            onClick={() => development.changePoints(name, -1)}
                            disabled={development.spentPoints[name] <= 0}
                            aria-label={`Odejmij punkt: ${name}`}
                        >
                            −
                        </button>
                        <button
                            type="button"
                            onClick={() => development.changePoints(name, 1)}
                            disabled={development.pointsLeft <= 0}
                            aria-label={`Dodaj punkt: ${name}`}
                        >
                            +
                        </button>
                        <button
                            type="button"
                            onClick={() => development.changePoints(name, 10)}
                            disabled={development.pointsLeft < 10}
                            aria-label={`Dodaj 10 punktów: ${name}`}
                        >
                            +10
                        </button>
                    </div>
                </div>
            ))}
        </div>
        <div className="character-points-summary">
            <span>Pozostało</span>
            <strong>{development.pointsLeft}</strong>
            <small>z {development.totalPoints} pkt</small>
        </div>
    </section>
);

export default CompactCharacterPanel;
