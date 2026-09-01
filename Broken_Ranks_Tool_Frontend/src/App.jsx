import { useState } from "react";
import AppHeader from "./components/app/AppHeader";
import BuildFileNotice from "./components/app/BuildFileNotice";
import WorkspaceState from "./components/app/WorkspaceState";
import BuilderWorkspace from "./components/workspaces/BuilderWorkspace";
import BuildLibraryWorkspace from "./components/workspaces/BuildLibraryWorkspace";
import OptimizerWorkspace from "./components/workspaces/OptimizerWorkspace";
import { useEquipment } from "./context/EquipmentContext";
import { useBuildFileActions } from "./hooks/useBuildFileActions";
import { useBuildLibrary } from "./hooks/useBuildLibrary";

const DEFAULT_OPTIMIZER_SETTINGS = {
    forceMaximizationByDrifBonus: false,
    generateVariants: false,
    maxVariantLossPercent: 5,
};

/** Root application composition and workspace navigation. */
function App() {
    const [mainView, setMainView] = useState("builder");
    const [hasOpenedOptimizer, setHasOpenedOptimizer] = useState(false);
    const [optimizerSettings, setOptimizerSettings] = useState(DEFAULT_OPTIMIZER_SETTINGS);
    const equipment = useEquipment();
    const fileActions = useBuildFileActions(equipment);
    const buildLibrary = useBuildLibrary({
        createSnapshot: equipment.createBuildSnapshot,
        applySnapshot: equipment.loadBuildSnapshot,
    });
    const unavailable = equipment.loading || Boolean(equipment.initialDataError);
    const changeView = (view) => {
        if (view === "optimizer") setHasOpenedOptimizer(true);
        setMainView(view);
    };

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
                onViewChange={changeView}
                onSaveBuild={fileActions.saveBuild}
                onLoadBuild={fileActions.loadBuild}
            />
            <BuildFileNotice
                notice={buildLibrary.notice || fileActions.notice}
                onDismiss={
                    buildLibrary.notice ? buildLibrary.dismissNotice : fileActions.dismissNotice
                }
            />
            <WorkspaceState loading={equipment.loading} error={equipment.initialDataError} />
            {!unavailable && (
                <BuilderWorkspace
                    active={mainView === "builder"}
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
            {!unavailable && hasOpenedOptimizer && (
                <OptimizerWorkspace
                    active={mainView === "optimizer"}
                    settings={optimizerSettings}
                    onSettingsChange={setOptimizerSettings}
                    onBackToBuilder={() => changeView("builder")}
                />
            )}
            {!unavailable && (
                <BuildLibraryWorkspace
                    active={mainView === "builds"}
                    builds={buildLibrary.builds}
                    data={equipment.data}
                    gameRules={equipment.gameRules}
                    onSaveCurrent={buildLibrary.saveCurrent}
                    onOverwrite={buildLibrary.overwrite}
                    onLoad={buildLibrary.load}
                    onRemove={buildLibrary.remove}
                    onOpenBuilder={() => changeView("builder")}
                />
            )}
        </div>
    );
}

export default App;
