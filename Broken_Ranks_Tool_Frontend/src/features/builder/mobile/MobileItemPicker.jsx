import { useLayoutEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 40;

export default function MobileItemPicker({ items, slotLabel, onSelect, onClose, openerRef }) {
    const dialog = useRef(null);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState(null);
    const [page, setPage] = useState(0);
    const index = useMemo(
        () =>
            items.map((item) => ({
                item,
                text: `${item.name} ${item.tier}`.toLocaleLowerCase("pl"),
            })),
        [items]
    );
    const visible = useMemo(() => {
        const search = query.trim().toLocaleLowerCase("pl");
        return index.filter(({ text }) => text.includes(search));
    }, [index, query]);
    const pageCount = Math.ceil(visible.length / PAGE_SIZE);
    const currentPage = Math.min(page, Math.max(0, pageCount - 1));
    const pageItems = visible.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
    useLayoutEffect(() => {
        const element = dialog.current;
        const opener = openerRef?.current || document.activeElement;
        element.showModal();
        return () => {
            element.close();
            if (opener?.isConnected) opener.focus();
            queueMicrotask(() => {
                if (opener?.isConnected && !document.querySelector("dialog[open]")) opener.focus();
            });
        };
    }, [openerRef]);
    return (
        <dialog
            className="mobile-item-picker"
            ref={dialog}
            aria-labelledby="mobile-picker-title"
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    onClose();
                }
            }}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
        >
            <header>
                <h2 id="mobile-picker-title">{slotLabel}: wybór przedmiotu</h2>
                <button type="button" onClick={onClose} aria-label="Zamknij wybór przedmiotu">
                    ✕
                </button>
            </header>
            {selected ? (
                <div className="mobile-picker-detail">
                    <button type="button" className="mobile-back" onClick={() => setSelected(null)}>
                        ← Wyniki wyszukiwania
                    </button>
                    <h3>{selected.name}</h3>
                    <dl>
                        <div>
                            <dt>Tier</dt>
                            <dd>{selected.tier}</dd>
                        </div>
                        <div>
                            <dt>Pojemność</dt>
                            <dd>{selected.capacity || 0}</dd>
                        </div>
                        {Object.entries(selected.stats || {}).map(([name, value]) => (
                            <div key={name}>
                                <dt>{name}</dt>
                                <dd>{value}</dd>
                            </div>
                        ))}
                    </dl>
                    <button
                        type="button"
                        className="mobile-primary"
                        onClick={() => onSelect(selected)}
                    >
                        Wybierz przedmiot
                    </button>
                </div>
            ) : (
                <>
                    <label className="mobile-field">
                        Szukaj przedmiotu
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setPage(0);
                            }}
                            placeholder="Nazwa lub tier"
                        />
                    </label>
                    <p className="mobile-muted" role="status">
                        {visible.length} przedmiotów
                    </p>
                    {pageCount > 1 && (
                        <nav className="mobile-picker-pagination" aria-label="Strony przedmiotów">
                            <button
                                type="button"
                                disabled={currentPage === 0}
                                onClick={() => setPage(currentPage - 1)}
                            >
                                Poprzednia
                            </button>
                            <span aria-live="polite">
                                {currentPage + 1} / {pageCount}
                            </span>
                            <button
                                type="button"
                                disabled={currentPage === pageCount - 1}
                                onClick={() => setPage(currentPage + 1)}
                            >
                                Następna
                            </button>
                        </nav>
                    )}
                    <div className="mobile-picker-results">
                        {pageItems.map(({ item }) => (
                            <button type="button" key={item.id} onClick={() => setSelected(item)}>
                                <strong>{item.name}</strong>
                                <span>
                                    Tier {item.tier} · pojemność {item.capacity || 0}
                                </span>
                            </button>
                        ))}
                    </div>
                    {!visible.length && <p>Brak pasujących przedmiotów.</p>}
                </>
            )}
        </dialog>
    );
}
