import { useTranslation } from "../../../shared/i18n/useTranslation";
import {
    ADVISOR_TIME_BUDGETS,
    advisorModifiers,
    selectedAdvisorGoal,
    DEFAULT_ADVISOR_CHANGES,
    DEFAULT_ADVISOR_SEARCH,
    ADVISOR_PURCHASE_SCOPES,
    normalizeAdvisorPurchaseScope,
} from "./advisorConfiguration";
import {
    DRIF_CATEGORY_LABELS,
    DRIF_CATEGORY_ORDER,
} from "../../../shared/domain/equipment/drifCategories";
import CategoryIcon from "../../../shared/ui/CategoryIcon";
import { memo, useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useOptimizerLabelContext } from "../optimizerLabelContext";
import HelpHint from "../../help/HelpHint";

const DEFAULT_PROTECTION = Object.freeze({ enabled: true, loss: 0 });
const ProtectedModifierRow = memo(({ modifier, rule, onRuleChange }) => {
    const { t } = useTranslation();
    const { getName } = useOptimizerLabelContext();
    const name = getName(modifier.key, modifier.label);
    return (
        <div className="advisor-modifier-row">
            <label>
                <input
                    type="checkbox"
                    checked={rule.enabled !== false}
                    onChange={(event) =>
                        onRuleChange(modifier.key, { enabled: event.target.checked })
                    }
                />
                <span>{t(name)}</span>
                <b>{modifier.value}%</b>
            </label>
            <label className="advisor-loss-control">
                {t("dopuszczalny spadek")}
                <input
                    type="number"
                    min="0"
                    max={Math.abs(modifier.value)}
                    step="0.1"
                    disabled={rule.enabled === false}
                    value={rule.loss ?? 0}
                    onChange={(event) => onRuleChange(modifier.key, { loss: event.target.value })}
                    aria-label={t("Dopuszczalny spadek: {0}", [t(name)])}
                />
                {t("p.p.")}
            </label>
        </div>
    );
});

