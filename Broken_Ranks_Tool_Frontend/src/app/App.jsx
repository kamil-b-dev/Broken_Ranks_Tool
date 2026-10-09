import { lazy, Suspense, useEffect, useState } from "react";
import { getPresentation } from "./mobile/presentation";
import WorkspaceState from "./components/WorkspaceState";

const MobileApp = lazy(() => import("./mobile/MobileApp"));
const DesktopApp = lazy(() => import("./DesktopApp"));

/** Choose one presentation once; resizing and rotation never remount the build. */
export default function App() {
    const [presentation] = useState(getPresentation);
    useEffect(() => {
        const update = () => {
            document.documentElement.dataset.pageHidden = String(document.hidden);
        };
        update();
        document.addEventListener("visibilitychange", update);
        return () => {
            document.removeEventListener("visibilitychange", update);
            delete document.documentElement.dataset.pageHidden;
        };
    }, []);
    return (
        <Suspense fallback={<WorkspaceState loading />}>
            {presentation === "mobile" ? <MobileApp /> : <DesktopApp />}
        </Suspense>
    );
}
