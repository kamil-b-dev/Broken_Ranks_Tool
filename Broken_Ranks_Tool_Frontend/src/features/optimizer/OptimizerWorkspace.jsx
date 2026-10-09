import "./styles/optimizer-shell.css";
import "./styles/optimizer-goals.css";
import "./styles/optimizer-report.css";
import "./styles/optimizer-results.css";
import "./styles/optimizer-theme.css";
import "../../shared/styles/equipment-icons.css";
import OptimizerPanel from "./OptimizerPanel";
import OptimizerOverviewBar from "./OptimizerOverviewBar";
import { useEquipmentSetup, useEquipmentLocksState } from "../../shared/state/EquipmentContext";

/**
 * Presents drif optimization independently from manual build editing.
 *
 * @param {object} props Workspace properties.
 * @returns {JSX.Element} Drif optimizer workspace.
 */
const OptimizerWorkspace = ({ active = true, settings, onSettingsChange, onBackToBuilder }) => {
    const { requestData } = useEquipmentSetup();
    const { lockedSlots, lockedDrifs } = useEquipmentLocksState();

    return (
        <main
            id={active ? "workspace-content" : undefined}
            hidden={!active}
            className={`optimizer-theme w-full flex-1 flex-col gap-4 ${active ? "flex" : "hidden"}`}
        >
            <OptimizerOverviewBar
                slots={requestData.slots}
                lockedSlots={lockedSlots}
                lockedDrifs={lockedDrifs}
                onBackToBuilder={onBackToBuilder}
            />
            <OptimizerPanel
                optimizerSettings={settings}
                onOptimizerSettingsChange={onSettingsChange}
            />
        </main>
    );
};

export default OptimizerWorkspace;
