import { SLOTS } from "../../shared/domain/equipment/equipmentSlots";
import EquipmentSlotOverview from "./equipment/EquipmentSlotOverview";

const BuilderEquipmentWorkbench = ({
    model,
    data,
    requestData,
    gameRules,
    onOverviewItemDrop,
    children,
}) => {
    return (
        <section className="workbench builder-equipment-column flex flex-col p-5 md:p-6">
            <div className="workbench-heading">
                <div>
                    <p className="section-kicker">Konfiguracja</p>
                    <h2>Ekwipunek</h2>
                </div>
                <p className="workbench-help">
                    Wybierz przedmiot lub przeciągnij go z bazy. Karmazynowa obwódka oznacza aktywne
                    pole.
                </p>
            </div>
            <span className="equipment-ornament-divider" aria-hidden="true" />
            <div className="equipment-figure-heading" aria-live="polite">
                <span>Ekwipunek</span>
                <strong>
                    {model.equippedSlotCount}/{SLOTS.length}
                </strong>
            </div>
            <div className="equipment-figure-layout">
                <div
                    className="equipment-character-figure"
                    aria-label="Kołowy wybór slotów ekwipunku"
                >
                    <span className="equipment-figure-aura" />
                    <span className="equipment-center-silhouette" aria-hidden="true" />
                    {SLOTS.map((slot) => {
                        const equipped = Boolean(model.itemForSlot(slot));
                        const active = slot.key === model.activeSlot.key;
                        return (
                            <EquipmentSlotOverview
                                key={slot.key}
                                variant="ring"
                                slotKey={slot.key}
                                label={slot.label}
                                slotData={requestData.slots?.[slot.key]}
                                item={model.itemForSlot(slot)}
                                drifs={data.drifs}
                                bonusTranslations={gameRules.bonusTranslations}
                                active={active}
                                onSelect={() => model.selectSlot(slot)}
                                acceptedItemIds={(model.itemsBySlot[slot.key] || []).map(
                                    (candidate) => candidate.id
                                )}
                                onItemDrop={(item) => onOverviewItemDrop(slot, item)}
                                className={`equipment-ring-slot-${slot.key}${equipped ? " equipment-ring-slot-equipped" : ""}`}
                            />
                        );
                    })}
                </div>
            </div>
            {children}
        </section>
    );
};

export default BuilderEquipmentWorkbench;
