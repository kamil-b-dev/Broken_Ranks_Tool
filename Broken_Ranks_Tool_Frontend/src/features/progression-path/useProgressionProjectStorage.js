import { useEffect, useState, useSyncExternalStore } from "react";
import { PROJECT_STORAGE_KEY, projectPayload } from "./progressionProject";

/** Keeps storage failures observable without copying external state into an Effect update. */
export default function useProgressionProjectStorage(project, initialWarning, persistAllowed) {
    const [storage] = useState(() => {
        let warning = initialWarning;
        const listeners = new Set();
        const publish = (next) => {
            if (warning === next) return;
            warning = next;
            listeners.forEach((listener) => listener());
        };
        return {
            subscribe: (listener) => {
                listeners.add(listener);
                return () => listeners.delete(listener);
            },
            snapshot: () => warning,
            publish,
            save: (value) => {
                try {
                    localStorage.setItem(
                        PROJECT_STORAGE_KEY,
                        JSON.stringify(projectPayload(value))
                    );
                } catch {
                    publish("Nie udało się zapisać projektu lokalnie. Możesz pobrać go do pliku.");
                }
            },
        };
    });
    const warning = useSyncExternalStore(storage.subscribe, storage.snapshot, storage.snapshot);
    useEffect(() => {
        if (persistAllowed.current) storage.save(project);
    }, [project, persistAllowed, storage]);
    return [warning, storage.publish];
}
