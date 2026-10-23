import { useTranslation } from "../shared/i18n/useTranslation";
import "./desktop-app.css";
import "./desktop-theme.css";
import "../styles/home.css";
import { lazy, Suspense, useState } from "react";
import AppHeader from "./components/AppHeader";
import AppNotice from "../shared/ui/AppNotice";
import WorkspaceState from "./components/WorkspaceState";
const BuilderWorkspace = lazy(() => import("../features/builder/ConnectedBuilderWorkspace"));
const BuildLibraryWorkspace = lazy(() => import("../features/builds/BuildLibraryWorkspace"));
const OptimizerWorkspace = lazy(() => import("../features/optimizer/OptimizerWorkspace"));
const ProgressionWorkspace = lazy(
    () => import("../features/progression-path/ProgressionWorkspace")
);
import { DEFAULT_OPTIMIZER_SETTINGS } from "../features/optimizer/optimizerDefaults";
import {
    useEquipmentCatalogState,
    useEquipmentBuildActions,
} from "../shared/state/EquipmentContext";
import EquipmentCalculationNotice from "./components/EquipmentCalculationNotice";
import { useBuildFileActions } from "../features/builds/useBuildFileActions";
import { useBuildLibrary } from "../features/builds/useBuildLibrary";
import { useAppRoute } from "./useAppRoute";
import HomeWorkspace from "./components/HomeWorkspace";
import EquipmentHistoryControls from "./components/EquipmentHistoryControls";
import BuildStorageNotice from "./components/BuildStorageNotice";

/** Desktop composition is loaded only for the desktop presentation. */
export default function DesktopApp() {
    const { t } = useTranslation();

    const { activeView: mainView, navigate } = useAppRoute();
    const [optimizerSettings, setOptimizerSettings] = useState(DEFAULT_OPTIMIZER_SETTINGS);
    const equipment = { ...useEquipmentCatalogState(), ...useEquipmentBuildActions() };
    const fileActions = useBuildFileActions(equipment);
    const buildLibrary = useBuildLibrary({
        createSnapshot: equipment.createBuildSnapshot,
        applySnapshot: equipment.loadBuildSnapshot,
    });
    const unavailable = equipment.loading || Boolean(equipment.initialDataError);

    return (
        <div
            className={`app-shell app-shell-${mainView} flex min-h-screen w-full max-w-none flex-col gap-4 p-4 md:p-6 xl:gap-5 xl:p-8`}
        >
            <a className="skip-link" href="#workspace-content">
                {t("Przejdź do głównej treści")}
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
                onLoadBuild={async (event) => {
                    if ((await fileActions.loadBuild(event)) && window.location.pathname === "/")
                        navigate("builder");
                }}
            />
            <AppNotice
                notice={buildLibrary.notice || fileActions.notice}
                onDismiss={
                    buildLibrary.notice ? buildLibrary.dismissNotice : fileActions.dismissNotice
                }
            />
            <EquipmentCalculationNotice />
            <BuildStorageNotice library={buildLibrary} />
            {["builder", "optimizer"].includes(mainView) && <EquipmentHistoryControls />}
            {mainView !== "home" && (
                <WorkspaceState loading={equipment.loading} error={equipment.initialDataError} />
            )}
            <Suspense fallback={<WorkspaceState loading />}>
                {mainView === "home" && (
                    <HomeWorkspace
                        builds={buildLibrary.builds}
                        disabled={unavailable}
                        hasWorkingBuild={equipment.hasWorkingBuild}
                        onContinue={() => navigate("builder")}
                        onImport={() => fileActions.fileInputRef.current?.click()}
                        onOpenLibrary={() => navigate("builds")}
                        onOpenProgression={() => navigate("progression")}
                        onOpenBuild={async (id) => {
                            if (await buildLibrary.load(id)) navigate("builder");
                        }}
                    />
                )}
                {!unavailable && mainView === "progression" && (
                    <ProgressionWorkspace
                        builds={buildLibrary.builds}
                        data={equipment.data}
                        createSnapshot={equipment.createBuildSnapshot}
                        gameRules={equipment.gameRules}
                    />
                )}
                {!unavailable && mainView === "builder" && <BuilderWorkspace />}
                {!unavailable && mainView === "optimizer" && (
                    <OptimizerWorkspace
                        settings={optimizerSettings}
                        onSettingsChange={setOptimizerSettings}
                        onBackToBuilder={() => navigate("builder")}
                    />
                )}
                {!unavailable && mainView === "builds" && (
                    <BuildLibraryWorkspace
                        library={buildLibrary}
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
            </Suspense>
        </div>
    );
}
