import {
    createBonusOption,
    OPTIMIZER_CONFIG_FORMAT,
    OPTIMIZER_CONFIG_VERSION,
    sortBonusesByCategory,
} from "./optimizerDomain";
import { DEFAULT_ADVISOR_CHANGES, DEFAULT_ADVISOR_SEARCH } from "./advisorConfiguration";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

/** Creates the stable, versioned optimizer configuration saved by the browser. */
export const createOptimizerConfigPayload = (priorities, settings, exportedAt = new Date()) => ({
    format: OPTIMIZER_CONFIG_FORMAT,
    version: OPTIMIZER_CONFIG_VERSION,
    exportedAt: exportedAt.toISOString(),
    settings: {
        mode: settings?.mode || "BUILD_FROM_SCRATCH",
        advisorProfession: settings?.advisorProfession || "AUTO",
        advisorGoal: settings?.advisorGoal || "",
        advisorProtectedModifiers: settings?.advisorProtectedModifiers || {},
        advisorAllowedChanges: { ...DEFAULT_ADVISOR_CHANGES, ...settings?.advisorAllowedChanges },
        advisorSearch: { ...DEFAULT_ADVISOR_SEARCH, ...settings?.advisorSearch },
        maxVariantLossPercent: clamp(Number(settings?.maxVariantLossPercent) || 0, 0, 100),
    },
    priorities: priorities.map(
        ({ key, weight, min, max, forceCap, forcePercentage, forcedPercentage, maximize }) => ({
            key,
            weight: Number(weight),
            min: Number(min),
            max: Number(max),
            forceCap: Boolean(forceCap),
            forcePercentage: Boolean(forcePercentage),
            forcedPercentage: forcePercentage ? Number(forcedPercentage) : null,
            maximize: Boolean(maximize),
        })
    ),
});

/** Validates and normalizes an imported optimizer configuration against current game rules. */
export const parseOptimizerConfigPayload = (payload, gameRules = {}) => {
    if (
        payload?.format !== OPTIMIZER_CONFIG_FORMAT ||
        payload?.version !== OPTIMIZER_CONFIG_VERSION ||
        !Array.isArray(payload.priorities)
    ) {
        throw new Error("Nieobsługiwany format lub wersja pliku konfiguracji.");
    }

    const knownBonuses = new Map(
        Object.entries(gameRules.bonusTranslations || {})
            .filter(([key]) => gameRules.drifBasePowers?.[key] !== undefined)
            .map((entry) => {
                const bonus = createBonusOption(entry, gameRules.drifBonusCategories);
                return [bonus.key, bonus];
            })
    );
    const usedKeys = new Set();
    const priorities = payload.priorities.flatMap((entry) => {
        if (!entry || typeof entry.key !== "string" || usedKeys.has(entry.key)) return [];
        const bonus = knownBonuses.get(entry.key);
        if (!bonus) return [];
        usedKeys.add(entry.key);

        const parsedWeight = Number(entry.weight);
        const parsedMin = Number(entry.min);
        const parsedMax = Number(entry.max);
        const min = clamp(Number.isFinite(parsedMin) ? Math.trunc(parsedMin) : 0, 0, 12);
        const max = clamp(Number.isFinite(parsedMax) ? Math.trunc(parsedMax) : 12, min, 12);
        const parsedForcedPercentage = Number(entry.forcedPercentage);
        const forcePercentage =
            !entry.forceCap &&
            Boolean(entry.forcePercentage) &&
            Number.isFinite(parsedForcedPercentage) &&
            parsedForcedPercentage >= 0;

        return [
            {
                ...bonus,
                weight: clamp(Number.isFinite(parsedWeight) ? Math.trunc(parsedWeight) : 15, 1, 30),
                min,
                max,
                forceCap: Boolean(entry.forceCap),
                forcePercentage,
                forcedPercentage: forcePercentage ? parsedForcedPercentage : "",
                maximize: !forcePercentage && Boolean(entry.maximize ?? entry.critical),
            },
        ];
    });

    if (priorities.length === 0 && payload.priorities.length > 0) {
        throw new Error("Plik nie zawiera bonusów dostępnych w aktualnej wersji danych gry.");
    }

    const importedMaxLoss = Number(payload.settings?.maxVariantLossPercent);
    const knownModes = new Set(["BUILD_FROM_SCRATCH", "ADVISOR"]);
    return {
        priorities,
        availableBonuses: sortBonusesByCategory(
            [...knownBonuses.entries()]
                .filter(([key]) => !usedKeys.has(key))
                .map(([, bonus]) => bonus)
        ),
        maxVariantLossPercent: Number.isFinite(importedMaxLoss)
            ? clamp(Math.trunc(importedMaxLoss), 0, 100)
            : null,
        mode: knownModes.has(payload.settings?.mode) ? payload.settings.mode : null,
        advisorProfession: ["AUTO", "MAGICAL", "PHYSICAL"].includes(
            payload.settings?.advisorProfession
        )
            ? payload.settings.advisorProfession
            : "AUTO",
        advisorGoal:
            typeof payload.settings?.advisorGoal === "string" ? payload.settings.advisorGoal : null,
        advisorSearch: payload.settings?.advisorSearch
            ? {
                  targetMode: ["MAXIMIZE", "VALUE", "GAIN"].includes(
                      payload.settings.advisorSearch.targetMode
                  )
                      ? payload.settings.advisorSearch.targetMode
                      : "MAXIMIZE",
                  target:
                      Number.isFinite(Number(payload.settings.advisorSearch.target)) &&
                      Number(payload.settings.advisorSearch.target) >= 0
                          ? payload.settings.advisorSearch.target
                          : "",
                  maxActions: clamp(
                      Math.trunc(Number(payload.settings.advisorSearch.maxActions)) || 3,
                      1,
                      3
                  ),
                  timeBudgetMs: payload.settings.advisorSearch.timeBudgetMs === 5000 ? 5000 : 1500,
              }
            : null,
        advisorProtectedModifiers:
            payload.settings?.advisorProtectedModifiers &&
            typeof payload.settings.advisorProtectedModifiers === "object"
                ? payload.settings.advisorProtectedModifiers
                : null,
        advisorAllowedChanges:
            payload.settings?.advisorAllowedChanges &&
            typeof payload.settings.advisorAllowedChanges === "object"
                ? {
                      stars: payload.settings.advisorAllowedChanges.stars !== false,
                      items: payload.settings.advisorAllowedChanges.items !== false,
                      orbs: payload.settings.advisorAllowedChanges.orbs !== false,
                      drifs: payload.settings.advisorAllowedChanges.drifs === true,
                      drifUpgrades: payload.settings.advisorAllowedChanges.drifUpgrades === true,
                  }
                : null,
    };
};

