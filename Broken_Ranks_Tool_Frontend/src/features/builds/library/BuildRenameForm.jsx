import { useState } from "react";

const BuildRenameForm = ({ builds, onRename }) => {
    const [name, setName] = useState(null);
    const [targetId, setTargetId] = useState("");
    const target = builds.find((build) => build.id === targetId) || builds[0] || null;
    const editedName = name ?? target?.name ?? "";

    const renameBuild = (event) => {
        event.preventDefault();
        if (onRename(target?.id, editedName)) setName(null);
    };

    const selectBuild = (event) => {
        const selectedId = event.target.value;
        const selectedBuild = builds.find((build) => build.id === selectedId);
        setTargetId(selectedId);
        setName(selectedBuild?.name ?? null);
    };

    return (
        <form onSubmit={renameBuild} className="build-library-save-form">
            <label htmlFor="local-build-name">Zmień nazwę lokalnego buildu</label>
            <div>
                <select
                    aria-label="Wybierz build do zmiany nazwy"
                    value={target?.id || ""}
                    disabled={!builds.length}
                    onChange={selectBuild}
                >
                    {builds.length ? (
                        builds.map((build) => (
                            <option key={build.id} value={build.id}>
                                {build.name}
                            </option>
                        ))
                    ) : (
                        <option value="">Brak zapisanych buildów</option>
                    )}
                </select>
                <input
                    id="local-build-name"
                    value={editedName}
                    maxLength={48}
                    disabled={!target}
                    onChange={(event) => setName(event.target.value)}
                />
                <button type="submit" disabled={!target || !editedName.trim()}>
                    Zmień nazwę
                </button>
            </div>
        </form>
    );
};

export default BuildRenameForm;
