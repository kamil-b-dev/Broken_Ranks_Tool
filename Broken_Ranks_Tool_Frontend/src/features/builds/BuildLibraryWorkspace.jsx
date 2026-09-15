import { useMemo, useState } from "react";
import BuildComparison from "./BuildComparison";
import BuildRenameForm from "./library/BuildRenameForm";
import SavedBuildList from "./library/SavedBuildList";

const BuildLibraryWorkspace = ({
    active = true,
    builds,
    data,
    gameRules,
    onRename,
    onOverwrite,
    onLoad,
    onExport,
    onRemove,
    onOpenBuilder,
}) => {
    const [selectedIds, setSelectedIds] = useState([]);
    const availableSelectedIds = useMemo(() => {
        const knownIds = new Set(builds.map((build) => build.id));
        return selectedIds.filter((id) => knownIds.has(id));
    }, [builds, selectedIds]);
    const selectedBuilds = useMemo(
        () => availableSelectedIds.flatMap((id) => builds.find((build) => build.id === id) || []),
        [availableSelectedIds, builds]
    );

    const toggleComparison = (id) => {
        setSelectedIds((current) => {
            const knownIds = new Set(builds.map((build) => build.id));
            const available = current.filter((currentId) => knownIds.has(currentId));
            if (available.includes(id)) return available.filter((currentId) => currentId !== id);
            if (available.length >= 3) return available;
            return [...available, id];
        });
    };

    return (
        <main
            id={active ? "workspace-content" : undefined}
            hidden={!active}
            className={`build-library-theme w-full flex-1 flex-col gap-4 ${active ? "flex" : "hidden"}`}
        >
            <section className="build-library-heading workbench">
                <div>
                    <h2>Buildy lokalne</h2>
                </div>
                <BuildRenameForm builds={builds} onRename={onRename} />
            </section>
            <div className="build-library-layout">
                <aside className="build-library-list-panel workbench">
                    <div className="build-library-panel-heading">
                        <div>
                            <h3>Zapisane buildy</h3>
                        </div>
                    </div>
                    <SavedBuildList
                        builds={builds}
                        selectedIds={availableSelectedIds}
                        onToggleComparison={toggleComparison}
                        onLoad={onLoad}
                        onOpenBuilder={onOpenBuilder}
                        onExport={onExport}
                        onOverwrite={onOverwrite}
                        onRemove={onRemove}
                    />
                </aside>
                <section
                    className="build-comparison-panel workbench"
                    aria-labelledby="comparison-heading"
                >
                    <div className="build-library-panel-heading">
                        <div>
                            <h3 id="comparison-heading">Porównywarka buildów</h3>
                        </div>
                        {availableSelectedIds.length > 0 && (
                            <button type="button" onClick={() => setSelectedIds([])}>
                                Wyczyść wybór
                            </button>
                        )}
                    </div>
                    <BuildComparison
                        builds={selectedBuilds}
                        items={data.items}
                        drifs={data.drifs}
                        gameRules={gameRules}
                    />
                </section>
            </div>
        </main>
    );
};

export default BuildLibraryWorkspace;