export const findInvalidPercentageTarget = (priorities) =>
    priorities.find(
        (bonus) =>
            bonus.forcePercentage &&
            (bonus.forcedPercentage === "" ||
                !Number.isFinite(Number(bonus.forcedPercentage)) ||
                Number(bonus.forcedPercentage) < 0)
    );

/** Converts editable priority values into the backend optimization contract. */
export const buildOptimizationConfig = (priorities, settings = {}) => {
    const config = {
        mode: settings.mode || "BUILD_FROM_SCRATCH",
        priorities: {},
        targetQuantities: {},
        forceCapBonuses: [],
        forcedPercentageTargets: {},
        maximizeBonuses: [],
        forceMaximizationByDrifBonus: Boolean(settings.forceMaximizationByDrifBonus),
        generateVariants: Boolean(settings.generateVariants),
        maxVariantLossPercent: clamp(Number(settings.maxVariantLossPercent) || 0, 0, 100),
    };

    priorities.forEach((bonus) => {
        config.priorities[bonus.key] = Number.parseInt(bonus.weight, 10);
        const parsedMin = Number.parseInt(bonus.min, 10);
        const parsedMax = Number.parseInt(bonus.max, 10);
        const min = clamp(Number.isNaN(parsedMin) ? 0 : parsedMin, 0, 12);
        const max = clamp(Number.isNaN(parsedMax) ? 12 : parsedMax, min, 12);
        config.targetQuantities[bonus.key] = { min, max };

        if (bonus.forceCap) config.forceCapBonuses.push(bonus.key);
        const forcedPercentage = Number(bonus.forcedPercentage);
        if (bonus.forcePercentage && Number.isFinite(forcedPercentage) && forcedPercentage >= 0) {
            config.forcedPercentageTargets[bonus.key] = forcedPercentage;
        }
        if (bonus.maximize && !bonus.forcePercentage) config.maximizeBonuses.push(bonus.key);
    });

    return config;
};
