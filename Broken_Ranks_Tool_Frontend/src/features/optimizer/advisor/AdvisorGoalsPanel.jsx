import {
    ADVISOR_TIME_BUDGETS,
    advisorModifiers,
    selectedAdvisorGoal,
    DEFAULT_ADVISOR_CHANGES,
    DEFAULT_ADVISOR_SEARCH,
} from "./advisorConfiguration";
import {
    DRIF_CATEGORY_LABELS,
    DRIF_CATEGORY_ORDER,
} from "../../../shared/domain/equipment/drifCategories";
import CategoryIcon from "../../../shared/ui/CategoryIcon";

const ProtectedModifierRow = ({ modifier, rule, protectedModifiers, update }) => (
    <div className="advisor-modifier-row">
        <label>
            <input
                type="checkbox"
                checked={rule.enabled !== false}
                onChange={(event) =>
                    update({
                        advisorProtectedModifiers: {
                            ...protectedModifiers,
                            [modifier.key]: {
                                ...rule,
                                enabled: event.target.checked,
                            },
                        },
                    })
                }
            />
            <span>{modifier.label}</span>
            <b>{modifier.value}%</b>
        </label>
        <label className="advisor-loss-control">
            dopuszczalny spadek
            <input
                type="number"
                min="0"
                max={Math.abs(modifier.value)}
                step="0.1"
                disabled={rule.enabled === false}
                value={rule.loss ?? 0}
                onChange={(event) =>
                    update({
                        advisorProtectedModifiers: {
                            ...protectedModifiers,
                            [modifier.key]: {
                                ...rule,
                                loss: event.target.value,
                            },
                        },
                    })
                }
                aria-label={`Dopuszczalny spadek: ${modifier.label}`}
            />
            p.p.
        </label>
    </div>
);

/** Configures advisor goals relative to the statistics of the current build. */
const AdvisorGoalsPanel = ({ stats = {}, gameRules = {}, settings, onChange }) => {
    const modifiers = advisorModifiers(stats, gameRules);
    const goal = selectedAdvisorGoal(modifiers, settings.advisorGoal);
    const search = { ...DEFAULT_ADVISOR_SEARCH, ...settings.advisorSearch };
    const protectedModifiers = settings.advisorProtectedModifiers || {};
    const update = (change) => onChange({ ...settings, ...change });
    const protectedGroups = DRIF_CATEGORY_ORDER.map((category) => ({
        category,
        modifiers: modifiers.filter(
            ({ key, value, category: modifierCategory }) =>
                key !== goal && value !== 0 && modifierCategory === category
        ),
    })).filter(({ modifiers: groupedModifiers }) => groupedModifiers.length > 0);

    return (
        <div className="advisor-goals-panel custom-scrollbar">
            <section className="advisor-goal-card">
                <label htmlFor="advisor-main-goal">Główny cel</label>
                <select
                    id="advisor-main-goal"
                    value={goal}
                    onChange={(event) => update({ advisorGoal: event.target.value })}
                >
                    {modifiers.map((modifier) => (
                        <option key={modifier.key} value={modifier.key}>
                            Popraw: {modifier.label} (obecnie {modifier.value}%)
                        </option>
                    ))}
                </select>
                <label htmlFor="advisor-target-mode">Oczekiwany efekt</label>
                <select
                    id="advisor-target-mode"
                    value={search.targetMode}
                    onChange={(event) =>
                        update({ advisorSearch: { ...search, targetMode: event.target.value } })
                    }
                >
                    <option value="MAXIMIZE">Największa poprawa</option>
                    <option value="VALUE">Osiągnij wartość</option>
                    <option value="GAIN">Zyskaj określoną liczbę p.p.</option>
                </select>
                {search.targetMode !== "MAXIMIZE" && (
                    <label className="advisor-loss-control">
                        {search.targetMode === "VALUE" ? "Wartość celu (%)" : "Przyrost (p.p.)"}
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={search.target}
                            onChange={(event) =>
                                update({ advisorSearch: { ...search, target: event.target.value } })
                            }
                        />
                    </label>
                )}
            </section>

            <section className="advisor-goal-card">
                <label htmlFor="advisor-strategy">Strategia planu</label>
                <select
                    id="advisor-strategy"
                    value={search.strategy}
                    onChange={(event) =>
                        update({ advisorSearch: { ...search, strategy: event.target.value } })
                    }
                >
                    <option value="MINIMUM_CHANGE">Najmniejsza ingerencja</option>
                    <option value="BEST_RESULT">Najlepszy wynik</option>
                </select>
            </section>

            <section className="advisor-goal-card">
                <div className="advisor-goal-card-heading">
                    <strong>Chronione modyfikatory</strong>
                </div>
                <div className="advisor-modifier-list">
                    {protectedGroups.map(({ category, modifiers: groupedModifiers }) => (
                        <section
                            className="advisor-modifier-group"
                            data-category={category.toLowerCase()}
                            key={category}
                        >
                            <h5>
                                <CategoryIcon kind="drif" category={category} />
                                {DRIF_CATEGORY_LABELS[category]}
                            </h5>
                            {groupedModifiers.map((modifier) => (
                                <ProtectedModifierRow
                                    key={modifier.key}
                                    modifier={modifier}
                                    rule={
                                        protectedModifiers[modifier.key] || {
                                            enabled: true,
                                            loss: 0,
                                        }
                                    }
                                    protectedModifiers={protectedModifiers}
                                    update={update}
                                />
                            ))}
                        </section>
                    ))}
                </div>
            </section>

            <section className="advisor-goal-card">
                <strong>Dozwolone ulepszenia</strong>
                <div className="advisor-change-options">
                    {[
                        ["stars", "Gwiazdki"],
                        ["drifUpgrades", "Ulepszanie drifów"],
                        ["drifs", "Zakupy drifów"],
                        ["items", "Zakupy przedmiotów"],
                    ].map(([key, label]) => (
                        <label key={key}>
                            <input
                                type="checkbox"
                                checked={
                                    settings.advisorAllowedChanges?.[key] ??
                                    DEFAULT_ADVISOR_CHANGES[key]
                                }
                                onChange={(event) =>
                                    update({
                                        advisorAllowedChanges: {
                                            ...DEFAULT_ADVISOR_CHANGES,
                                            ...settings.advisorAllowedChanges,
                                            [key]: event.target.checked,
                                        },
                                    })
                                }
                            />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
            </section>
            <section className="advisor-goal-card advisor-search-limits">
                <label className="advisor-search-field" htmlFor="advisor-actions">
                    <span>Maksymalna liczba działań w planie</span>
                    <select
                        id="advisor-actions"
                        value={search.maxActions}
                        onChange={(event) =>
                            update({
                                advisorSearch: {
                                    ...search,
                                    maxActions: Number(event.target.value),
                                },
                            })
                        }
                    >
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                            <option key={count} value={count}>
                                {count} {count === 1 ? "działanie" : "działań"}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="advisor-search-field" htmlFor="advisor-speed">
                    <span>Budżet czasu analizy</span>
                    <select
                        id="advisor-speed"
                        value={search.timeBudgetMs}
                        onChange={(event) =>
                            update({
                                advisorSearch: {
                                    ...search,
                                    timeBudgetMs: Number(event.target.value),
                                },
                            })
                        }
                    >
                        {ADVISOR_TIME_BUDGETS.map((budget) => (
                            <option key={budget} value={budget}>
                                {budget / 1000} sekund
                            </option>
                        ))}
                    </select>
                </label>
            </section>
        </div>
    );
};

export default AdvisorGoalsPanel;
