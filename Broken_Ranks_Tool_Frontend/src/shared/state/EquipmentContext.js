import { createContext, useContext } from "react";

export const EquipmentContext = createContext(null);

/** Returns the shared equipment workspace state. */
export const useEquipment = () => {
    const context = useContext(EquipmentContext);
    if (!context) throw new Error("useEquipment musi być użyty wewnątrz EquipmentProvider.");
    return context;
};
