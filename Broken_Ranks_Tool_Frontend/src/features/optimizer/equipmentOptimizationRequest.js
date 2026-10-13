/** Maps optimizer UI configuration and equipment locks to the backend request contract. */
export const createEquipmentOptimizationRequest = ({
    slots,
    characterStats,
    configuration,
    lockedSlots,
    lockedDrifs,
    backpack = [],
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
              simpleOptions: configuration.simpleOptions || {},
              simpleAspects: configuration.simpleAspects || {},
          }
        : {}),
    lockedSlots,
    lockedDrifs,
    ...((configuration.mode || "BUILD_FROM_SCRATCH") === "BUILD_FROM_SCRATCH" &&
    (configuration.configurationMode || "ADVANCED") === "ADVANCED" &&
    configuration.backpackOnly
        ? {
              backpackOnly: true,
              generateVariants: false,
              backpackDrifs: normalizeBackpack(backpack)
                  .filter((entry) => entry.kind === "DRIF" && entry.sendToBackend === true)
                  .map(({ id, templateId, level }) => ({
                      id,
                      templateId: Number(templateId),
                      level,
                  })),
          }
        : {}),
    ...(configuration.mode === "ADVISOR"
        ? {
              advisor: configuration.advisor,
          }
        : {}),
});
import { normalizeBackpack } from "../builder/backpack/backpackSerialization.js";
