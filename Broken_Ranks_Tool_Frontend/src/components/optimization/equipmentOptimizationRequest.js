/** Maps optimizer UI configuration and equipment locks to the backend request contract. */
export const createEquipmentOptimizationRequest = ({
    slots,
    configuration,
    lockedSlots,
    lockedDrifs,
}) => ({
    originalSlots: slots,
    priorities: configuration.priorities || {},
    targetQuantities: configuration.targetQuantities || {},
    forceCapBonuses: configuration.forceCapBonuses || [],
    forcedPercentageTargets: configuration.forcedPercentageTargets || {},
    maximizeBonuses: configuration.maximizeBonuses || [],
    forceMaximizationByDrifBonus: Boolean(configuration.forceMaximizationByDrifBonus),
    generateVariants: Boolean(configuration.generateVariants),
    maxVariantLossPercent: Number(configuration.maxVariantLossPercent),
    lockedSlots,
    lockedDrifs,
});
