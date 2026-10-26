export const progressionTopics = [
    {
        id: "progression",
        title: "Jak zaplanować rozwój ekwipunku?",
        intro: "Ścieżka rozwoju pokazuje kolejne etapy prowadzące do Twojego docelowego zestawu.",
        steps: [
            "Wybierz docelowy build z aktualnego kreatora, biblioteki albo pliku. Wybór pobiera jego kopię; po zmianach w kreatorze wybierz źródło ponownie, aby zaktualizować cel.",
            "Ustaw profesję i docelowy poziom. W razie potrzeby dostosuj odstęp między wymianami przedmiotów i równomierny rozwój statystyk.",
            "Wygeneruj ścieżkę. Rozwijaj kolejne etapy, aby zobaczyć przedmioty oraz instrukcje przenoszenia i ulepszania kamieni.",
            "Zapisz projekt do pliku, aby później wrócić do planowania.",
        ],
        related: ["progression-options", "progression-progress", "progression-files"],
    },
    {
        id: "progression-options",
        title: "Opcje ścieżki rozwoju",
        steps: [
            "„Pomijaj zmianę ekwipunku co X poziom” ogranicza częstotliwość wymian w każdym slocie osobno. Wpisz 0, aby zachować wszystkie etapy. Docelowe przedmioty, epik i legenda pozostają w planie.",
            "„Równomierny rozwój statystyk” wyrównuje postęp bonusów drifów względem ich docelowych wartości. Końcowy zestaw pozostaje taki sam.",
            "„Blokada pod resy” rezerwuje wybrane pierścienie lub naszyjnik. Plan pomija te sloty i nie dolicza statystyk nieokreślonych resów.",
            "W liście zakupów wybierz wszystkie niewykonane etapy lub najbliższe trzy. Odhacz przygotowane rzeczy i pobierz listę TXT. Przygotowanie rzeczy i wykonanie etapu zaznaczasz osobno.",
        ],
        related: ["progression", "progression-progress", "progression-files"],
    },
    {
        id: "progression-progress",
        title: "Etapy i zapamiętany postęp",
        steps: [
            "„Twój poziom” pomaga wskazać najbliższy niewykonany etap. Rozwiń jego kartę, aby sprawdzić rzeczy do przygotowania, ulepszenia i przeniesienia.",
            "„Wykonane” odhacza cały etap. Przygotowanie zakupów zaznaczasz osobno na liście zakupów; samo odhaczenie rzeczy nie kończy etapu.",
            "Poziom i odhaczenia są zapamiętywane w tej przeglądarce. Po powrocie odtwórz plan. Zmieniony cel lub inny plan może wymagać ponownego zaznaczenia postępu; aplikacja pokaże komunikat.",
            "„Pozostałe wolne drify” to kamienie, które po operacjach planu pozostają poza końcowym wyposażeniem. Sprawdź ich rozmiary i poziomy w rozwijanej liście.",
        ],
        related: ["progression", "progression-options", "progression-files"],
    },
    {
        id: "progression-files",
        title: "Projekt ścieżki i eksport etapu",
        steps: [
            "„Pobierz projekt” zapisuje cel, profesję i ustawienia ścieżki, w tym rezerwacje pod resy. Po wczytaniu projektu wygeneruj plan ponownie.",
            "Odhaczenia etapów i zakupów są przechowywane osobno w przeglądarce. Plik projektu przenosi założenia planu, a nie checklistę wykonania.",
            "„Eksportuj ekwipunek etapu” pobiera zwykły plik buildu z końcowym wyposażeniem danego poziomu. Możesz wczytać go w kreatorze.",
        ],
        related: ["progression", "progression-progress", "builds"],
    },
];
