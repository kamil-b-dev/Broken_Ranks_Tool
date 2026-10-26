import { useTranslation } from "../../shared/i18n/useTranslation";
import LanguageSwitcher from "../../shared/i18n/LanguageSwitcher";
import OptimizerLabelSettings from "../../features/optimizer/OptimizerLabelSettings";
import "./mobile-workspace.css";
import "../../shared/styles/equipment-icons.css";
import { lazy, Suspense, useCallback, useState } from "react";
import { useAppRoute, APP_ROUTES } from "../useAppRoute";
import {
    useEquipmentCatalogState,
    useEquipmentBuildActions,
} from "../../shared/state/EquipmentContext";
import EquipmentCalculationNotice from "../components/EquipmentCalculationNotice";
import { useBuildFileActions } from "../../features/builds/useBuildFileActions";
import { useBuildLibrary } from "../../features/builds/useBuildLibrary";
import { MAX_SAVED_BUILDS } from "../../features/builds/buildLibraryStorage";
import { DEFAULT_OPTIMIZER_SETTINGS } from "../../features/optimizer/optimizerDefaults";
const MobileBuilderWorkspace = lazy(
    () => import("../../features/builder/mobile/MobileBuilderWorkspace")
);
import AppNotice from "../../shared/ui/AppNotice";
import WorkspaceState from "../components/WorkspaceState";
import crest from "../../assets/mobile/broken-ranks-crest.webp";
import homeIcon from "../../assets/mobile/home.webp?no-inline";
import equipmentBuilderIcon from "../../assets/mobile/equipment-builder.webp?no-inline";
import drifOptimizerIcon from "../../assets/mobile/drif-optimizer.webp?no-inline";
import localBuildsIcon from "../../assets/mobile/local-builds.webp?no-inline";
import progressionPathIcon from "../../assets/mobile/progression-path.webp?no-inline";
import "./mobile-app.css";
import EquipmentHistoryControls from "../../features/equipment/EquipmentHistoryControls";
import BuildStorageNotice from "../components/BuildStorageNotice";
import HomeWorkspace from "../components/HomeWorkspace";
import HelpButton from "../../features/help/HelpButton";

const MobileOptimizerWorkspace = lazy(
    () => import("../../features/optimizer/mobile/MobileOptimizerWorkspace")
);
const ProgressionWorkspace = lazy(
    () => import("../../features/progression-path/ProgressionWorkspace")
);
const BuildLibraryWorkspace = lazy(
    () => import("../../features/builds/mobile/MobileBuildLibraryWorkspace")
);

const destinations = [
    { key: "home", label: "Start", icon: homeIcon },
    { key: "builder", label: "Kreator", icon: equipmentBuilderIcon },
    { key: "optimizer", label: "Optymalizator", icon: drifOptimizerIcon },
    { key: "progression", label: "Rozwój", icon: progressionPathIcon },
    { key: "builds", label: "Buildy", icon: localBuildsIcon },
];

