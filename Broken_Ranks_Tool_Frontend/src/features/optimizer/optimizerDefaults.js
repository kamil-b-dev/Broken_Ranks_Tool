export const DEFAULT_OPTIMIZER_SETTINGS = {
    mode: "BUILD_FROM_SCRATCH",
    forceMaximizationByDrifBonus: false,
    generateVariants: false,
    maxVariantLossPercent: 5,
    advisorProfession: "AUTO",
    advisorGoal: "",
    advisorProtectedModifiers: {},
    advisorAllowedChanges: {
        stars: true,
        items: false,
        orbs: false,
        drifs: false,
        drifUpgrades: false,
    },
    advisorSearch: { targetMode: "MAXIMIZE", target: "", maxActions: 3, timeBudgetMs: 1500 },
};
