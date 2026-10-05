import { useEffect, useMemo, useReducer, useState } from "react";
import {
    createGearSlotUpdate,
    createImportedGearSlotState,
    getBuiltInDrifBonusTypes,
} from "./gearSlotDomain";

const editableFields = [
    "selectedItem",
    "itemStars",
    "orbSlots",
    "selectedDrifs",
    "drifTypes",
    "drifLevels",
    "builtInLvls",
];

const draftReducer = (state, action) => {
    if (action.type === "import") return action.snapshot;
    const previous = state.values[action.field];
    const next = typeof action.value === "function" ? action.value(previous) : action.value;
    if (Object.is(previous, next)) return state;
    return { ...state, values: { ...state.values, [action.field]: next } };
};

/** Local editor draft. Only an explicit import revision or catalog change replaces it. */
export const useGearSlotState = ({
    slotKey,
    items,
    orbs,
    drifs,
    allSlots,
    epicBuiltInDrifs,
    optimizationTrigger,
}) => {
    const source = { slotKey, items, orbs, drifs, epicBuiltInDrifs, optimizationTrigger };
    const importSnapshot = () => {
        const slot = allSlots?.[slotKey];
        const item = items.find((candidate) => String(candidate.id) === String(slot?.itemId));
        return {
            source,
            values: createImportedGearSlotState(
                slot,
                orbs,
                drifs,
                getBuiltInDrifBonusTypes(item, epicBuiltInDrifs).length
            ),
        };
    };
    const [draft, dispatch] = useReducer(draftReducer, undefined, importSnapshot);
    const [hoverStars, setHoverStars] = useState(0);
    const setters = useMemo(
        () =>
            Object.fromEntries(
                editableFields.map((field) => [
                    "set" + field[0].toUpperCase() + field.slice(1),
                    (value) => dispatch({ type: "edit", field, value }),
                ])
            ),
        [dispatch]
    );

    // Ordinary provider acknowledgements do not overwrite pending local edits.
    // React rerenders this component before committing children or publisher effects,
    // so an import can never publish the previous draft back to the provider.
    if (Object.entries(source).some(([key, value]) => !Object.is(draft.source[key], value))) {
        dispatch({ type: "import", snapshot: importSnapshot() });
    }

    return { ...draft.values, ...setters, hoverStars, setHoverStars };
};

/** Publishes a normalized slot snapshot whenever its editable state changes. */
export const useGearSlotPublisher = ({
    slotKey,
    onUpdate,
    selectedItem,
    itemStars,
    orbSlots,
    isLegendary,
    selectedDrifs,
    drifLevels,
    maxDrifs,
    builtInDrifs,
    builtInLvls,
}) => {
    useEffect(() => {
        onUpdate(
            slotKey,
            createGearSlotUpdate({
                selectedItem,
                itemStars,
                orbSlots,
                isLegendary,
                selectedDrifs,
                drifLevels,
                maxDrifs,
                builtInDrifs,
                builtInLvls,
            })
        );
    }, [
        selectedItem,
        itemStars,
        orbSlots,
        isLegendary,
        selectedDrifs,
        drifLevels,
        maxDrifs,
        builtInLvls,
        builtInDrifs,
        slotKey,
        onUpdate,
    ]);
};
