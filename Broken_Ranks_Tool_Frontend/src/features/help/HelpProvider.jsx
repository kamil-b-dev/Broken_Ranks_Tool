import {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { HelpContext } from "./HelpContext";
import "./help-controls.css";

const HelpSurfaces = lazy(() => import("./HelpSurfaces"));
const readPage = () =>
    window.location.pathname === "/help"
        ? new URLSearchParams(window.location.search).get("topic") || "builder"
        : null;

/** Keep the working view mounted while help owns its own history entry. */
export default function HelpProvider({ children }) {
    const { t } = useTranslation();
    const [pageTopic, setPageTopic] = useState(readPage);
    const [dialogTopic, setDialogTopic] = useState(null);
    const returnState = useRef(null);
    const dialogOpener = useRef(null);
    const wasPage = useRef(Boolean(pageTopic));
    useEffect(() => {
        const update = () => {
            setPageTopic(readPage());
            setDialogTopic(null);
        };
        window.addEventListener("popstate", update);
        return () => window.removeEventListener("popstate", update);
    }, []);
    useLayoutEffect(() => {
        if (wasPage.current && !pageTopic && returnState.current) {
            window.scrollTo({ top: returnState.current.scroll, behavior: "instant" });
            if (returnState.current.opener?.isConnected)
                returnState.current.opener.focus({ preventScroll: true });
        }
        wasPage.current = Boolean(pageTopic);
    }, [pageTopic]);
    const openPage = useCallback((topic = "builder") => {
        const id = topic || "builder";
        if (window.location.pathname !== "/help") {
            returnState.current = {
                scroll: window.scrollY,
                opener: document.activeElement?.closest(".help-dialog")
                    ? dialogOpener.current
                    : document.activeElement,
            };
            window.history.pushState({ helpPage: true }, "", `/help?topic=${id}`);
        } else window.history.replaceState(window.history.state, "", `/help?topic=${id}`);
        setDialogTopic(null);
        setPageTopic(id);
        window.scrollTo({ top: 0, behavior: "instant" });
    }, []);
    const closePage = () => {
        if (window.history.state?.helpPage) window.history.back();
        else {
            window.history.replaceState(null, "", "/");
            setPageTopic(null);
            window.dispatchEvent(new PopStateEvent("popstate"));
        }
    };
    const openTopic = useCallback((topic) => {
        dialogOpener.current = document.activeElement;
        setDialogTopic(topic || "builder");
    }, []);
    const context = useMemo(() => ({ openPage, openTopic }), [openPage, openTopic]);
    return (
        <HelpContext.Provider value={context}>
            <div hidden={Boolean(pageTopic)} className="help-app-surface">
                {children}
            </div>
            {(pageTopic || dialogTopic) && (
                <Suspense fallback={<div role="status">{t("Ładowanie instrukcji...")}</div>}>
                    <HelpSurfaces
                        pageTopic={pageTopic}
                        dialogTopic={dialogTopic}
                        onSelectPage={openPage}
                        onClosePage={closePage}
                        onSelectDialog={setDialogTopic}
                        onCloseDialog={() => setDialogTopic(null)}
                    />
                </Suspense>
            )}
        </HelpContext.Provider>
    );
}
