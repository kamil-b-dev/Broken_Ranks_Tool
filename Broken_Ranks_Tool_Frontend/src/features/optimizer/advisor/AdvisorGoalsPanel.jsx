import {
    advisorModifiers,
    selectedAdvisorGoal,
    DEFAULT_ADVISOR_CHANGES,
    DEFAULT_ADVISOR_SEARCH,
} from "./advisorConfiguration";

/** Configures advisor goals relative to the statistics of the current build. */
const AdvisorGoalsPanel = ({ stats = {}, gameRules = {}, settings, onChange }) => {
    const modifiers = advisorModifiers(stats, gameRules);
    const goal = selectedAdvisorGoal(modifiers, settings.advisorGoal);
    const search = { ...DEFAULT_ADVISOR_SEARCH, ...settings.advisorSearch };
    const protectedModifiers = settings.advisorProtectedModifiers || {};
    const update = (change) => onChange({ ...settings, ...change });

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
                <p>
                    Przy zadanym celu preferowane są plany wymagające mniej ulepszeń. Dla redukcji
                    podaj dodatnią wielkość efektu, np. 30 dla −30% zużycia many.
                </p>
            </section>

            <section className="advisor-goal-card">
                <div className="advisor-goal-card-heading">
                    <strong>Chronione modyfikatory</strong>
                    <span>minimum względem obecnej wartości</span>
                </div>
                <div className="advisor-modifier-list">
                    {modifiers
                        .filter(({ key, value }) => key !== goal && value !== 0)
                        .map((modifier) => {
                            const rule = protectedModifiers[modifier.key] || {
                                enabled: true,
                                loss: 0,
                            };
                            return (
                                <div className="advisor-modifier-row" key={modifier.key}>
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
                        })}
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
                <p>
                    Przełożenia zachowują rozmiary i poziomy posiadanych drifów. Zakupy i ulepszenia
                    są osobnymi działaniami; istniejące kamienie nie są usuwane.
                </p>
            </section>
            <section className="advisor-goal-card">
                <label htmlFor="advisor-actions">Maksymalna liczba działań w planie</label>
                <select
                    id="advisor-actions"
                    value={search.maxActions}
                    onChange={(event) =>
                        update({
                            advisorSearch: { ...search, maxActions: Number(event.target.value) },
                        })
                    }
                >
                    <option value="1">1 działanie</option>
                    <option value="2">2 działania</option>
                    <option value="3">3 działania</option>
                </select>
                <label htmlFor="advisor-speed">Dokładność analizy</label>
                <select
                    id="advisor-speed"
                    value={search.timeBudgetMs}
                    onChange={(event) =>
                        update({
                            advisorSearch: { ...search, timeBudgetMs: Number(event.target.value) },
                        })
                    }
                >
                    <option value="1500">Szybka — budżet 1,5 s</option>
                    <option value="5000">Rozszerzona — budżet 5 s</option>
                </select>
                <p>
                    Jedno działanie to przełożenie, zamiana dwóch drifów albo ulepszenie lub zakup.
                    Limit czasu dotyczy wyszukiwania; wynik przechodzi jeszcze weryfikację.
                </p>
            </section>
        </div>
    );
};

export default AdvisorGoalsPanel;
