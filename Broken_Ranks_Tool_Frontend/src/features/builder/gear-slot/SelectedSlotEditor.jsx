import GearSlot from "./GearSlot";

/** Edits the slot currently selected in the equipment overview. */
const SelectedSlotEditor = ({
    model,
    data,
    requestData,
    gameRules,
    optimizationTrigger,
    onSlotUpdate,
}) => (
    <section className="selected-slot-editor" aria-label="Edytor wybranego slotu">
        <div className="selected-slot-editor-heading">
            <div>
                <p className="section-kicker">Edytowany slot</p>
                <h3>{model.activeSlot.label}</h3>
            </div>
        </div>
        <div className="selected-slot-editor-content">
            {[model.activeSlot].map((slot) => (
                <div key={slot.key}>
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
);

export default SelectedSlotEditor;
