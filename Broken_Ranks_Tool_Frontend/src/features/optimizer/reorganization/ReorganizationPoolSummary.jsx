import {
    useEquipmentBackpack,
    useEquipmentCatalogState,
    useEquipmentSetup,
    useEquipmentLocksState,
} from "../../../shared/state/EquipmentContext";

export default function ReorganizationPoolSummary() {
    const { requestData } = useEquipmentSetup();
    const { data } = useEquipmentCatalogState();
    const { lockedSlots = [], lockedDrifs = {} } = useEquipmentLocksState();
    const { backpack = [] } = useEquipmentBackpack();
    const equipped = Object.entries(requestData.slots || {}).reduce((count, [key, slot]) => {
        const item = data.items.find((candidate) => String(candidate.id) === String(slot?.itemId));
        if (lockedSlots.includes(key) || ["EPIC", "SET"].includes(item?.rarity)) return count;
        return (
            count +
            (slot.drifIds || []).filter(
                (id, index) => id && !(lockedDrifs[key] || []).includes(index)
            ).length
        );
    }, 0);
    const selected = backpack.filter(
        (entry) => entry.kind === "DRIF" && entry.sendToBackend
    ).length;
    return (
        <section className="optimizer-settings-strip" aria-label="Pula reorganizacji">
            <h3 style={{ fontFamily: "var(--ui-font)" }}>Pula drifów</h3>
            <div className="text-xs text-stone-400">
                <p>
                    Ekwipunek: {equipped} · Zaznaczone w plecaku: {selected}
                </p>
                <p>Poziomy i rozmiary pozostają bez zmian. Nieużyte drify wrócą do plecaka.</p>
            </div>
        </section>
    );
}
