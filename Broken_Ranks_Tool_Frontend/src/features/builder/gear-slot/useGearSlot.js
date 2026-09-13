import { useGearSlotDerivedState } from "./useGearSlotDerivedState";
import { useGearSlotDragDrop } from "./useGearSlotDragDrop";
import { useGearSlotPublisher, useGearSlotState } from "./useGearSlotState";

/**
 * Composes editable state, derived equipment rules, publishing, and drag-and-drop for one slot.
 *
 * @param {object} props Hook configuration.
 * @param {string} props.slotKey Equipment slot identifier.
 * @param {Array<object>} props.items Items available for the slot.
 * @param {Array<object>} props.orbs Available orb templates.
 * @param {Array<object>} props.drifs Available drif templates.
 * @param {object} props.allSlots Current state of all equipment slots.
 * @param {object} props.gameRules Game rules used for slot and elemental restrictions.
 * @param {function} props.onUpdate Callback for publishing slot changes.
 * @param {*} props.optimizationTrigger Value used to synchronize optimizer results.
 * @returns {object} Slot state, derived values, and event handlers for GearSlot.
 */
export const useGearSlot = ({
    slotKey,
    items,
    orbs,
    drifs,
    allSlots,
    gameRules,
    onUpdate,
    optimizationTrigger,
}) => {
    const slotState = useGearSlotState({
        slotKey,
        items,
        orbs,
        drifs,
        allSlots,
        epicBuiltInDrifs: gameRules?.epicBuiltInDrifs,
        optimizationTrigger,
    });
    const derivedState = useGearSlotDerivedState({
        slotKey,
        items,
        orbs,
        drifs,
        allSlots,
        gameRules,
        selectedItem: slotState.selectedItem,
        itemStars: slotState.itemStars,
        orbSlots: slotState.orbSlots,
        selectedDrifs: slotState.selectedDrifs,
        drifLevels: slotState.drifLevels,
    });

    useGearSlotPublisher({
        slotKey,
        onUpdate,
        selectedItem: slotState.selectedItem,
        itemStars: slotState.itemStars,
        orbSlots: slotState.orbSlots,
        isLegendary: derivedState.isLegendary,
        selectedDrifs: slotState.selectedDrifs,
        drifLevels: slotState.drifLevels,
        maxDrifs: derivedState.maxDrifs,
        builtInDrifs: derivedState.builtInDrifs,
        builtInLvls: slotState.builtInLvls,
    });

    const dragState = useGearSlotDragDrop({
        selectedItem: slotState.selectedItem,
        slotKey,
        availableOrbs1: derivedState.availableOrbs1,
        availableOrbs2: derivedState.availableOrbs2,
        maxDrifs: derivedState.maxDrifs,
        maxDrifIndex: derivedState.maxDrifIndex,
        elementalTypes: derivedState.elementalTypes,
        hasGlobalElemental: derivedState.hasGlobalElemental,
        setSelectedItem: slotState.setSelectedItem,
        setBuiltInLvls: slotState.setBuiltInLvls,
        setOrbSlots: slotState.setOrbSlots,
        setSelectedDrifs: slotState.setSelectedDrifs,
        setDrifTypes: slotState.setDrifTypes,
        setDrifLevels: slotState.setDrifLevels,
    });

    return { ...slotState, ...derivedState, ...dragState };
};
