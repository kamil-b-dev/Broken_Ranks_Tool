export const reorganizationTopics = [
    {
        id: "reorganization",
        title: "Jak przełożyć posiadane drify?",
        intro: "Reorganizacja szuka miejsca dla wybranej operacji, korzystając z posiadanych drifów.",
        steps: [
            "Wybierz zadanie: Ulepsz drify, Wstaw drif albo Zwolnij miejsce.",
            "Wskaż kamienie do ulepszenia lub wstawienia albo przedmiot, w którym potrzebujesz miejsca.",
            "Sprawdź ochrony bonusów i blokady, a następnie uruchom wyszukiwanie.",
            "Poprawny wynik zostanie zastosowany automatycznie. Przejrzyj instrukcję przełożeń; w razie potrzeby użyj „Cofnij reorganizację”.",
        ],
        related: [
            "reorganization-tasks",
            "reorganization-settings",
            "reorganization-report",
            "locks",
        ],
    },
    {
        id: "reorganization-tasks",
        title: "Ulepszanie i wstawianie drifów",
        steps: [
            "W „Ulepsz drify” wybierz założone kamienie oraz ich docelowe rozmiary i poziomy. Możesz dodać kilka ulepszeń; wszystkie muszą zmieścić się jednocześnie.",
            "Przy jednym ulepszanym kamieniu „Szukaj najwyższego poziomu” szuka do wskazanego maksimum. Wynik może zachować obecny poziom, jeśli wyższego nie udało się zmieścić.",
            "W „Wstaw drif” wskaż konkretne osobne sztuki z plecaka. Ich zaznaczenie „Do optymalizacji” nie jest wymagane dla tego zadania.",
            "Wybierz przedmiot docelowy albo „Dowolny pasujący przedmiot”. Możesz też dołączyć ulepszenia założonych drifów; wszystkie wstawienia i ulepszenia muszą zostać spełnione razem.",
        ],
        related: ["reorganization", "reorganization-settings", "reorganization-report"],
    },
    {
        id: "reorganization-settings",
        title: "Miejsce i ograniczenia przełożeń",
        steps: [
            "„Zwolnij miejsce” wymaga wskazanej liczby wolnych gniazd i wolnej pojemności w wybranym przedmiocie. Gdy ustawisz oba wymagania, wynik musi spełnić oba naraz.",
            "Limit przełożeń wynosi od 1 do 50. Przeniesienie, wstawienie lub odłożenie sztuki liczy się jako 1, zamiana dwóch kamieni jako 2, a ulepszenie bez przeniesienia jako 0.",
            "„Pozwól odkładać założone drify do plecaka” dopuszcza zdjęcie części kamieni. Wybrane ulepszenia i wstawienia nadal są obowiązkowe, a chronione bonusy muszą zachować minimum.",
        ],
        related: ["reorganization-tasks", "locks", "reorganization-report"],
    },
    {
        id: "reorganization-report",
        title: "Instrukcja i cofnięcie reorganizacji",
        steps: [
            "Wykonuj przełożenia w kolejności raportu: wyjęcia, przeniesienia, osadzenia i ulepszenia.",
            "Raport wskazuje dodatkowe miejsca potrzebne w plecaku do tej kolejności operacji. Liczba czynności instrukcji może różnić się od limitu przełożeń, który dotyczy zmian docelowych.",
            "„Cofnij reorganizację” przywraca stan sprzed zastosowania wyniku. Późniejsze zmiany zestawu lub użytych rzeczy w plecaku mogą zablokować cofnięcie; komunikat poda przyczynę.",
        ],
        related: ["reorganization", "reorganization-settings", "history"],
    },
];
