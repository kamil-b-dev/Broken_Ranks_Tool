import { backpackEntryLabel } from "./backpackView";
import "./backpack-source.css";

export default function BackpackEquipmentSelect({
    entries,
    data,
    kind,
    slotKey,
    zone,
    label,
    onEquip,
    getWarning,
}) {
    const choices = entries.filter((entry) => entry.kind === kind);
    return (
        <label className="backpack-equipment-select">
            {label}
            <select
                value=""
                onChange={(event) => {
                    if (event.target.value) onEquip(event.target.value, slotKey, zone);
                }}
            >
                <option value="">
                    {choices.length ? "Wybierz z plecaka" : "Brak kamieni tego rodzaju w plecaku"}
                </option>
                {choices.map((entry, index) => {
                    const warning = getWarning(entry.id, slotKey, zone);
                    return (
                        <option key={entry.id} value={entry.id} disabled={Boolean(warning)}>
                            {index + 1}. {backpackEntryLabel(entry, data)}
                            {warning ? ` — ${warning}` : ""}
                        </option>
                    );
                })}
            </select>
        </label>
    );
}