/** Mobile composition shares data and actions with the unchanged desktop app. */
export default function MobileApp() {
    const { t } = useTranslation();

    const { activeView, navigate } = useAppRoute();
    const equipment = { ...useEquipmentCatalogState(), ...useEquipmentBuildActions() };
    const {
        fileInputRef,
        loadBuild,
        notice: fileNotice,
        dismissNotice: dismissFileNotice,
    } = useBuildFileActions(equipment);
    const library = useBuildLibrary({
        createSnapshot: equipment.createBuildSnapshot,
        applySnapshot: equipment.loadBuildSnapshot,
    });
    const [settings, setSettings] = useState(DEFAULT_OPTIMIZER_SETTINGS);
    const unavailable = equipment.loading || Boolean(equipment.initialDataError);
    const goTo = useCallback(
        (view) => {
            if (view === activeView && window.location.search) {
                window.history.pushState(null, "", APP_ROUTES[view]);
                window.dispatchEvent(new PopStateEvent("popstate"));
            }
            navigate(view);
            window.scrollTo({ top: 0, behavior: "instant" });
        },
        [activeView, navigate]
    );

    return (
        <div className="mobile-app">
            <a className="skip-link" href="#workspace-content">
                {t("Przejdź do głównej treści")}
            </a>
            <header className="mobile-header">
                <a
                    href={APP_ROUTES.home}
                    className="mobile-brand"
                    onClick={(event) => {
                        event.preventDefault();
                        goTo("home");
                    }}
                >
                    <img src={crest} alt="" />
                    <span>
                        {t("Broken Ranks ")}
                        <strong>{t("Tool")}</strong>
                    </span>
                </a>
                <HelpButton page compact />
                <div className="interface-preferences">
                    <OptimizerLabelSettings />
                    <LanguageSwitcher />
                </div>
                <details className="mobile-build-actions" key={activeView}>
                    <summary>
                        {t("Build ")}
                        <span aria-hidden="true">⋮</span>
                    </summary>
                    <div>
                        <button
                            type="button"
                            disabled={unavailable || library.builds.length >= MAX_SAVED_BUILDS}
                            onClick={(event) => {
                                dismissFileNotice();
                                library.saveCurrent(`Build ${library.builds.length + 1}`);
                                event.currentTarget.closest("details").open = false;
                            }}
                        >
                            {t("Zapisz lokalnie (")}
                            {t(library.builds.length)}/{t(MAX_SAVED_BUILDS)})
                        </button>
                        <button
                            type="button"
                            disabled={unavailable}
                            onClick={(event) => {
                                library.dismissNotice();
                                fileInputRef.current?.click();
                                event.currentTarget.closest("details").open = false;
                            }}
                        >
                            {t("Wczytaj plik buildu")}
                        </button>
                    </div>
                </details>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,text/plain,.json,.txt"
                    onChange={async (event) => {
                        if ((await loadBuild(event)) && window.location.pathname === "/")
                            goTo("builder");
                    }}
                    hidden
                />
            </header>
            <div className="mobile-content">
                <AppNotice
                    notice={library.notice || fileNotice}
                    onDismiss={library.notice ? library.dismissNotice : dismissFileNotice}
                />
                <EquipmentCalculationNotice />
                <BuildStorageNotice library={library} />
                {["builder", "optimizer"].includes(activeView) && <EquipmentHistoryControls />}
                <Suspense fallback={<WorkspaceState loading />}>
                    {activeView === "home" ? (
                        <HomeWorkspace
                            mobile
                            builds={library.builds}
                            disabled={unavailable}
                            hasWorkingBuild={equipment.hasWorkingBuild}
                            onContinue={() => goTo("builder")}
                            onImport={() => fileInputRef.current?.click()}
                            onOpenLibrary={() => goTo("builds")}
                            onOpenProgression={() => goTo("progression")}
                            onOpenBuild={async (id) => {
                                if (await library.load(id)) goTo("builder");
                            }}
                        />
                    ) : unavailable ? (
                        <main>
                            <WorkspaceState
                                loading={equipment.loading}
                                error={equipment.initialDataError}
                            />
                        </main>
                    ) : activeView === "builder" ? (
                        <MobileBuilderWorkspace />
                    ) : activeView === "progression" ? (
                        <ProgressionWorkspace
                            mobile
                            builds={library.builds}
                            data={equipment.data}
                            createSnapshot={equipment.createBuildSnapshot}
                            gameRules={equipment.gameRules}
                        />
                    ) : activeView === "optimizer" ? (
                        <MobileOptimizerWorkspace
                            settings={settings}
                            onSettingsChange={setSettings}
                            onBackToBuilder={() => goTo("builder")}
                        />
                    ) : (
                        <BuildLibraryWorkspace
                            library={library}
                            builds={library.builds}
                            data={equipment.data}
                            gameRules={equipment.gameRules}
                            onRename={library.rename}
                            onOverwrite={library.overwrite}
                            onLoad={library.load}
                            onExport={library.exportBuild}
                            onRemove={library.remove}
                            onOpenBuilder={() => goTo("builder")}
                        />
                    )}
                </Suspense>
            </div>
            <nav className="mobile-navigation" aria-label={t("Główne widoki aplikacji")}>
                {destinations.map(({ key, label, icon }) => (
                    <a
                        key={key}
                        href={APP_ROUTES[key]}
                        aria-label={
                            key === "progression"
                                ? `${t(label)} — ${t("Ścieżka rozwoju")}`
                                : undefined
                        }
                        aria-current={activeView === key ? "page" : undefined}
                        onClick={(event) => {
                            event.preventDefault();
                            goTo(key);
                        }}
                    >
                        <span aria-hidden="true">
                            <img src={icon} alt="" draggable="false" />
                        </span>
                        {t(label)}
                    </a>
                ))}
            </nav>
        </div>
    );
}
