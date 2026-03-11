import { useState, useEffect } from "react";

const GearSlot = ({ slotKey, label, items, orbs, drifs, onUpdate }) => {
    const [selectedItem, setSelectedItem] = useState("");
    const [selectedOrb, setSelectedOrb] = useState("");
    const [selectedDrifs, setSelectedDrifs] = useState([]);

    // Stany do zapamiętywania wybranego RODZAJU (zanim wybierzemy wielkość)
    const [orbType, setOrbType] = useState("");
    const [drifTypes, setDrifTypes] = useState({}); // Zapisuje typ dla każdego indeksu drifa osobno

    // Grupujemy według RODZAJU (np. "Drif Siły"), a nie według wielkości
    const groupByType = (itemsList) => {
        if (!itemsList || !Array.isArray(itemsList)) return {};

        return itemsList.reduce((acc, item) => {
            // Jeśli masz w bazie ładną kolumnę określającą rodzaj (np. item.type), użyj jej!
            // Jeśli masz tylko nazwę "Mały Drif Siły", ten krótki kod "odetnie" przedrostki wielkości:
            let category = item.size;
            if (!category) {
                category = item.name.replace(/SUBDRIF |BIDRIF |MAGNIDRIF |ARCYDRIF |I |II |III |IV |V |VI /g, "").trim();
            }

            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {});
    };

// Zmieniamy nazwy zmiennych na nowe
    const groupedOrbs = groupByType(orbs);
    const groupedDrifs = groupByType(drifs);

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

    const fullSelectedItem = items.find(i => i.id.toString() === selectedItem.toString());

    // USTALAMY LIMIT: Tutaj możesz zdefiniować, ile drifów wchodzi w jaki tier
    let maxDrifs = 0; // Domyślnie blokujemy
    if (fullSelectedItem) {
        switch(fullSelectedItem.tier) {
            case 'I':
            case 'II':
            case 'III':
                maxDrifs = 1;
                break;

            case 'IV':
            case 'V':
            case 'VI':
            case 'VII':
            case 'VIII':
            case 'IX':
                maxDrifs = 2;
                break;

            case 'X':
            case 'XI':
            case 'XII':
                maxDrifs = 3;
                break;

            default:
                maxDrifs = 0;
        }
    }

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

            {/* 2. ORB: Wybór dwuetapowy */}
            <div className="flex flex-col items-center w-full">
                {/* KROK 1: Wybór rodzaju (Napis nad kółkiem) */}
                <select
                    value={orbType}
                    onChange={(e) => {
                        setOrbType(e.target.value);
                        setSelectedOrb(""); // Resetujemy orba, gdy zmienisz jego rodzaj!
                    }}
                    className="w-full bg-transparent text-orange-400 font-bold text-xs text-center outline-none mb-1 cursor-pointer"
                >
                    <option value="" className="bg-neutral-800 text-white">-- Typ Orba --</option>
                    {Object.keys(groupedOrbs).map(type => (
                        <option key={type} value={type} className="bg-neutral-800 text-white">{type}</option>
                    ))}
                </select>

                {/* KROK 2: Wybór wielkości (Czerwone kółko) */}
                <select
                    value={selectedOrb}
                    onChange={(e) => setSelectedOrb(e.target.value)}
                    disabled={!orbType} // Kółko jest zablokowane, dopóki nie wybierzesz typu
                    className="w-14 h-14 bg-neutral-800 text-transparent hover:text-white p-1 text-sm rounded-full border-[3px] border-red-500 focus:border-red-400 outline-none cursor-pointer appearance-none text-center disabled:border-neutral-700 disabled:opacity-40"
                    title={orbType ? "Wybierz Wielkość" : "Najpierw wybierz typ wyżej"}
                >
                    <option value="" className="text-white">Brak</option>
                    {/* Pokazujemy tylko orby z wybranego wyżej typu */}
                    {orbType && groupedOrbs[orbType]?.map((orb) => (
                        <option key={orb.id} value={orb.id} className="text-white">
                            {orb.tier || orb.name.split(" ")[0]}
                        </option>
                    ))}
                </select>
            </div>

            {/* 3. DRIFY: Dwie połączone czarne linie */}
            <div className="flex flex-col w-full gap-3 items-center mt-2">
                {selectedDrifs.map((drifId, index) => {
                    const currentType = drifTypes[index] || "";

                    return (
                        <div key={index} className="flex gap-2 w-full justify-center">
                            {/* KROK 1: Wybór rodzaju (Lewa linia) */}
                            <select
                                value={currentType}
                                onChange={(e) => {
                                    setDrifTypes({ ...drifTypes, [index]: e.target.value });
                                    updateDrif(index, ""); // Resetujemy drif przy zmianie rodzaju
                                }}
                                className="w-1/2 bg-transparent text-orange-400 p-1 text-xs border-b-4 border-black focus:border-gray-500 outline-none text-center cursor-pointer"
                            >
                                <option value="" className="bg-neutral-800 text-white">Rodzaj...</option>
                                {Object.keys(groupedDrifs).map(type => (
                                    <option key={type} value={type} className="bg-neutral-800 text-white">{type}</option>
                                ))}
                            </select>

                            {/* KROK 2: Wybór wielkości (Prawa linia) */}
                            <select
                                value={drifId}
                                onChange={(e) => updateDrif(index, e.target.value)}
                                disabled={!currentType} // Zablokowane bez wybranego rodzaju
                                className="w-1/2 bg-transparent text-white p-1 text-xs border-b-4 border-black focus:border-gray-500 outline-none text-center disabled:opacity-30 cursor-pointer"
                            >
                                <option value="" className="bg-neutral-800 text-white">Rozmiar...</option>
                                {/* Pokazujemy tylko wielkości dla wybranego rodzaju */}
                                {currentType && groupedDrifs[currentType]?.map((d) => (
                                    <option key={d.id} value={d.id} className="bg-neutral-800 text-white">
                                        {d.tier || d.name.split(" ")[0]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    );
                })}

                {/* Przycisk pojawi się TYLKO, gdy mamy wybrany przedmiot
                    i gdy liczba dodanych drifów jest mniejsza niż limit */}
                {fullSelectedItem && selectedDrifs.length < maxDrifs && (
                    <button
                        onClick={addDrif}
                        className="text-sm font-bold text-gray-500 hover:text-white mt-1"
                    >
                        + Dodaj Drif
                    </button>
                )}
            </div>
        </div>
    );
};

export default GearSlot;