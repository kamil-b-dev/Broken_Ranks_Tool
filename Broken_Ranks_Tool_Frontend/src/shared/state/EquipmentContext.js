import { createContext, useContext } from "react";

export const EquipmentContext = createContext(null);
export const EquipmentCatalogContext = createContext(null);
export const EquipmentSetupContext = createContext(null);
export const EquipmentLocksContext = createContext(null);
export const EquipmentCalculationContext = createContext(null);
export const EquipmentBuildActionsContext = createContext(null);

const useRequiredContext = (contextType, name) => {
    const context = useContext(contextType);
    if (!context) throw new Error(`${name} musi być użyty wewnątrz EquipmentProvider.`);
    return context;
};

export const useEquipmentCatalogState = () =>
    useRequiredContext(EquipmentCatalogContext, "useEquipmentCatalogState");
export const useEquipmentSetup = () =>
    useRequiredContext(EquipmentSetupContext, "useEquipmentSetup");
export const useEquipmentLocksState = () =>
    useRequiredContext(EquipmentLocksContext, "useEquipmentLocksState");
export const useEquipmentCalculation = () =>
    useRequiredContext(EquipmentCalculationContext, "useEquipmentCalculation");
export const useEquipmentBuildActions = () =>
    useRequiredContext(EquipmentBuildActionsContext, "useEquipmentBuildActions");

/** Full workspace facade for compositions which need multiple state domains. Prefer a domain hook in leaf components. */
export const useEquipment = () => {
    const context = useContext(EquipmentContext);
    if (!context) throw new Error("useEquipment musi być użyty wewnątrz EquipmentProvider.");
    return context;
};
