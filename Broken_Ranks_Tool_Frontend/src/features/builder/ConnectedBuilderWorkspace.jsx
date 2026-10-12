import {
    useEquipmentCatalogState,
    useEquipmentSetup,
    useEquipmentCalculation,
    useEquipmentBackpack,
} from "../../shared/state/EquipmentContext";
import BuilderWorkspace from "./BuilderWorkspace";

/** Desktop data subscriptions belong to the workspace, not the application shell. */
export default function ConnectedBuilderWorkspace() {
    const catalog = useEquipmentCatalogState();
    const setup = useEquipmentSetup();
    const calculation = useEquipmentCalculation();
    const backpack = useEquipmentBackpack();
    return (
        <BuilderWorkspace
            {...catalog}
            {...setup}
            {...calculation}
            {...backpack}
            onSlotUpdate={setup.handleSlotUpdate}
            onCharacterStatsUpdate={setup.handleCharacterStatsUpdate}
            onCalculateStats={calculation.calculateStats}
        />
    );
}
