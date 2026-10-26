export const backpackTopics = [
    {
        id: "backpack",
        title: "Plecak",
        intro: "Plecak przechowuje zapasowe przedmioty oraz osobne drify i orby dla danego zestawu.",
        steps: [
            "Przełącz widok postaci na Plecak, aby dodać lub edytować zapasowe rzeczy.",
            "Wybierz Plecak jako źródło wyposażenia, wskaż rzecz i pasujący slot lub gniazdo. Na komputerze możesz też przeciągnąć ją w wybrane miejsce.",
        ],
        related: ["backpack-equipping", "backpack-management", "backpack-drifs"],
    },
    {
        id: "backpack-equipping",
        title: "Zakładanie i zamiana rzeczy",
        steps: [
            "Wybierz Plecak jako źródło wyposażenia, wskaż rzecz i pasujący slot lub gniazdo. Na komputerze możesz też przeciągnąć ją w wybrane miejsce.",
            "Przedmiot zakładasz razem z jego orbami i drifami. Zastąpiony przedmiot wraca do plecaka ze swoimi orbami i drifami. Przy zamianie pojedynczego kamienia wraca tylko ten kamień.",
            "Drif lub orb musi pasować do wybranego gniazda i być zgodny z zasadami gry. Wbudowanych drifów nie można zastąpić sztuką z plecaka; przy niedozwolonej zamianie komunikat wskaże przyczynę.",
        ],
        related: ["backpack", "equipment-removal", "capacity", "orbs"],
    },
    {
        id: "backpack-management",
        title: "Edycja i porządkowanie plecaka",
        steps: [
            "Użyj „Dodaj”, wybierz przedmiot, drif lub orb i ustaw jego parametry w edytorze. „Duplikuj” tworzy osobny wpis z taką samą konfiguracją.",
            "Plecak mieści 200 wpisów. Przedmiot z osadzonymi kamieniami zajmuje jeden wpis; każdy osobny drif lub orb zajmuje kolejny.",
            "Strzałki przesuwania działają przy sortowaniu „Własna kolejność”. Przy pozostałych sposobach sortowania pozycję rzeczy wyznacza wybrane kryterium.",
            "„Wymaga poprawy” oznacza niepoprawną konfigurację wpisu. Wybierz go, sprawdź komunikat w edytorze i popraw wskazane parametry.",
        ],
        related: ["backpack", "equipment-removal", "history"],
    },
    {
        id: "equipment-removal",
        title: "Zdejmowanie rzeczy do plecaka",
        steps: [
            "„Zdejmij wszystkie przedmioty” przenosi je do plecaka razem z osadzonymi kamieniami. „Zdejmij wszystkie orby” i „Zdejmij wszystkie drify” odkładają kamienie jako osobne wpisy.",
            "Ikona plecaka przy przedmiocie lub kamieniu zdejmuje tylko wskazaną rzecz.",
            "Strzałka obok przycisku cofa konkretną operację. Cofnięcie jest dostępne, dopóki przeniesiona rzecz i jej poprzednie miejsce pozostają niezmienione.",
        ],
        related: ["backpack-management", "history", "builder"],
    },
    {
        id: "history",
        title: "Cofnij i Ponów",
        steps: [
            "„Cofnij” przywraca poprzedni stan buildu, a „Ponów” odtwarza cofniętą zmianę. Nowa edycja po cofnięciu usuwa możliwość ponowienia wcześniejszych zmian.",
            "Historia obejmuje ekwipunek, plecak, atrybuty postaci oraz blokady slotów i drifów.",
            "Użyj Ctrl+Z, aby cofnąć, oraz Ctrl+Shift+Z lub Ctrl+Y, aby ponowić. Na Macu użyj Cmd+Z i Cmd+Shift+Z. Podczas pisania skróty obsługują edytowane pole.",
            "Historia jest dostępna podczas bieżącej pracy. Aby zachować wybraną wersję na później, zapisz build lub pobierz plik.",
        ],
        related: ["equipment-removal", "builds", "builder"],
    },
];
