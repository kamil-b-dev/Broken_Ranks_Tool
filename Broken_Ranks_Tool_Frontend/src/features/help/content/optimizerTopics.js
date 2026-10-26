export const optimizerTopics = [
    {
        id: "optimizer",
        title: "Który tryb optymalizatora wybrać?",
        intro: "Wybierz tryb zgodnie z tym, co chcesz zmienić w swoim zestawie.",
        steps: [
            "Od zera: szukaj rozmieszczenia i poziomów drifów na wybranych przedmiotach. Przedmioty, gwiazdki i orby wybierasz samodzielnie w kreatorze.",
            "Doradca: szukaj ulepszeń aktualnego zestawu w granicach dozwolonych przez Ciebie zmian.",
            "Reorganizacja: przełóż posiadane drify, aby zmieścić ulepszenie, wstawić kamień lub zwolnić miejsce.",
        ],
        note: "Tryb prosty korzysta z gotowych ustawień dla wybranej profesji. W trybie zaawansowanym sam ustawiasz priorytety bonusów, cele procentowe i limity drifów.",
        related: ["from-scratch", "advisor", "reorganization"],
    },
    {
        id: "from-scratch",
        title: "Optymalizacja od zera",
        intro: "Ten tryb dobiera rozmieszczenie i poziomy drifów. Przedmioty, gwiazdki i orby przygotuj wcześniej w kreatorze.",
        steps: [
            "W trybie prostym wybierz profesję i preferowaną liczbę drifów obrażeń oraz celności. Są to preferencje — wynik może użyć innej liczby.",
            "W trybie zaawansowanym ustaw priorytety bonusów, minimalną i maksymalną liczbę drifów oraz dozwolone rozmiary.",
            "„Dąż do capa” i „Wymuś %” wskazują pożądane wartości bonusu. Jeśli nie uda się ich osiągnąć, otrzymasz najlepszy znaleziony poprawny zestaw z ostrzeżeniem.",
            "Sprawdź blokady i uruchom optymalizację. Poprawny wynik zostanie od razu zastosowany do zestawu.",
        ],
        related: ["simple-profile", "priorities", "locks", "results"],
    },
    {
        id: "locks",
        title: "Blokady i ochrony",
        steps: [
            "Zablokuj slot, aby zachować cały przedmiot z jego gwiazdkami, orbem i drifami.",
            "Zablokuj pojedynczy drif, aby zachować go na tym samym poziomie i w tym samym gnieździe.",
            "W Doradcy i Reorganizacji chroń bonusy, które nie powinny się pogorszyć. Możesz dopuścić określoną stratę; wynik musi zachować wyznaczone minimum.",
            "Dopuszczalna strata liczy się najwyżej od capa, czyli limitu przydatnej wartości bonusu. Przykład: przy capie 60%, wyniku 62% i stracie 3 punktów procentowych minimum wynosi 57%.",
        ],
        related: ["from-scratch", "advisor", "reorganization"],
    },
    {
        id: "results",
        title: "Wynik optymalizacji",
        steps: [
            "Sprawdź status i ostrzeżenia. Nieosiągnięty cel procentowy może towarzyszyć poprawnemu wynikowi; raport pokaże brakującą wartość.",
            "W trybie Od zera i w Reorganizacji poprawny wynik trafia do zestawu automatycznie. W Doradcy wybierz propozycję i kliknij jej przycisk zastosowania.",
            "Jeśli są dostępne warianty, porównaj ich bonusy i zmiany. Samo wybranie wariantu pokazuje podgląd; użyj przycisku zastosowania, aby zmienić zestaw.",
            "W Reorganizacji przejrzyj kolejność przełożeń i ulepszeń. W Doradcy sprawdź listę działań oraz zyski i straty bonusów.",
        ],
        related: ["optimizer", "locks", "backpack-drifs"],
    },
    {
        id: "labels",
        title: "Nazwy modów",
        steps: [
            "„Opis bonusu” pokazuje nazwę efektu, a „Nazwa drifa” nazwę kamienia. Wybierz sposób, który łatwiej rozpoznajesz w ustawieniach i raportach.",
            "Wyszukiwanie modów rozpoznaje oba rodzaje nazw. Wybór jest zapamiętywany w przeglądarce i nie zmienia obliczeń ani konfiguracji zestawu.",
        ],
        related: ["priorities", "advisor", "results"],
    },
];
