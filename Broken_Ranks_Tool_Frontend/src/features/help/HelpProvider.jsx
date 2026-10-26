import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "../../shared/i18n/useTranslation";
import LanguageSwitcher from "../../shared/i18n/LanguageSwitcher";
import { HelpContext } from "./HelpContext";
import { HELP_GROUPS, findHelpTopic } from "./helpContent";
import HelpArticle from "./HelpArticle";
import "./help.css";

const readPage = () =>
    window.location.pathname === "/help"
        ? findHelpTopic(new URLSearchParams(window.location.search).get("topic")).id
        : null;

function HelpDialog({ topicId, onSelect, onClose, onOpenPage }) {
    const { t } = useTranslation();
    const dialog = useRef(null);
    const titleId = useId();
    const article = useRef(null);
    useLayoutEffect(() => {
        const element = dialog.current;
        const opener = document.activeElement;
        const overflow = document.body.style.overflow;
        element.showModal();
        document.body.style.overflow = "hidden";
        return () => {
            element.close();
            document.body.style.overflow = overflow;
            if (opener?.isConnected) opener.focus({ preventScroll: true });
        };
    }, []);
    useEffect(() => {
        article.current.scrollTop = 0;
        article.current.focus({ preventScroll: true });
    }, [topicId]);
    return (
        <dialog
            ref={dialog}
            className="help-dialog"
            aria-labelledby={titleId}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
        >
            <header className="help-toolbar">
                <button type="button" onClick={onClose}>
                    {t("Wróć do pracy")}
                </button>
                <a
                    href={`/help?topic=${topicId}`}
                    onClick={(event) => {
                        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
                            return;
                        event.preventDefault();
                        onOpenPage(topicId);
                    }}
                >
                    {t("Wszystkie tematy")}
                </a>
            </header>
            <div ref={article} tabIndex={-1} className="help-dialog-body">
                <HelpArticle topic={findHelpTopic(topicId)} onSelect={onSelect} titleId={titleId} />
            </div>
        </dialog>
    );
}

function HelpPage({ topicId, onSelect, onClose }) {
    const { t } = useTranslation();
    const heading = useRef(null);
    const navigation = useRef(null);
    const titleId = useId();
    useEffect(() => {
        heading.current.focus({ preventScroll: true });
        const group = navigation.current.querySelector("[data-current-group]");
        if (group) group.open = true;
    }, [topicId]);
    return (
        <main className="help-page" id="help-content">
            <header className="help-page-heading">
                <div className="help-page-title">
                    <svg
                        className="help-emblem"
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                    >
                        <path d="M12 5v15M12 5C9 3 5 3 2 4v14c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z" />
                        <path d="M5 7h4M5 11h4M15 7h4M15 11h4" />
                    </svg>
                    <h1>{t("Instrukcja")}</h1>
                </div>
                <div className="help-toolbar">
                    <button type="button" onClick={onClose}>
                        {t("Wróć do aplikacji")}
                    </button>
                    <LanguageSwitcher />
                </div>
            </header>
            <label className="help-topic-picker">
                {t("Wybierz temat")}
                <select value={topicId} onChange={(event) => onSelect(event.target.value)}>
                    {HELP_GROUPS.map((group) => (
                        <optgroup key={group.id} label={t(group.title)}>
                            {group.topicIds.map((id) => (
                                <option key={id} value={id}>
                                    {t(findHelpTopic(id).title)}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </label>
            <div className="help-page-layout">
                <nav ref={navigation} className="help-topics" aria-label={t("Tematy pomocy")}>
                    {HELP_GROUPS.map((group) => (
                        <details
                            key={group.id}
                            className="help-topic-group"
                            name={`${titleId}-groups`}
                            open={group.topicIds.includes(topicId)}
                            data-current-group={group.topicIds.includes(topicId) ? "" : undefined}
                            aria-labelledby={`${titleId}-${group.id}`}
                        >
                            <summary id={`${titleId}-${group.id}`}>{t(group.title)}</summary>
                            <div>
                                {group.topicIds.map((id) => (
                                    <a
                                        key={id}
                                        href={`/help?topic=${id}`}
                                        aria-current={id === topicId ? "page" : undefined}
                                        onClick={(event) => {
                                            if (
                                                event.ctrlKey ||
                                                event.metaKey ||
                                                event.shiftKey ||
                                                event.altKey
                                            )
                                                return;
                                            event.preventDefault();
                                            onSelect(id);
                                        }}
                                    >
                                        {t(findHelpTopic(id).title)}
                                    </a>
                                ))}
                            </div>
                        </details>
                    ))}
                </nav>
                <div
                    ref={heading}
                    tabIndex={-1}
                    className="help-page-article"
                    aria-labelledby={titleId}
                >
                    <HelpArticle
                        topic={findHelpTopic(topicId)}
                        onSelect={onSelect}
                        titleId={titleId}
                    />
                </div>
            </div>
        </main>
    );
}

/** Keep the working view mounted while help owns its own history entry. */
export default function HelpProvider({ children }) {
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
        const id = findHelpTopic(topic).id;
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
        setDialogTopic(findHelpTopic(topic).id);
    }, []);
    const context = useMemo(() => ({ openPage, openTopic }), [openPage, openTopic]);
    return (
        <HelpContext.Provider value={context}>
            <div hidden={Boolean(pageTopic)} className="help-app-surface">
                {children}
            </div>
            {pageTopic && <HelpPage topicId={pageTopic} onSelect={openPage} onClose={closePage} />}
            {dialogTopic && (
                <HelpDialog
                    topicId={dialogTopic}
                    onSelect={setDialogTopic}
                    onClose={() => setDialogTopic(null)}
                    onOpenPage={openPage}
                />
            )}
        </HelpContext.Provider>
    );
}
