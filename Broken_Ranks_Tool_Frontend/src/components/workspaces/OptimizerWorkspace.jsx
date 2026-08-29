import OptimizerPanel from "../OptimizerPanel";
import OptimizerSettingsPanel from "../OptimizerSettingsPanel";

/**
 * Presents drif optimization independently from manual build editing.
 *
 * @param {object} props Workspace properties.
 * @returns {JSX.Element} Drif optimizer workspace.
 */
const OptimizerWorkspace = ({ settings, onSettingsChange }) => (
    <main className="optimizer-theme flex w-full flex-1 flex-col gap-4">
        <OptimizerSettingsPanel settings={settings} onChange={onSettingsChange} />
        <OptimizerPanel optimizerSettings={settings} onOptimizerSettingsChange={onSettingsChange} />
    </main>
);

export default OptimizerWorkspace;
