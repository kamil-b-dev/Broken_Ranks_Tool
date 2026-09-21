export const DEFAULT_OPTIMIZER_SETTINGS = {
    mode: "BUILD_FROM_SCRATCH",
    configurationMode: "SIMPLE",
    simpleProfile: "PHYSICAL_MELEE",
    simpleAspects: {
        DAMAGE: "IMPORTANT",
        ACCURACY: "IMPORTANT",
        SURVIVABILITY: "NORMAL",
    },
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
