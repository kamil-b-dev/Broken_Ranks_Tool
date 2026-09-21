/** Maps optimizer UI configuration and equipment locks to the backend request contract. */
export const createEquipmentOptimizationRequest = ({
    slots,
    characterStats,
    configuration,
    lockedSlots,
    lockedDrifs,
}) => ({
    mode: configuration.mode || "BUILD_FROM_SCRATCH",
    configurationMode: configuration.configurationMode || "ADVANCED",
    originalSlots: slots,
    characterStats: characterStats || {},
    priorities: configuration.priorities || {},
    targetQuantities: configuration.targetQuantities || {},
    drifSizeQuantities: configuration.drifSizeQuantities || {},
    forceCapBonuses: configuration.forceCapBonuses || [],
    forcedPercentageTargets: configuration.forcedPercentageTargets || {},
    maximizeBonuses: configuration.maximizeBonuses || [],
    forceMaximizationByDrifBonus: Boolean(configuration.forceMaximizationByDrifBonus),
    generateVariants: Boolean(configuration.generateVariants),
    maxVariantLossPercent: Number(configuration.maxVariantLossPercent),
    ...(configuration.configurationMode === "SIMPLE"
        ? {
              simpleProfile: configuration.simpleProfile,
              simpleAspects: configuration.simpleAspects || {},
          }
        : {}),
    lockedSlots,
    lockedDrifs,
    ...(configuration.mode === "ADVISOR"
        ? {
              advisor: configuration.advisor,
          }
        : {}),
});
