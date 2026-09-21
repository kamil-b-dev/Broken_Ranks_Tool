import {
    createBonusOption,
    OPTIMIZER_CONFIG_FORMAT,
    OPTIMIZER_CONFIG_VERSION,
    sortBonusesByCategory,
} from "./optimizerDomain";
import {
    DEFAULT_ADVISOR_CHANGES,
    DEFAULT_ADVISOR_SEARCH,
    normalizeAdvisorTimeBudget,
} from "./advisor/advisorConfiguration";
import {
    DEFAULT_SIMPLE_ASPECTS,
    SIMPLE_ASPECTS,
    SIMPLE_IMPORTANCE,
    SIMPLE_PROFILES,
} from "./simple-profile/simpleProfileDefinitions";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const DRIF_SIZES = ["SUBDRIF", "BIDRIF", "MAGNIDRIF", "ARCYDRIF"];
const SIMPLE_PROFILE_VALUES = new Set(SIMPLE_PROFILES.map(({ value }) => value));
const SIMPLE_ASPECT_VALUES = new Set(SIMPLE_ASPECTS.map(({ key }) => key));
const SIMPLE_IMPORTANCE_VALUES = new Set(SIMPLE_IMPORTANCE.map(({ value }) => value));

const normalizeSimpleAspects = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { ...DEFAULT_SIMPLE_ASPECTS };
    }
    const normalized = Object.fromEntries(
        Object.entries(value).filter(
            ([aspect, importance]) =>
                SIMPLE_ASPECT_VALUES.has(aspect) && SIMPLE_IMPORTANCE_VALUES.has(importance)
        )
    );
    return Object.keys(normalized).length > 0 ? normalized : { ...DEFAULT_SIMPLE_ASPECTS };
};

const normalizeSizeRanges = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
        DRIF_SIZES.flatMap((size) => {
            const range = value[size];
            if (!range || typeof range !== "object") return [];
            const min = clamp(Math.trunc(Number(range.min)) || 0, 0, 12);
            const max = clamp(Math.trunc(Number(range.max)) || 0, min, 12);
            return [[size, { min, max }]];
        })
    );
};

const normalizeProtectedModifiers = (value, knownBonuses) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return Object.fromEntries(
        Object.entries(value).flatMap(([key, rule]) => {
            if (!knownBonuses.has(key)) return [];
            if (
                typeof rule !== "boolean" &&
                (!rule || typeof rule !== "object" || Array.isArray(rule))
            )
                return [];
            const enabled = typeof rule === "boolean" ? rule : rule.enabled !== false;
            const parsedLoss =
                typeof rule === "boolean" ? 0 : Number(String(rule.loss ?? 0).replace(",", "."));
            const loss = Number.isFinite(parsedLoss) && parsedLoss >= 0 ? parsedLoss : 0;
            return [[key, { enabled, loss }]];
        })
    );
};

