export const DEFAULT_ADVISOR_CHANGES = {
    stars: true,
    items: false,
    drifs: false,
    drifUpgrades: false,
};
export const DEFAULT_ADVISOR_SEARCH = {
    strategy: "MINIMUM_CHANGE",
    targetMode: "MAXIMIZE",
    target: "",
    maxActions: 3,
    timeBudgetMs: 3000,
};

export const ADVISOR_TIME_BUDGETS = [3000, 6000];

export const advisorNumber = (value) =>
    Number.parseFloat(
        String(value ?? 0)
            .replace("%", "")
            .replace(",", ".")
    ) || 0;

export const normalizeAdvisorTimeBudget = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_ADVISOR_SEARCH.timeBudgetMs;
    return ADVISOR_TIME_BUDGETS.reduce((closest, candidate) =>
        Math.abs(candidate - parsed) < Math.abs(closest - parsed) ? candidate : closest
    );
};

export const advisorModifiers = (stats, gameRules) =>
    Object.entries(gameRules.bonusTranslations || {})
        .filter(([key]) => gameRules.drifBasePowers?.[key] !== undefined)
        .map(([key, label]) => ({
            key,
            label,
            value: advisorNumber(stats?.[key]),
            category: resolveDrifCategoryKey(key, gameRules.drifBonusCategories) || "UTILITY",
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "pl"));

export const selectedAdvisorGoal = (modifiers, requested) =>
    modifiers.find(({ key }) => key === requested)?.key ||
    modifiers.find(({ value }) => value !== 0)?.key ||
    modifiers[0]?.key ||
    "";

/** Sends relative protection rules; the backend derives minima from the same build it searches. */
export const buildAdvisorConfiguration = (settings, stats, gameRules, characterStats) => {
    const goal = selectedAdvisorGoal(advisorModifiers(stats, gameRules), settings.advisorGoal);
    if (!goal) throw new Error("Brak dostępnych modyfikatorów do analizy.");
    const search = { ...DEFAULT_ADVISOR_SEARCH, ...settings.advisorSearch };
    const target = Number(String(search.target).replace(",", "."));
    if (
        search.targetMode !== "MAXIMIZE" &&
        (search.target === "" || !Number.isFinite(target) || target < 0)
    ) {
        throw new Error("Podaj poprawny, nieujemny cel Doradcy.");
    }
    const protectedModifiers = Object.fromEntries(
        Object.entries(settings.advisorProtectedModifiers || {}).map(([key, rule]) => {
            if (!rule || typeof rule !== "object") {
                throw new Error("Nieprawidłowa reguła ochrony modyfikatora.");
            }
            const loss = Number(String(rule.loss ?? 0).replace(",", "."));
            if (!Number.isFinite(loss) || loss < 0)
                throw new Error("Dopuszczalny spadek musi być nieujemną liczbą.");
            return [key, { enabled: rule.enabled !== false, loss }];
        })
    );
    return {
        mode: "ADVISOR",
        priorities: { [goal]: 30 },
        characterStats,
        advisor: {
            goal,
            profession: settings.advisorProfession || "AUTO",
            allowedChanges: { ...DEFAULT_ADVISOR_CHANGES, ...settings.advisorAllowedChanges },
            protectedModifiers,
            strategy: ["MINIMUM_CHANGE", "BEST_RESULT"].includes(search.strategy)
                ? search.strategy
                : "MINIMUM_CHANGE",
            maxActions: Math.max(1, Math.min(10, Number(search.maxActions) || 3)),
            timeBudgetMs: normalizeAdvisorTimeBudget(search.timeBudgetMs),
            ...(search.targetMode === "VALUE" ? { targetValue: target } : {}),
            ...(search.targetMode === "GAIN" ? { targetGain: target } : {}),
        },
    };
};
import { resolveDrifCategoryKey } from "../../../shared/domain/equipment/drifCategories";
