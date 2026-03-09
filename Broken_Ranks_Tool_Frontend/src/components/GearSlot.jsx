import { useState, useEffect } from "react";

const GearSlot = ({ slotKey, label, items, orbs, drifs, onUpdate }) => {
    const [selectedItem, setSelectedItem] = useState("");
    const [selectedOrb, setSelectedOrb] = useState("");
    const [selectedDrifs, setSelectedDrifs] = useState([]);

    // Funkcja grupująca przedmioty według wybranej kolumny (np. 'tier' lub 'size')
    const groupItems = (itemsList) => {
        return itemsList.reduce((acc, item) => {
            // ZAKŁADAM, że w bazie drifów/orbów masz kolumnę np. 'tier' (I, II, III).
            // Jeśli masz inną nazwę (np. 'size'), zmień słowo 'tier' poniżej!
            const category = item.size || "Inne";

            if (!acc[category]) {
                acc[category] = []; // Tworzymy nową szufladkę, jeśli jeszcze jej nie ma
            }
            acc[category].push(item); // Wrzucamy drif/orb do odpowiedniej szufladki
            return acc;
        }, {});
    };

    const groupedOrbs = groupItems(orbs);
    const groupedDrifs = groupItems(drifs);

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
        <div className="flex flex-col items-center gap-3 w-48 p-2">
            {/* Mała etykieta na górze (np. "Hełm") */}
            <span className="text-xs font-bold text-gray-400">{label}</span>

            {/* 1. PRZEDMIOT: Niebieski Prostokąt */}
            <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full bg-neutral-800 text-white p-1 text-xs rounded border-2 border-blue-500 focus:border-blue-400 outline-none text-center"
            >
                <option value="">-- {label} --</option>
                {items.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                ))}
            </select>

            {/* 2. ORB: Czerwone "Kółko" */}
            <select
                value={selectedOrb}
                onChange={(e) => setSelectedOrb(e.target.value)}
                className="w-14 h-14 bg-neutral-800 text-transparent hover:text-white p-1 text-xs rounded-full border-2 border-red-500 focus:border-red-400 outline-none cursor-pointer appearance-none text-center"
                title="Wybierz Orba"
            >
                <option value="" className="text-white">Brak</option>
                {Object.entries(groupedOrbs).map(([size, groupOfOrbs]) => (
                    <optgroup key={size} label={`Wielkość: ${size}`} className="text-white">
                        {groupOfOrbs.map((orb) => (
                            <option key={orb.id} value={orb.id}>{orb.name}</option>
                        ))}
                    </optgroup>
                ))}
            </select>

            {/* 3. DRIFY: Czarna Linia */}
            <div className="flex flex-col w-full gap-1 items-center">
                {selectedDrifs.map((drif, index) => (
                    <select
                        key={index}
                        value={drif}
                        onChange={(e) => updateDrif(index, e.target.value)}
                        className="w-full bg-transparent text-white p-1 text-xs border-b-2 border-black focus:border-gray-500 outline-none text-center"
                    >
                        <option value="" className="bg-neutral-800 text-white">Brak drifa</option>
                        {Object.entries(groupedDrifs).map(([size, groupOfDrifs]) => (
                            <optgroup key={size} label={`Wielkość: ${size}`} className="bg-neutral-800 text-white">
                                {groupOfDrifs.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                ))}

                {/* Mały guzik do dodawania kolejnego drifa */}
                <button
                    onClick={addDrif}
                    className="text-xs text-gray-500 hover:text-white mt-1"
                >
                    + Drif
                </button>
            </div>
        </div>
    );
};

export default GearSlot;