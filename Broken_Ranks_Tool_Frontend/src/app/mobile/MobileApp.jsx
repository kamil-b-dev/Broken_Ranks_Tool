import { useState } from "react";
import { useAppRoute, APP_ROUTES } from "../useAppRoute";
import { useEquipment } from "../../shared/state/EquipmentContext";
import { useBuildFileActions } from "../../features/builds/useBuildFileActions";
import { useBuildLibrary } from "../../features/builds/useBuildLibrary";
import { MAX_SAVED_BUILDS } from "../../features/builds/buildLibraryStorage";
import { DEFAULT_OPTIMIZER_SETTINGS } from "../../features/optimizer/optimizerDefaults";
import MobileOptimizerWorkspace from "../../features/optimizer/mobile/MobileOptimizerWorkspace";
import BuildLibraryWorkspace from "../../features/builds/BuildLibraryWorkspace";
import MobileBuilderWorkspace from "../../features/builder/mobile/MobileBuilderWorkspace";
import AppNotice from "../../shared/ui/AppNotice";
import WorkspaceState from "../components/WorkspaceState";
import crest from "../../assets/broken-ranks-crest.webp";
import homeIcon from "../../assets/navigation-icons/home.png";
import equipmentBuilderIcon from "../../assets/navigation-icons/equipment-builder.png";
import drifOptimizerIcon from "../../assets/navigation-icons/drif-optimizer.png";
import localBuildsIcon from "../../assets/navigation-icons/local-builds.png";
import "./mobile-app.css";
import "../../features/builds/mobile/mobile-builds.css";

const destinations = [
    { key: "home", label: "Start", icon: homeIcon },
    { key: "builder", label: "Kreator", icon: equipmentBuilderIcon },
    { key: "optimizer", label: "Optymalizator", icon: drifOptimizerIcon },
    { key: "builds", label: "Buildy", icon: localBuildsIcon },
];

/** Mobile composition shares data and actions with the unchanged desktop app. */
export default function MobileApp() {
    const { activeView, navigate } = useAppRoute();
    const equipment = useEquipment();
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
    const goTo = (view) => {
        if (view === activeView && window.location.search) {
            window.history.pushState(null, "", APP_ROUTES[view]);
            window.dispatchEvent(new PopStateEvent("popstate"));
        }
        navigate(view);
        window.scrollTo({ top: 0, behavior: "instant" });
    };

    return (
        <div className="mobile-app">
            <a className="skip-link" href="#workspace-content">
                Przejdź do głównej treści
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
                        Broken Ranks <strong>Tool</strong>
                    </span>
                </a>
                <details className="mobile-build-actions" key={activeView}>
                    <summary>
                        Build <span aria-hidden="true">⋮</span>
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
                            Zapisz lokalnie ({library.builds.length}/{MAX_SAVED_BUILDS})
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
                            Wczytaj plik buildu
                        </button>
                    </div>
                </details>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,text/plain,.json,.txt"
                    onChange={loadBuild}
                    hidden
                />
            </header>
            <div className="mobile-content">
                <AppNotice
                    notice={library.notice || fileNotice}
                    onDismiss={library.notice ? library.dismissNotice : dismissFileNotice}
                />
                <AppNotice
                    notice={equipment.calculationNotice}
                    onDismiss={equipment.dismissCalculationNotice}
                />
                {activeView === "home" ? (
                    <main id="workspace-content" className="mobile-home">
                        <h1>Broken Ranks Tool</h1>
                    </main>
                ) : unavailable ? (
                    <main>
                        <WorkspaceState
                            loading={equipment.loading}
                            error={equipment.initialDataError}
                        />
                    </main>
                ) : activeView === "builder" ? (
                    <MobileBuilderWorkspace />
                ) : activeView === "optimizer" ? (
                    <MobileOptimizerWorkspace
                        settings={settings}
                        onSettingsChange={setSettings}
                        onBackToBuilder={() => goTo("builder")}
                    />
                ) : (
                    <BuildLibraryWorkspace
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
            </div>
            <nav className="mobile-navigation" aria-label="Główne widoki aplikacji">
                {destinations.map(({ key, label, icon }) => (
                    <a
                        key={key}
                        href={APP_ROUTES[key]}
                        aria-current={activeView === key ? "page" : undefined}
                        onClick={(event) => {
                            event.preventDefault();
                            goTo(key);
                        }}
                    >
                        <span aria-hidden="true">
                            <img src={icon} alt="" draggable="false" />
                        </span>
                        {label}
                    </a>
                ))}
            </nav>
        </div>
    );
}
