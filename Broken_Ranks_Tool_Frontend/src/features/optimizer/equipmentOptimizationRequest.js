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
    configurationMode:
        configuration.mode === "REORGANIZE"
            ? "ADVANCED"
            : configuration.configurationMode || "ADVANCED",
    originalSlots: slots,
    characterStats: characterStats || {},
    priorities: configuration.priorities || {},
    targetQuantities: configuration.targetQuantities || {},
    drifSizeQuantities: configuration.drifSizeQuantities || {},
    forceCapBonuses: configuration.forceCapBonuses || [],
    forcedPercentageTargets: configuration.forcedPercentageTargets || {},
    maximizeBonuses: configuration.maximizeBonuses || [],
    forceMaximizationByDrifBonus:
        configuration.mode !== "REORGANIZE" && Boolean(configuration.forceMaximizationByDrifBonus),
    generateVariants:
        configuration.mode !== "REORGANIZE" && Boolean(configuration.generateVariants),
    maxVariantLossPercent: Number(configuration.maxVariantLossPercent),
    ...(configuration.mode !== "REORGANIZE" && configuration.configurationMode === "SIMPLE"
        ? {
              simpleProfile: configuration.simpleProfile,
              simpleOptions: configuration.simpleOptions || {},
              simpleAspects: configuration.simpleAspects || {},
          }
        : {}),
    lockedSlots,
    lockedDrifs,
    ...(configuration.mode === "REORGANIZE" ||
    ((configuration.mode || "BUILD_FROM_SCRATCH") === "BUILD_FROM_SCRATCH" &&
        (configuration.configurationMode || "ADVANCED") === "ADVANCED" &&
        configuration.backpackOnly)
        ? {
              ...(configuration.mode === "REORGANIZE"
                  ? { backpackSlotCount: normalizeBackpack(backpack).length }
                  : { backpackOnly: true }),
              generateVariants: false,
              backpackDrifs: normalizeBackpack(backpack)
                  .filter((entry) => entry.kind === "DRIF" && entry.sendToBackend === true)
                  .map(({ id, templateId, level }) => {
                      const numericId = Number(templateId);
                      if (!Number.isSafeInteger(numericId) || numericId < 1)
                          throw new Error(
                              "Drif plecaka ma ID, którego nie można bezpiecznie przesłać do API."
                          );
                      return { id, templateId: numericId, level };
                  }),
          }
        : {}),
    ...(configuration.mode === "ADVISOR"
        ? {
              advisor: configuration.advisor,
          }
        : {}),
});
import { normalizeBackpack } from "../builder/backpack/backpackSerialization.js";
