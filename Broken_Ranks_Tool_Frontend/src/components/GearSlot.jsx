import { useState, useEffect } from "react";

const GearSlot = ({ slotKey, label, items, orbs, drifs, onUpdate }) => {
    const [selectedItem, setSelectedItem] = useState("");
    const [selectedOrb, setSelectedOrb] = useState("");
    const [selectedDrifs, setSelectedDrifs] = useState([]);

    useEffect(() => {
        onUpdate(slotKey, {
            itemId: selectedItem || null,
            orbId: selectedOrb || null,
            drifIds: selectedDrifs.filter(id => id !== "")
        });
    }, [selectedItem, selectedOrb, selectedDrifs]);

    const addDrif = () => setSelectedDrifs([...selectedDrifs, ""]);

    const removeDrif = (index) => {
        const newDrifs = selectedDrifs.filter((_, i) => i !== index);
        setSelectedDrifs(newDrifs);
    };

    const updateDrif = (index, value) => {
        const newDrifs = [...selectedDrifs];
        newDrifs[index] = value;
        setSelectedDrifs(newDrifs);
    };

    return (
        <div className="bg-neutral-800 p-4 mb-4 rounded-lg border-l-4 border-orange-600 shadow-md">
            <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-lg text-white">{label}</span>
                <button
                    className="bg-green-600 hover:bg-green-500 text-white text-xs px-2 py-1 rounded transition-colors"
                    onClick={addDrif}
                >
                    + Drif
                </button>
            </div>

            <select
                className="w-full p-2 mb-2 bg-neutral-700 text-white border border-neutral-600 rounded focus:outline-none focus:border-orange-500"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
            >
                <option value="">-- Wybierz {label} --</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name} (Lvl {i.reqLevel})</option>)}
            </select>

            <select
                className="w-full p-2 mb-2 bg-neutral-700 text-white border border-neutral-600 rounded focus:outline-none focus:border-orange-500"
                value={selectedOrb}
                onChange={(e) => setSelectedOrb(e.target.value)}
            >
                <option value="">-- Brak Orba --</option>
                {orbs.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.bonusType})</option>)}
            </select>

            <div className="mt-2 pl-2 border-l-2 border-dashed border-neutral-600">
                {selectedDrifs.map((drifId, index) => (
                    <div key={index} className="flex items-center mb-2">
                        <select
                            className="flex-grow p-2 bg-neutral-700 text-white border border-neutral-600 rounded focus:outline-none focus:border-orange-500"
                            value={drifId}
                            onChange={(e) => updateDrif(index, e.target.value)}
                        >
                            <option value="">-- Wybierz Drif --</option>
                            {drifs.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.baseValue})</option>)}
                        </select>
                        <button
                            className="ml-2 bg-red-600 hover:bg-red-500 text-white w-8 h-10 rounded flex items-center justify-center transition-colors"
                            onClick={() => removeDrif(index)}
                        >
                            X
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GearSlot;