export const buildTopics = [
    {
        id: "builds",
        title: "Jak zapisać lub wczytać zestaw?",
        intro: "Zapisz zestaw, aby później do niego wrócić lub porównać go z innym.",
        steps: [
            "Kliknij „Zapisz lokalnie”. Zestaw znajdziesz w widoku Buildy lokalne.",
            "Aby zachować kopię poza przeglądarką, wyeksportuj zapisany zestaw do pliku.",
            "Użyj „Wczytaj build”, aby otworzyć plik z aplikacji lub eksport z Broken HUD. Na telefonie opcje zapisu i wczytania są w menu Build.",
            "Bieżąca praca jest zachowywana jako szkic w przeglądarce. „Zapisz lokalnie” tworzy osobny wpis w bibliotece, do którego możesz wrócić niezależnie od dalszych zmian szkicu.",
        ],
        note: "Zapis lokalny pozostaje w tej przeglądarce. Pobierz plik, jeśli chcesz przenieść zestaw na inne urządzenie lub zachować kopię po usunięciu danych przeglądarki.",
        related: ["library", "library-backup", "optimizer-config"],
    },
    {
        id: "library",
        title: "Buildy lokalne",
        steps: [
            "Wybierz zapisany build, aby go wczytać, pobrać do pliku lub zmienić jego nazwę.",
            "Zaznacz 2 lub 3 buildy do porównania. Przełączaj zakładki ekwipunku, postaci i orbów oraz drifów. Włącz „W tabelach: tylko różnice”, aby ukryć zgodne wartości.",
            "„Nadpisz” zastępuje zapisany build aktualnym zestawem. Nadpisanie i usunięcie wymagają drugiego kliknięcia potwierdzającego.",
        ],
        related: ["comparison", "library-backup", "builds"],
    },
    {
        id: "library-backup",
        title: "Kopia i import biblioteki",
        steps: [
            "„Pobierz całą bibliotekę” zapisuje wszystkie lokalne buildy w jednym pliku.",
            "Przy każdym wpisie wybierz dodanie, dodanie kopii, pominięcie albo zastąpienie wskazanego buildu. Zastąpienie podmieni zawartość istniejącego zapisu.",
            "Biblioteka mieści 10 buildów. Podgląd pokazuje liczbę po imporcie; przy przekroczeniu limitu pomiń wpisy lub zastąp istniejące. Zatwierdź przyciskiem „Importuj wybrane buildy”.",
        ],
        related: ["builds", "library", "comparison"],
    },
    {
        id: "comparison",
        title: "Porównywanie buildów",
        steps: [
            "Zaznacz 2 lub 3 zapisane buildy. Zakładki pokazują wyposażenie, postać i orby oraz skład drifów; „W tabelach: tylko różnice” ukrywa zgodne wiersze.",
            "Kolumny pokazują wartości zapisane dla każdego buildu. Podświetlenie najlepszej wartości uwzględnia capy i ujemny kierunek redukcji zużycia zasobów.",
            "„—” oznacza brak zapisanej statystyki. Wczytaj taki build, przelicz statystyki i nadpisz zapis, aby uzupełnić dane do porównania.",
        ],
        related: ["library", "stats", "builds"],
    },
];
