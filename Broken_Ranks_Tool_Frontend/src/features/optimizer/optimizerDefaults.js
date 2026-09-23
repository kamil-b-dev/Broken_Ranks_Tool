import { defaultSimpleOptions } from "./simple-profile/simpleProfileDefinitions";

export const DEFAULT_OPTIMIZER_SETTINGS = {
    mode: "BUILD_FROM_SCRATCH",
    configurationMode: "SIMPLE",
    simpleProfile: "BARBARIAN",
    simpleOptions: defaultSimpleOptions("BARBARIAN"),
    simpleAspects: {},
    forceMaximizationByDrifBonus: false,
    generateVariants: false,
    maxVariantLossPercent: 5,
    advisorProfession: "AUTO",
    advisorGoal: "",
    advisorProtectedModifiers: {},
    advisorAllowedChanges: {
        stars: true,
        items: false,
        drifs: false,
        drifUpgrades: false,
    },
    advisorSearch: {
        strategy: "MINIMUM_CHANGE",
        targetMode: "MAXIMIZE",
        target: "",
        maxActions: 3,
        timeBudgetMs: 1500,
    },
};
