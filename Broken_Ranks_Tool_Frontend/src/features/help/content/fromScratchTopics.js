export const fromScratchTopics = [
    {
        id: "simple-profile",
        title: "Profil i opcje trybu prostego",
        steps: [
            "Profil profesji dobiera gotowy zestaw priorytetów. Zmiana profesji przywraca domyślne opcje nowego profilu, więc sprawdź ponownie preferowane liczby drifów.",
            "Rycerz i Druid mają styl ofensywny i defensywny. Zmiana stylu aktualizuje domyślne liczby drifów, zachowując wpisane własne liczby; styl defensywny włącza redukcję obrażeń biernych.",
            "Barbarzyńca wybiera żywioł drifa w broni. Sheed może wybrać żywioł albo „Bez żywiołu”.",
            "Włączenie redukcji obrażeń biernych lub procentowych wymaga jednego drifa tego typu. Łucznik, Sheed i Voodoo mogą też włączyć Holma lub Farida, dodając wymaganie odpowiedniego drifa.",
        ],
        related: ["from-scratch", "drif-limits", "results"],
    },
    {
        id: "priorities",
        title: "Priorytety i potencjalny zakres",
        steps: [
            "Dodaj bonusy, które mają być brane pod uwagę. Waga od 1 do 30 określa ich względną ważność: wyższa waga mocniej premiuje poprawę tego bonusu.",
            "Waga nie jest docelowym procentem ani gwarancją uzyskania określonej wartości. Cele procentowe ustawiasz osobno.",
            "„Potencjalny zakres” to szacunek dla danego bonusu na wybranym ekwipunku i przy jego limitach liczby drifów. Bonusy współdzielą gniazda i pojemność, więc nie wszystkie maksima da się osiągnąć razem.",
            "Sortowanie i ukrywanie kategorii porządkuje widok. Ukryte priorytety nadal uczestniczą w obliczeniach; „Pokaż wszystkie” przywraca ich widoczność.",
        ],
        related: ["drif-limits", "maximization", "optimizer-config"],
    },
    {
        id: "drif-limits",
        title: "Limity liczby i rozmiarów drifów",
        steps: [
            "Minimalna i maksymalna liczba drifów są twardymi warunkami dla danego bonusu w całym zestawie. Wliczają się także drify zablokowane i wbudowane.",
            "W „Rozmiarach drifów” włącz ograniczenie przy wybranym rozmiarze i ustaw jego zakres. „Dowolnie” oznacza brak osobnego limitu tego rozmiaru; nadal obowiązuje limit łączny.",
            "Maksimum 0 wyklucza zwykłe drify danego rozmiaru. Obowiązkowy drif wbudowany przekraczający maksimum rozmiaru zostaje z ostrzeżeniem, bez zgody na dokładanie kolejnych takich drifów.",
            "Zakresy muszą być spójne z limitem łącznym, blokadami, tierem i pojemnością. Sprzeczne limity wymagają poprawy ustawień przed uzyskaniem prawidłowego zestawu.",
        ],
        related: ["capacity", "locks", "priorities"],
    },
    {
        id: "maximization",
        title: "Opcje maksymalizacji",
        steps: [
            "„Maksymalizuj mod” wskazuje bonus do uzyskania w jak największej użytecznej wartości. Optymalizator nadal musi respektować limity liczby drifów, blokady i pojemność.",
            "„Wymuś maksymalizację według bonusów do drifów” najpierw rezerwuje miejsca dla maksymalizowanych modów na przedmiotach z największym bonusem do drifów. Włącz ją po wskazaniu modów do maksymalizacji. Takie rezerwowanie ogranicza swobodę układania pozostałych drifów.",
        ],
        related: ["priorities", "drif-limits", "results"],
    },
    {
        id: "variants",
        title: "Dodatkowe warianty i strata",
        steps: [
            "„Obliczaj dodatkowe warianty” w zaawansowanym trybie Od zera szuka alternatyw poprawiających wybrane bonusy kosztem innych. Opcja jest niedostępna przy użyciu drifów z plecaka.",
            "Maksymalna strata określa dopuszczalny spadek każdego z pozostałych ocenianych bonusów w punktach procentowych. Przy bonusie 10% i limicie 5 p.p. dopuszczalne minimum wynosi 5%.",
            "Większy limit dopuszcza większe kompromisy. Wariant nadal musi spełniać reguły ekwipunku, blokady i twarde limity.",
            "Wybór wariantu pokazuje podgląd. Kliknij „Zastosuj wybrany wariant”, aby przenieść go do zestawu. Po ręcznych zmianach buildu może być potrzebna ponowna optymalizacja.",
        ],
        related: ["results", "priorities", "backpack-drifs"],
    },
    {
        id: "backpack-drifs",
        title: "Drify z plecaka",
        intro: "W zaawansowanej konfiguracji Od zera możesz wykorzystać osobne drify zapisane w plecaku.",
        steps: [
            "W plecaku zaznacz drify do użycia w optymalizacji. Drify osadzone w zapasowych przedmiotach nie są brane pod uwagę.",
            "Włącz „Użyj drifów z plecaka”. Optymalizator najpierw wyznaczy docelowy układ, a potem dopasuje posiadane drify tego samego typu i rozmiaru.",
            "Posiadany drif trafia do zestawu ze swoim obecnym poziomem. Raport pokazuje też poziom docelowy do ulepszenia. Brakujący drif pozostaje w wyniku jako kamień do zdobycia.",
            "Po zastosowaniu wyniku użyte drify znikają z plecaka, a zastąpione zwykłe drify do niego wracają. Każda posiadana sztuka może zostać użyta tylko raz.",
        ],
        related: ["backpack", "from-scratch", "results"],
    },
    {
        id: "optimizer-config",
        title: "Zapis i czyszczenie ustawień",
        steps: [
            "„Zapisz” przy priorytetach pobiera plik ustawień optymalizatora: priorytety, cele, limity i opcje trybów. Ekwipunek zapisujesz osobno jako build.",
            "„Wczytaj” zastępuje konfigurację ustawieniami z tego pliku. Po imporcie sprawdź tryb oraz cele i limity dla aktualnego ekwipunku.",
            "„Wyczyść” usuwa wszystkie priorytety, także ukryte przez filtry kategorii. Pozostałe ustawienia trybu zostają zachowane.",
        ],
        related: ["priorities", "builds", "from-scratch"],
    },
];
