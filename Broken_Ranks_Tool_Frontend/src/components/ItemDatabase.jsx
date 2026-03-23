const ItemDatabase = ({ groupedItems }) => {
    return (
        <div className="bg-neutral-800 p-6 rounded-xl shadow-lg border border-neutral-700 flex flex-col min-h-0 flex-1">
            <h3 className="text-xl font-bold border-b-2 border-blue-600 pb-3 mb-4 text-white shrink-0">
                Baza Przedmiotów
            </h3>

            <div className="overflow-y-auto pr-2 space-y-4">
                {Object.entries(groupedItems).sort().map(([category, catItems]) => (
                    <div key={category}>
                        <h4 className="text-blue-400 font-bold mb-1 text-sm">{category}</h4>
                        <ul className="text-sm text-gray-300 space-y-1 pl-2 border-l-2 border-neutral-700">
                            {catItems.map(item => (
                                <li key={item.id} className="hover:text-white transition-colors cursor-default flex justify-between">
                                    <span>{item.name}</span>
                                    <span className="text-gray-500 text-xs">Lvl {item.reqLevel || "?"}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
                {Object.keys(groupedItems).length === 0 && (
                    <p className="text-gray-500 text-sm text-center">Brak przedmiotów do wyświetlenia.</p>
                )}
            </div>
        </div>
    );
};

export default ItemDatabase;