/** Creates the stable, versioned optimizer configuration saved by the browser. */
export const createOptimizerConfigPayload = (priorities, settings, exportedAt = new Date()) => ({
    format: OPTIMIZER_CONFIG_FORMAT,
    version: OPTIMIZER_CONFIG_VERSION,
    exportedAt: exportedAt.toISOString(),
    settings: {
        mode: settings?.mode || "BUILD_FROM_SCRATCH",
        configurationMode: settings?.configurationMode || "SIMPLE",
        simpleProfile: SIMPLE_PROFILE_VALUES.has(settings?.simpleProfile)
            ? settings.simpleProfile
            : "PHYSICAL_MELEE",
        simpleAspects: normalizeSimpleAspects(settings?.simpleAspects),
        advisorProfession: settings?.advisorProfession || "AUTO",
        advisorGoal: settings?.advisorGoal || "",
        advisorProtectedModifiers: settings?.advisorProtectedModifiers || {},
        advisorAllowedChanges: { ...DEFAULT_ADVISOR_CHANGES, ...settings?.advisorAllowedChanges },
        advisorSearch: { ...DEFAULT_ADVISOR_SEARCH, ...settings?.advisorSearch },
        forceMaximizationByDrifBonus: Boolean(settings?.forceMaximizationByDrifBonus),
        generateVariants: Boolean(settings?.generateVariants),
        maxVariantLossPercent: clamp(Number(settings?.maxVariantLossPercent) || 0, 0, 100),
    },
    priorities: priorities.map(
        ({
            key,
            weight,
            min,
            max,
            forceCap,
            forcePercentage,
            forcedPercentage,
            maximize,
            sizeRanges,
        }) => ({
            key,
            weight: Number(weight),
            min: Number(min),
            max: Number(max),
            forceCap: Boolean(forceCap),
            forcePercentage: Boolean(forcePercentage),
            forcedPercentage: forcePercentage ? Number(forcedPercentage) : null,
            maximize: Boolean(maximize),
            sizeRanges: normalizeSizeRanges(sizeRanges),
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
                sizeRanges: normalizeSizeRanges(entry.sizeRanges),
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
        configurationMode: ["SIMPLE", "ADVANCED"].includes(payload.settings?.configurationMode)
            ? payload.settings.configurationMode
            : "ADVANCED",
        simpleProfile: SIMPLE_PROFILE_VALUES.has(payload.settings?.simpleProfile)
            ? payload.settings.simpleProfile
            : "PHYSICAL_MELEE",
        simpleAspects: normalizeSimpleAspects(payload.settings?.simpleAspects),
        advisorProfession: ["AUTO", "MAGICAL", "PHYSICAL"].includes(
            payload.settings?.advisorProfession
        )
            ? payload.settings.advisorProfession
            : "AUTO",
        advisorGoal:
            typeof payload.settings?.advisorGoal === "string" ? payload.settings.advisorGoal : null,
        forceMaximizationByDrifBonus:
            typeof payload.settings?.forceMaximizationByDrifBonus === "boolean"
                ? payload.settings.forceMaximizationByDrifBonus
                : null,
        generateVariants:
            typeof payload.settings?.generateVariants === "boolean"
                ? payload.settings.generateVariants
                : null,
        advisorSearch: payload.settings?.advisorSearch
            ? {
                  targetMode: ["MAXIMIZE", "VALUE", "GAIN"].includes(
                      payload.settings.advisorSearch.targetMode
                  )
                      ? payload.settings.advisorSearch.targetMode
                      : "MAXIMIZE",
                  strategy: ["MINIMUM_CHANGE", "BEST_RESULT"].includes(
                      payload.settings.advisorSearch.strategy
                  )
                      ? payload.settings.advisorSearch.strategy
                      : "MINIMUM_CHANGE",
                  target:
                      Number.isFinite(Number(payload.settings.advisorSearch.target)) &&
                      Number(payload.settings.advisorSearch.target) >= 0
                          ? payload.settings.advisorSearch.target
                          : "",
                  maxActions: clamp(
                      Math.trunc(Number(payload.settings.advisorSearch.maxActions)) || 3,
                      1,
                      10
                  ),
                  timeBudgetMs: normalizeAdvisorTimeBudget(
                      payload.settings.advisorSearch.timeBudgetMs
                  ),
              }
            : null,
        advisorProtectedModifiers: normalizeProtectedModifiers(
            payload.settings?.advisorProtectedModifiers,
            knownBonuses
        ),
        advisorAllowedChanges:
            payload.settings?.advisorAllowedChanges &&
            typeof payload.settings.advisorAllowedChanges === "object"
                ? {
                      stars: payload.settings.advisorAllowedChanges.stars !== false,
                      items: payload.settings.advisorAllowedChanges.items === true,
                      drifs: payload.settings.advisorAllowedChanges.drifs === true,
                      drifUpgrades: payload.settings.advisorAllowedChanges.drifUpgrades === true,
                  }
                : null,
    };
};

/** Merges a validated optimizer import or browser draft into editable settings. */
export const mergeOptimizerSettings = (previous, imported) => ({
    ...previous,
    advisorProfession: imported.advisorProfession,
    ...(imported.advisorGoal !== null ? { advisorGoal: imported.advisorGoal } : {}),
    ...(imported.advisorSearch !== null ? { advisorSearch: imported.advisorSearch } : {}),
    ...(imported.advisorProtectedModifiers !== null
        ? { advisorProtectedModifiers: imported.advisorProtectedModifiers }
        : {}),
    ...(imported.advisorAllowedChanges !== null
        ? { advisorAllowedChanges: imported.advisorAllowedChanges }
        : {}),
    ...(imported.maxVariantLossPercent !== null
        ? { maxVariantLossPercent: imported.maxVariantLossPercent }
        : {}),
    ...(imported.forceMaximizationByDrifBonus !== null
        ? { forceMaximizationByDrifBonus: imported.forceMaximizationByDrifBonus }
        : {}),
    ...(imported.generateVariants !== null ? { generateVariants: imported.generateVariants } : {}),
    ...(imported.mode !== null ? { mode: imported.mode } : {}),
    ...(imported.configurationMode ? { configurationMode: imported.configurationMode } : {}),
    ...(imported.simpleProfile ? { simpleProfile: imported.simpleProfile } : {}),
    ...(imported.simpleAspects ? { simpleAspects: imported.simpleAspects } : {}),
});

export const findInvalidPercentageTarget = (priorities) =>
    priorities.find(
        (bonus) =>
            bonus.forcePercentage &&
            (bonus.forcedPercentage === "" ||
                !Number.isFinite(Number(bonus.forcedPercentage)) ||
                Number(bonus.forcedPercentage) < 0)
    );

export const findInvalidSizeConstraint = (priorities) =>
    priorities.find((bonus) => {
        const configuredRanges = Object.values(bonus.sizeRanges || {});
        const malformed = configuredRanges.some((range) => {
            if (!range || typeof range !== "object") return true;
            const min = Number(range.min);
            const max = Number(range.max);
            return (
                range.min === "" ||
                range.max === "" ||
                !Number.isFinite(min) ||
                !Number.isFinite(max) ||
                min < 0 ||
                max > 12 ||
                min > max
            );
        });
        if (malformed) return true;
        const ranges = Object.values(normalizeSizeRanges(bonus.sizeRanges));
        if (ranges.length === 0) return false;
        const totalMin = Number(bonus.min);
        const totalMax = Number(bonus.max);
        const sizeMin = ranges.reduce((sum, range) => sum + range.min, 0);
        const unrestrictedSizes = DRIF_SIZES.length - ranges.length;
        const sizeMax = ranges.reduce((sum, range) => sum + range.max, 0) + unrestrictedSizes * 12;
        return sizeMin > totalMax || sizeMax < totalMin;
    });

/** Converts editable priority values into the backend optimization contract. */
export const buildOptimizationConfig = (priorities, settings = {}) => {
    const simple = (settings.configurationMode || "SIMPLE") === "SIMPLE";
    const config = {
        mode: settings.mode || "BUILD_FROM_SCRATCH",
        configurationMode: simple ? "SIMPLE" : "ADVANCED",
        priorities: {},
        targetQuantities: {},
        forceCapBonuses: [],
        forcedPercentageTargets: {},
        maximizeBonuses: [],
        drifSizeQuantities: {},
        forceMaximizationByDrifBonus: !simple && Boolean(settings.forceMaximizationByDrifBonus),
        generateVariants: !simple && Boolean(settings.generateVariants),
        maxVariantLossPercent: clamp(Number(settings.maxVariantLossPercent) || 0, 0, 100),
        ...(simple
            ? {
                  simpleProfile: SIMPLE_PROFILE_VALUES.has(settings.simpleProfile)
                      ? settings.simpleProfile
                      : "PHYSICAL_MELEE",
                  simpleAspects: normalizeSimpleAspects(settings.simpleAspects),
              }
            : {}),
    };

    if (simple) return config;

    priorities.forEach((bonus) => {
        config.priorities[bonus.key] = Number.parseInt(bonus.weight, 10);
        const parsedMin = Number.parseInt(bonus.min, 10);
        const parsedMax = Number.parseInt(bonus.max, 10);
        const min = clamp(Number.isNaN(parsedMin) ? 0 : parsedMin, 0, 12);
        const max = clamp(Number.isNaN(parsedMax) ? 12 : parsedMax, min, 12);
        config.targetQuantities[bonus.key] = { min, max };

        if (bonus.forceCap) config.forceCapBonuses.push(bonus.key);
        const forcedPercentage = Number(bonus.forcedPercentage);
        if (
            !simple &&
            bonus.forcePercentage &&
            Number.isFinite(forcedPercentage) &&
            forcedPercentage >= 0
        ) {
            config.forcedPercentageTargets[bonus.key] = forcedPercentage;
        }
        if (!simple && bonus.maximize && !bonus.forcePercentage)
            config.maximizeBonuses.push(bonus.key);
        if (!simple && Object.keys(bonus.sizeRanges || {}).length > 0) {
            config.drifSizeQuantities[bonus.key] = normalizeSizeRanges(bonus.sizeRanges);
        }
    });

    return config;
};
