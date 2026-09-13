/** Maps optimizer UI configuration and equipment locks to the backend request contract. */
export const createEquipmentOptimizationRequest = ({
    slots,
    configuration,
    lockedSlots,
    lockedDrifs,
}) => ({
    mode: configuration.mode || "BUILD_FROM_SCRATCH",
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
    ...(configuration.mode === "ADVISOR"
        ? {
              advisor: configuration.advisor,
              characterStats: configuration.characterStats || {},
          }
        : {}),
});
