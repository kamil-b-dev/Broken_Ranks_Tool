import OptimizerPanel from "../OptimizerPanel";
import OptimizerSettingsPanel from "../OptimizerSettingsPanel";
import OptimizerOverviewBar from "../optimization/OptimizerOverviewBar";
import { useEquipment } from "../../context/EquipmentContext";

/**
 * Presents drif optimization independently from manual build editing.
 *
 * @param {object} props Workspace properties.
 * @returns {JSX.Element} Drif optimizer workspace.
 */
const OptimizerWorkspace = ({ active = true, settings, onSettingsChange }) => {
    const { requestData, lockedSlots, lockedDrifs } = useEquipment();

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
            />
            <OptimizerSettingsPanel settings={settings} onChange={onSettingsChange} />
            <OptimizerPanel
                optimizerSettings={settings}
                onOptimizerSettingsChange={onSettingsChange}
            />
        </main>
    );
};

export default OptimizerWorkspace;
