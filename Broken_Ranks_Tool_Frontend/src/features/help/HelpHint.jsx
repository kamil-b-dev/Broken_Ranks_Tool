import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { HELP_HINTS } from "./helpHints";
import "./help-controls.css";

const contains = (element, target) => target instanceof Node && Boolean(element?.contains(target));

export default function HelpHint({ kind, label }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const root = useRef(null);
    const tooltip = useRef(null);
    const id = useId();
    useLayoutEffect(() => {
        if (!open) return;
        const position = () => {
            const anchor = root.current.getBoundingClientRect();
            const element = tooltip.current;
            const left = Math.max(
                8,
                Math.min(
                    anchor.right - element.offsetWidth,
                    window.innerWidth - element.offsetWidth - 8
                )
            );
            const top =
                anchor.bottom + element.offsetHeight > window.innerHeight - 8
                    ? Math.max(8, anchor.top - element.offsetHeight)
                    : anchor.bottom;
            element.style.left = `${left}px`;
            element.style.top = `${top}px`;
        };
        position();
        window.addEventListener("resize", position);
        window.addEventListener("scroll", position, true);
        return () => {
            window.removeEventListener("resize", position);
            window.removeEventListener("scroll", position, true);
        };
    }, [open]);
    useEffect(() => {
        if (!open) return;
        const dismiss = (event) => {
            if (!root.current.contains(event.target) && !tooltip.current?.contains(event.target))
                setOpen(false);
        };
        const escape = (event) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", dismiss);
        document.addEventListener("keydown", escape);
        return () => {
            document.removeEventListener("pointerdown", dismiss);
            document.removeEventListener("keydown", escape);
        };
    }, [open]);
    return (
        <span
            ref={root}
            className="help-hint"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={(event) => {
                if (
                    !root.current.contains(document.activeElement) &&
                    !contains(tooltip.current, event.relatedTarget)
                )
                    setOpen(false);
            }}
            onBlur={(event) => {
                if (!contains(event.currentTarget, event.relatedTarget)) setOpen(false);
            }}
        >
            <button
                type="button"
                aria-label={t("Pomoc: {0}", [t(label)])}
                aria-describedby={open ? id : undefined}
                onFocus={() => setOpen(true)}
                onClick={() => setOpen(true)}
            >
                ?
            </button>
            {open &&
                createPortal(
                    <span
                        ref={tooltip}
                        id={id}
                        role="tooltip"
                        className="app-tooltip help-hint-text"
                        onMouseLeave={(event) => {
                            if (
                                !root.current.contains(document.activeElement) &&
                                !contains(root.current, event.relatedTarget)
                            )
                                setOpen(false);
                        }}
                    >
                        {t(HELP_HINTS[kind])}
                    </span>,
                    document.body
                )}
        </span>
    );
}
