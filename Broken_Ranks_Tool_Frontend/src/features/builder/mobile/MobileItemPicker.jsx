import { useLayoutEffect, useRef, useState } from "react";

export default function MobileItemPicker({ items, slotLabel, onSelect, onClose }) {
    const dialog = useRef(null);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState(null);
    const visible = items.filter((item) =>
        `${item.name} ${item.tier}`
            .toLocaleLowerCase("pl")
            .includes(query.trim().toLocaleLowerCase("pl"))
    );
    useLayoutEffect(() => {
        const element = dialog.current;
        const opener = document.activeElement;
        element.showModal();
        return () => {
            element.close();
            if (opener?.isConnected) opener.focus();
        };
    }, []);
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
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Nazwa lub tier"
                        />
                    </label>
                    <p className="mobile-muted" role="status">
                        {visible.length} przedmiotów
                    </p>
                    <div className="mobile-picker-results">
                        {visible.map((item) => (
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
