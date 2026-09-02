import { SLOTS } from "../../constants/equipment";
import EquipmentSlotOverview from "../equipment/EquipmentSlotOverview";
import GearSlot from "../gear_slot/GearSlot";

const BuilderEquipmentWorkbench = ({
    model,
    data,
    requestData,
    gameRules,
    optimizationTrigger,
    onSlotUpdate,
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
                                className={`equipment-ring-slot-${slot.key}${equipped ? " equipment-ring-slot-equipped" : ""}`}
                            />
                        );
                    })}
                </div>
            </div>
            <section className="selected-slot-editor" aria-label="Edytor wybranego slotu">
                <div className="selected-slot-editor-heading">
                    <div>
                        <p className="section-kicker">Edytowany slot</p>
                        <h3>{model.activeSlot.label}</h3>
                    </div>
                    <span>{model.activeItem?.name || "Brak wybranego przedmiotu"}</span>
                </div>
                <div className="selected-slot-editor-content">
                    {SLOTS.map((slot) => (
                        <div
                            key={slot.key}
                            className={slot.key === model.activeSlot.key ? "block" : "hidden"}
                        >
                            <GearSlot
                                expanded
                                slotKey={slot.key}
                                label={slot.label}
                                items={model.itemsBySlot[slot.key] || []}
                                orbs={data.orbs}
                                drifs={data.drifs}
                                allSlots={requestData.slots || {}}
                                onUpdate={onSlotUpdate}
                                gameRules={gameRules}
                                optimizationTrigger={optimizationTrigger}
                            />
                        </div>
                    ))}
                </div>
            </section>
        </section>
    );
};

export default BuilderEquipmentWorkbench;
