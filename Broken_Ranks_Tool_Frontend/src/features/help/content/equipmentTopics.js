const STAR_BONUS_ROWS = [
    ["1★", "+0%", "+0%", "+0%", "0"],
    ["2★", "+3%", "+0%", "+0%", "0"],
    ["3★", "+6%", "+0%", "+0%", "0"],
    ["4★", "+10%", "+5%", "+0%", "0"],
    ["5★", "+15%", "+10%", "+0%", "0"],
    ["6★", "+20%", "+20%", "+0%", "0"],
    ["7★", "+25%", "+30%", "+3%", "+1"],
    ["8★", "+35%", "+50%", "+8%", "+2"],
    ["9★", "+50%", "+75%", "+15%", "+4"],
];

export const equipmentTopics = [
    {
        id: "builder",
        title: "Ekwipunek",
        steps: [
            "Ustaw poziom i punkty postaci.",
            "Wybierz slot i przedmiot z bazy danych lub plecaka.",
            "Ustaw gwiazdki, dodaj orby i drify oraz wybierz ich poziomy.",
            "Kliknij „Przelicz statystyki”. Wybierz statystykę w wyniku, aby zobaczyć, skąd pochodzi.",
        ],
        related: ["character", "stars", "backpack", "stats"],
    },
    {
        id: "character",
        title: "Poziom i punkty postaci",
        steps: [
            "Każdy poziom powyżej 1 daje 4 punkty do podziału między atrybuty. Jeden punkt dodaje 10 życia, many lub kondycji albo 1 do pozostałych atrybutów.",
            "„Zresetuj punkty” zwraca cały przydział do puli. Po zmianach kliknij „Przelicz statystyki”, aby odświeżyć wynik.",
        ],
        related: ["builder", "stats", "history"],
    },
    {
        id: "stars",
        title: "Gwiazdki przedmiotów",
        steps: [],
        tables: [
            {
                id: "star-bonuses",
                caption: "Bonusy za gwiazdki",
                headers: ["Gwiazdki", "Statystyki", "Bonus orba", "Bonus drifów", "Pojemność"],
                compactHeaders: ["★"],
                rows: STAR_BONUS_ROWS,
            },
            {
                id: "star-sockets",
                caption: "Liczba zwykłych gniazd drifów",
                headers: ["Tier przedmiotu", "1–6★", "7–9★"],
                rows: [
                    ["I", "1", "1"],
                    ["II–III", "1", "2"],
                    ["IV–VI", "2", "2"],
                    ["VII–IX", "2", "2"],
                    ["X–XII", "3", "3"],
                ],
            },
        ],
        related: ["capacity", "orbs", "stats"],
    },
    {
        id: "capacity",
        title: "Dlaczego drif nie mieści się w przedmiocie?",
        steps: [
            "Suma potęg wszystkich zwykłych drifów musi mieścić się w pojemności przedmiotu.",
            "Potęga drifa rośnie na poziomach 7, 12 i 17. Większy rozmiar przy tym samym typie bonusu i poziomie nie zwiększa zużycia pojemności.",
            "Mniejsze rozmiary drifów też pasują. Maksymalne rozmiary i ich poziomy pokazuje tabela.",
            "W jednym przedmiocie nie można powtórzyć typu bonusu drifa. Jeśli brakuje gniazd lub pojemności, sprawdź gwiazdki albo użyj Reorganizacji.",
        ],
        tables: [
            {
                id: "drif-tier-limits",
                afterStep: 3,
                caption: "Rozmiar i poziom drifa według tieru",
                headers: ["Tier przedmiotu", "Maks. rozmiar", "Maks. poziom"],
                rows: [
                    ["I–III", "Subdrif", "6"],
                    ["IV–VI", "Bidrif", "11"],
                    ["VII–IX", "Magnidrif", "16"],
                    ["X–XII", "Arcydrif", "21"],
                ],
            },
        ],
        note: "Drify obrażeń od ognia, zimna i energii pasują tylko do broni. W jednej broni można umieścić tylko jeden z tych trzech typów.",
        related: ["stars", "built-in-drifs", "reorganization"],
    },
    {
        id: "built-in-drifs",
        title: "Drify wbudowane",
        steps: [
            "Przedmioty epickie i setowe mają ustalone typy drifów. W edytorze wybierasz ich poziomy, bez wymiany typu lub przenoszenia tych kamieni.",
            "Wliczają się do liczby drifów danego typu i kary za powtórzenia. Optymalizator uwzględnia je również przy limitach liczby kamieni.",
        ],
        related: ["capacity", "stats", "drif-limits"],
    },
    {
        id: "orbs",
        title: "Dobór orbów",
        steps: [],
        tables: [
            {
                id: "orb-slot-categories",
                caption: "Kategorie orbów według slotu",
                headers: ["Przedmiot", "Dozwolone kategorie"],
                rows: [
                    ["Broń", "Ofensywne"],
                    ["Tarcza / karwasze", "Ofensywne lub defensywne"],
                    ["Hełm, zbroja, spodnie, buty", "Defensywne"],
                    ["Peleryna, pas, rękawice", "Ofensywne"],
                    ["Pierścienie, naszyjnik", "Użytkowe"],
                ],
            },
            {
                id: "orb-rarity-slots",
                caption: "Orby według rzadkości",
                headers: ["Przedmiot", "Pierwszy orb", "Drugi orb"],
                rows: [
                    ["Rzadki, epicki, setowy", "Według slotu", "Brak"],
                    ["Legendarny", "Według slotu lub ofensywny", "Ofensywny"],
                ],
            },
            {
                id: "orb-tier-limits",
                caption: "Rozmiar i poziom orba według tieru",
                headers: ["Tier przedmiotu", "Maks. rozmiar", "Maks. poziom"],
                rows: [
                    ["I–III", "Suborb", "1"],
                    ["IV–VI", "Biorb", "3"],
                    ["VII–IX", "Magniorb", "3"],
                    ["X–XII", "Arcyorb", "3"],
                ],
            },
            {
                id: "orb-star-bonuses",
                caption: "Bonus orba z gwiazdek",
                headers: ["Gwiazdki", "Bonus orba"],
                rows: STAR_BONUS_ROWS.map(([stars, , orbBonus]) => [stars, orbBonus]),
            },
            {
                id: "orb-bonus-rules",
                caption: "Zasady orbów",
                headers: ["Zasada", "Wartość"],
                rows: [
                    ["Typ bonusu", "Raz w całym zestawie"],
                    ["Bonus gwiazdek", "Zwiększa bonus orba"],
                ],
            },
        ],
        related: ["stars", "stone-levels", "equipment-removal"],
    },
    {
        id: "stone-levels",
        title: "Maksymalne poziomy kamieni",
        steps: [
            "„max lvl orby” ustawia najwyższe poziomy już założonych orbów. „max lvl drify” robi to dla założonych drifów, z uwzględnieniem pojemności.",
            "Jeśli wszystkie drify nie mieszczą się na maksymalnych poziomach, część dostanie niższy poziom. Komunikat wskaże ograniczone kamienie.",
            "Przyciski zachowują typy i rozmiary kamieni.",
        ],
        related: ["capacity", "orbs", "from-scratch"],
    },
    {
        id: "stats",
        title: "Jak czytać statystyki?",
        steps: [
            "Po zmianie zestawu kliknij „Przelicz statystyki”. Zakładki pozwalają przejrzeć statystyki podstawowe, orby i drify. Kliknij wartość, aby zobaczyć jej źródła.",
            "Od czwartego drifa tego samego typu działa kara osłabiająca ich łączny efekt. Liczą się też drify wbudowane; orby nie podlegają tej karze.",
            "Cap to limit przydatnej wartości bonusu. Nadmiar ponad cap nie daje dalszej korzyści. Przy redukcji zużycia many i kondycji bardziej ujemna wartość oznacza większą redukcję.",
            "W szczegółach sprawdzisz bonus przedmiotu, gwiazdki i mnożniki. Składniki są pokazywane do 4 miejsc po przecinku, a wynik jest zaokrąglany po zsumowaniu.",
        ],
        related: ["character", "stars", "built-in-drifs"],
    },
    {
        id: "database",
        title: "Wyszukiwanie w bazie",
        steps: [
            "Przedmioty wyszukasz po nazwie lub bossie, bez rozróżniania wielkości liter. Filtry zawężają wyniki według kategorii, tieru i statystyki bazowej.",
            "W zakładkach orbów i drifów wybierz kategorię bonusu. Filtr potęgi drifa dotyczy potęgi bazowej; jego poziom ustawiasz po wybraniu kamienia.",
            "W wyszukiwaniu przedmiotów możesz łączyć nazwy znakiem |, np. Morana|Tarul. Niepoprawny zapis pokaże błąd przy polu; popraw go lub wyczyść filtry.",
        ],
        related: ["builder", "backpack", "capacity"],
    },
];
