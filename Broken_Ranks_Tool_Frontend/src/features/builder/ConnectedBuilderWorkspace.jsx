import {
    useEquipmentCatalogState,
    useEquipmentSetup,
    useEquipmentCalculation,
} from "../../shared/state/EquipmentContext";
import BuilderWorkspace from "./BuilderWorkspace";

/** Desktop data subscriptions belong to the workspace, not the application shell. */
export default function ConnectedBuilderWorkspace() {
    const catalog = useEquipmentCatalogState();
    const setup = useEquipmentSetup();
    const calculation = useEquipmentCalculation();
    return (
        <BuilderWorkspace
            {...catalog}
            {...setup}
            {...calculation}
            onSlotUpdate={setup.handleSlotUpdate}
            onCharacterStatsUpdate={setup.handleCharacterStatsUpdate}
            onCalculateStats={calculation.calculateStats}
        />
    );
}
