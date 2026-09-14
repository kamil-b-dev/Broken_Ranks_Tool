import { useState } from "react";
import AppHeader from "./components/AppHeader";
import AppNotice from "../shared/ui/AppNotice";
import WorkspaceState from "./components/WorkspaceState";
import BuilderWorkspace from "../features/builder/BuilderWorkspace";
import BuildLibraryWorkspace from "../features/builds/BuildLibraryWorkspace";
import OptimizerWorkspace from "../features/optimizer/OptimizerWorkspace";
import { DEFAULT_OPTIMIZER_SETTINGS } from "../features/optimizer/optimizerDefaults";
import { useEquipment } from "../shared/state/EquipmentContext";
import { useBuildFileActions } from "../features/builds/useBuildFileActions";
import { useBuildLibrary } from "../features/builds/useBuildLibrary";
import { useAppRoute } from "./useAppRoute";
import HomeWorkspace from "./components/HomeWorkspace";

/** Root application composition and workspace navigation. */
function App() {
    const { activeView: mainView, navigate } = useAppRoute();
    const [optimizerSettings, setOptimizerSettings] = useState(DEFAULT_OPTIMIZER_SETTINGS);
    const equipment = useEquipment();
    const fileActions = useBuildFileActions(equipment);
    const buildLibrary = useBuildLibrary({
        createSnapshot: equipment.createBuildSnapshot,
        applySnapshot: equipment.loadBuildSnapshot,
    });
    const unavailable = equipment.loading || Boolean(equipment.initialDataError);

    return (
        <div
            className={`app-shell app-shell-${mainView} mx-auto flex min-h-screen w-full max-w-[1920px] flex-col gap-4 p-4 md:p-6 xl:gap-5 xl:p-8`}
        >
            <a className="skip-link" href="#workspace-content">
                Przejdź do głównej treści
            </a>
            <AppHeader
                activeView={mainView}
                buildCount={buildLibrary.builds.length}
                disabled={unavailable}
                fileInputRef={fileActions.fileInputRef}
                onViewChange={navigate}
                onSaveBuild={() =>
                    buildLibrary.saveCurrent(`Build ${buildLibrary.builds.length + 1}`)
                }
                onLoadBuild={fileActions.loadBuild}
            />
            <AppNotice
                notice={buildLibrary.notice || fileActions.notice}
                onDismiss={
                    buildLibrary.notice ? buildLibrary.dismissNotice : fileActions.dismissNotice
                }
            />
            <AppNotice
                notice={equipment.calculationNotice}
                onDismiss={equipment.dismissCalculationNotice}
            />
            {mainView !== "home" && (
                <WorkspaceState loading={equipment.loading} error={equipment.initialDataError} />
            )}
            {mainView === "home" && <HomeWorkspace />}
            {!unavailable && mainView === "builder" && (
                <BuilderWorkspace
                    data={equipment.data}
                    categoryNames={equipment.categoryNames}
                    orbCategories={equipment.orbCategories}
                    drifCategories={equipment.drifCategories}
                    gameRules={equipment.gameRules}
                    requestData={equipment.requestData}
                    stats={equipment.stats}
                    statSources={equipment.statSources}
                    isCalculatingStats={equipment.isCalculatingStats}
                    optimizationTrigger={equipment.optimizationTrigger}
                    characterConfig={equipment.characterConfig}
                    onSlotUpdate={equipment.handleSlotUpdate}
                    onCharacterStatsUpdate={equipment.handleCharacterStatsUpdate}
                    onCalculateStats={equipment.calculateStats}
                />
            )}
            {!unavailable && mainView === "optimizer" && (
                <OptimizerWorkspace
                    settings={optimizerSettings}
                    onSettingsChange={setOptimizerSettings}
                    onBackToBuilder={() => navigate("builder")}
                />
            )}
            {!unavailable && mainView === "builds" && (
                <BuildLibraryWorkspace
                    builds={buildLibrary.builds}
                    data={equipment.data}
                    gameRules={equipment.gameRules}
                    onRename={buildLibrary.rename}
                    onOverwrite={buildLibrary.overwrite}
                    onLoad={buildLibrary.load}
                    onExport={buildLibrary.exportBuild}
                    onRemove={buildLibrary.remove}
                    onOpenBuilder={() => navigate("builder")}
                />
            )}
        </div>
    );
}

export default App;
