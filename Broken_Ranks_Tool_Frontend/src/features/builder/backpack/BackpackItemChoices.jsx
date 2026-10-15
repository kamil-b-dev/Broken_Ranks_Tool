import { useState } from "react";
import EquipmentSlotOverview from "../equipment/EquipmentSlotOverview";
import { backpackTemplate } from "./backpackDomain";

export default function BackpackItemChoices({
    entries,
    items,
    data,
    gameRules,
    slotKey,
    onSelect,
    getWarning,
}) {
    const [query, setQuery] = useState("");
    const [count, setCount] = useState(40);
    const compatible = new Set(items.map((item) => String(item.id)));
    const choices = entries.filter(
        (entry) =>
            entry.kind === "ITEM" &&
            compatible.has(String(entry.equipment.itemId)) &&
            backpackTemplate(entry, data)
                ?.name.toLocaleLowerCase("pl")
                .includes(query.toLocaleLowerCase("pl"))
    );
    return (
        <div className="backpack-item-choices">
            <label className="mobile-field">
                Szukaj w plecaku
                <input
                    type="search"
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setCount(40);
                    }}
                />
            </label>
            {choices.slice(0, count).map((entry, index) => {
                const warning = getWarning(entry.id, slotKey);
                return (
                    <article key={entry.id} className="backpack-card">
                        <EquipmentSlotOverview
                            slotKey={slotKey}
                            label={`Przedmiot ${index + 1} z plecaka`}
                            item={backpackTemplate(entry, data)}
                            slotData={entry.equipment}
                            drifs={data.drifs}
                            orbs={data.orbs}
                            bonusTranslations={gameRules.bonusTranslations}
                            disabled={Boolean(warning)}
                            onSelect={() => onSelect(entry.id)}
                        />
                        {warning && <p className="backpack-warning">{warning}</p>}
                    </article>
                );
            })}
            {!choices.length && <p>Brak pasujących przedmiotów w plecaku.</p>}
            {choices.length > count && (
                <button type="button" onClick={() => setCount(count + 40)}>
                    Pokaż kolejne przedmioty
                </button>
            )}
        </div>
    );
}
