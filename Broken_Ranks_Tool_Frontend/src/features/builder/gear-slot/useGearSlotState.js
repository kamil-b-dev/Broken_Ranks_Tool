import { useEffect, useState } from "react";
import {
    createGearSlotUpdate,
    createImportedGearSlotState,
    getBuiltInDrifBonusTypes,
} from "./gearSlotDomain";

const createEmptyOrbSlots = () => ({
    orb1: { id: "", level: "", type: "" },
    orb2: { id: "", level: "", type: "" },
});

/** Owns editable values and synchronizes optimizer or imported slot data. */
export const useGearSlotState = ({
    slotKey,
    items,
    orbs,
    drifs,
    allSlots,
    epicBuiltInDrifs,
    optimizationTrigger,
}) => {
    const [selectedItem, setSelectedItem] = useState("");
    const [itemStars, setItemStars] = useState(1);
    const [hoverStars, setHoverStars] = useState(0);
    const [orbSlots, setOrbSlots] = useState(createEmptyOrbSlots);
    const [selectedDrifs, setSelectedDrifs] = useState([]);
    const [drifTypes, setDrifTypes] = useState({});
    const [drifLevels, setDrifLevels] = useState({});
    const [builtInLvls, setBuiltInLvls] = useState([1, 1]);

    useEffect(() => {
        const externalData = allSlots[slotKey];
        if (!externalData && Object.keys(allSlots || {}).length === 0) return;
        const importedItem = items.find((item) => String(item.id) === String(externalData?.itemId));
        const builtInDrifCount = getBuiltInDrifBonusTypes(importedItem, epicBuiltInDrifs).length;
        const imported = createImportedGearSlotState(externalData, orbs, drifs, builtInDrifCount);
        setSelectedItem(imported.selectedItem);
        setItemStars(imported.itemStars);
        setOrbSlots(imported.orbSlots);
        setSelectedDrifs(imported.selectedDrifs);
        setDrifTypes(imported.drifTypes);
        setDrifLevels(imported.drifLevels);
        setBuiltInLvls(imported.builtInLvls);
        // Import synchronization is intentionally driven by the external trigger and catalogs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [optimizationTrigger, drifs, orbs, items, epicBuiltInDrifs]);

    return {
        selectedItem,
        setSelectedItem,
        itemStars,
        setItemStars,
        hoverStars,
        setHoverStars,
        orbSlots,
        setOrbSlots,
        selectedDrifs,
        setSelectedDrifs,
        drifTypes,
        setDrifTypes,
        drifLevels,
        setDrifLevels,
        builtInLvls,
        setBuiltInLvls,
    };
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