/** Configures advisor goals relative to the statistics of the current build. */
const AdvisorGoalsPanel = ({ stats = {}, gameRules = {}, settings, onChange, section = "all" }) => {
    const { t } = useTranslation();

    const { getName } = useOptimizerLabelContext();
    const modifiers = useMemo(() => advisorModifiers(stats, gameRules), [stats, gameRules]);
    const goal = selectedAdvisorGoal(modifiers, settings.advisorGoal);
    const search = { ...DEFAULT_ADVISOR_SEARCH, ...settings.advisorSearch };
    const protectedModifiers = settings.advisorProtectedModifiers || {};
    const currentSettings = useRef(settings);
    useLayoutEffect(() => {
        currentSettings.current = settings;
    }, [settings]);
    const update = useCallback(
        (change) => {
            const next = { ...currentSettings.current, ...change };
            onChange(next);
        },
        [onChange]
    );
    const updateRule = useCallback(
        (key, change) => {
            const rules = currentSettings.current.advisorProtectedModifiers || {};
            update({
                advisorProtectedModifiers: {
                    ...rules,
                    [key]: { ...(rules[key] || DEFAULT_PROTECTION), ...change },
                },
            });
        },
        [update]
    );
    const protectedGroups = useMemo(
        () =>
            section === "changes"
                ? []
                : DRIF_CATEGORY_ORDER.map((category) => ({
                      category,
                      modifiers: modifiers.filter(
                          ({ key, value, category: modifierCategory }) =>
                              key !== goal && value !== 0 && modifierCategory === category
                      ),
                  })).filter(({ modifiers: groupedModifiers }) => groupedModifiers.length > 0),
        [modifiers, goal, section]
    );

    return (
        <div className="advisor-goals-panel custom-scrollbar">
            {section !== "changes" && (
                <>
                    <section className="advisor-goal-card">
                        <label htmlFor="advisor-main-goal">{t("Główny cel")}</label>
                        <select
                            id="advisor-main-goal"
                            value={goal}
                            onChange={(event) => update({ advisorGoal: event.target.value })}
                        >
                            {modifiers.map((modifier) => (
                                <option key={modifier.key} value={modifier.key}>
                                    {t("Popraw: ")}
                                    {t(getName(modifier.key, modifier.label))}
                                    {t(" (obecnie")}
                                    {t(" ")}
                                    {t(modifier.value)}%)
                                </option>
                            ))}
                        </select>
                        <label htmlFor="advisor-target-mode">{t("Oczekiwany efekt")}</label>
                        <select
                            id="advisor-target-mode"
                            value={search.targetMode}
                            onChange={(event) =>
                                update({
                                    advisorSearch: {
                                        ...search,
                                        targetMode: event.target.value,
                                    },
                                })
                            }
                        >
                            <option value="MAXIMIZE">{t("Największa poprawa")}</option>
                            <option value="VALUE">{t("Osiągnij wartość")}</option>
                            <option value="GAIN">{t("Zyskaj określoną liczbę p.p.")}</option>
                        </select>
                        {search.targetMode !== "MAXIMIZE" && (
                            <>
                                <label className="advisor-loss-control">
                                    {t(
                                        search.targetMode === "VALUE"
                                            ? "Wartość celu (%)"
                                            : "Przyrost (p.p.)"
                                    )}
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={search.target}
                                        onChange={(event) =>
                                            update({
                                                advisorSearch: {
                                                    ...search,
                                                    target: event.target.value,
                                                },
                                            })
                                        }
                                    />
                                </label>
                                <label className="advisor-loss-control">
                                    <input
                                        type="checkbox"
                                        checked={search.limitBenefitToTarget === true}
                                        onChange={(event) =>
                                            update({
                                                advisorSearch: {
                                                    ...search,
                                                    limitBenefitToTarget: event.target.checked,
                                                },
                                            })
                                        }
                                    />
                                    {t("Nie premiuj wzrostu ponad zadany cel")}
                                </label>
                            </>
                        )}
                    </section>

                    <section className="advisor-goal-card">
                        <label htmlFor="advisor-strategy">{t("Strategia planu")}</label>
                        <select
                            id="advisor-strategy"
                            value={search.strategy}
                            onChange={(event) =>
                                update({
                                    advisorSearch: { ...search, strategy: event.target.value },
                                })
                            }
                        >
                            <option value="MINIMUM_CHANGE">{t("Najmniejsza ingerencja")}</option>
                            <option value="BEST_RESULT">{t("Najlepszy wynik")}</option>
                        </select>
                    </section>

                    <section className="advisor-goal-card">
                        <div className="advisor-goal-card-heading">
                            <strong>{t("Chronione modyfikatory")}</strong>
                            <HelpHint kind="protection" label="Chronione modyfikatory" />
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
                                        {t(DRIF_CATEGORY_LABELS[category])}
                                    </h5>
                                    {groupedModifiers.map((modifier) => (
                                        <ProtectedModifierRow
                                            key={modifier.key}
                                            modifier={modifier}
                                            rule={
                                                protectedModifiers[modifier.key] ||
                                                DEFAULT_PROTECTION
                                            }
                                            onRuleChange={updateRule}
                                        />
                                    ))}
                                </section>
                            ))}
                        </div>
                    </section>
                </>
            )}
            {section !== "goals" && (
                <>
                    <section className="advisor-goal-card">
                        <strong>{t("Dozwolone ulepszenia")}</strong>
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
                                    <span>{t(label)}</span>
                                </label>
                            ))}
                        </div>
                    </section>
                    {(settings.advisorAllowedChanges?.drifs ?? DEFAULT_ADVISOR_CHANGES.drifs) && (
                        <section className="advisor-goal-card">
                            <label htmlFor="advisor-purchase-scope">
                                {t("Zakres zakupów drifów")}
                            </label>
                            <select
                                id="advisor-purchase-scope"
                                value={normalizeAdvisorPurchaseScope(settings.advisorPurchaseScope)}
                                onChange={(event) =>
                                    update({ advisorPurchaseScope: event.target.value })
                                }
                            >
                                {ADVISOR_PURCHASE_SCOPES.map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {t(label)}
                                    </option>
                                ))}
                            </select>
                        </section>
                    )}
                    <section className="advisor-goal-card advisor-search-limits">
                        <label className="advisor-search-field" htmlFor="advisor-actions">
                            <span>{t("Maksymalna liczba działań w planie")}</span>
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
                                {Array.from({ length: 10 }, (_, index) => index + 1).map(
                                    (count) => (
                                        <option key={count} value={count}>
                                            {t(count)} {t(count === 1 ? "działanie" : "działań")}
                                        </option>
                                    )
                                )}
                            </select>
                        </label>
                        <label className="advisor-search-field" htmlFor="advisor-speed">
                            <span>{t("Budżet czasu analizy")}</span>
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
                                        {t(budget / 1000)}
                                        {t(" sekund")}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </section>
                </>
            )}
        </div>
    );
};

export default memo(AdvisorGoalsPanel);
