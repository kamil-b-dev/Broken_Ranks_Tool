export const advisorTopics = [
    {
        id: "advisor",
        title: "Jak korzystać z Doradcy?",
        intro: "Doradca proponuje konkretne działania poprawiające Twój obecny zestaw.",
        steps: [
            "Przygotuj aktualny zestaw w kreatorze i wybierz Doradcę w optymalizatorze.",
            "Wskaż bonus do poprawy oraz sprawdź ochrony pozostałych bonusów.",
            "Wybierz dozwolone zmiany, np. ulepszanie drifów lub podnoszenie gwiazdek. Zablokuj rzeczy, których nie chcesz zmieniać.",
            "Uruchom analizę i porównaj proponowane działania oraz ich efekty.",
        ],
        note: "Najmniejsza ingerencja ogranicza zmiany po osiągnięciu celu. Najlepszy wynik stawia na większy efekt. Brak znalezionej porady nie zawsze oznacza, że poprawa jest niemożliwa.",
        related: ["advisor-goals", "advisor-changes", "advisor-search", "optimizer"],
    },
    {
        id: "advisor-goals",
        title: "Cel i strategia Doradcy",
        steps: [
            "„Największa poprawa” szuka największego zysku głównego bonusu. „Osiągnij wartość” wskazuje wynik docelowy, a „Zyskaj określoną liczbę p.p.” poprawę względem obecnego wyniku. Przykład: przy obecnych 20% cel 25% i przyrost 5 p.p. wskazują tę samą wartość. Sprawdź jednostkę przy polu przed uruchomieniem analizy.",
            "„Nie premiuj wzrostu ponad zadany cel” kończy premiowanie głównego bonusu na celu. Wyższy wynik nadal jest dopuszczalny, ale sam nadmiar nie poprawia oceny planu.",
            "„Najmniejsza ingerencja” po osiągnięciu celu preferuje mniej zakupów i ulepszeń. „Najlepszy wynik” stawia na większy użyteczny efekt, nawet przy większej liczbie zmian.",
        ],
        related: ["advisor", "locks", "advisor-search"],
    },
    {
        id: "advisor-changes",
        title: "Dozwolone zmiany i zakupy",
        steps: [
            "„Profil buildu” dobiera profil zamienników przedmiotów: magiczny lub fizyczny. „Automatyczny” rozpoznaje go na podstawie obecnego ekwipunku i atrybutów postaci.",
            "Zaznacz, czy Doradca może podnosić gwiazdki, ulepszać drify oraz kupować drify lub przedmioty. Wyłączone opcje nie pojawią się w proponowanych działaniach.",
            "Przekładanie i zamiana posiadanych drifów są dostępne również przy wyłączonych zakupach i ulepszeniach. Blokady pozwalają zachować wybrane miejsca.",
            "Zakres zakupów drifów dopuszcza tylko główny mod, główny i chronione mody albo dowolny mod. Szerszy zakres daje więcej sposobów poprawy i utrzymania ochron.",
        ],
        related: ["advisor-goals", "locks", "advisor-search"],
    },
    {
        id: "advisor-search",
        title: "Limit działań i czas Doradcy",
        steps: [
            "Limit od 1 do 10 działań określa długość planu. Przeniesienie drifa, zamiana dwóch drifów, zakup lub ulepszenie jednej rzeczy liczą się jako jedno działanie.",
            "Budżet 3 lub 6 sekund ogranicza wyszukiwanie. Więcej czasu lub działań może ujawnić inne plany, ale wynik nadal może być najlepszym znalezionym, bez potwierdzenia najlepszego możliwego.",
            "„Zatrzymaj i pokaż znalezione plany” kończy szukanie i zwraca zweryfikowane propozycje. Lista może być pusta, jeśli żadna poprawa nie została jeszcze potwierdzona.",
            "Po zmianie ekwipunku, atrybutów lub blokad uruchom analizę ponownie. Stara propozycja może już nie pasować do zmienionego zestawu.",
        ],
        related: ["advisor", "results", "reorganization-settings"],
    },
];
