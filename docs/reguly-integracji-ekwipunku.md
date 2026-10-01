# Zasady integracji ekwipunku w aplikacji

Dokument opisuje zachowanie edytora, API, kalkulatora i wspólnych walidatorów. Reguły gry są w [regułach ekwipunku](reguly-ekwipunku.md), a zachowanie algorytmów w [regułach optymalizatora](reguly-optymalizatora.md) i [regułach Doradcy](reguly-doradcy.md).

## Spójność danych

- Edytor, kalkulator i optymalizacja korzystają z tych samych reguł slotów, gniazd, pojemności, poziomów, unikalności bonusów, żywiołów i orbów.
- Pusty slot jest poprawny, ale nie może zawierać osieroconych kamieni ani poziomów.
- `null` na pozycji orba oznacza brak orba. Po pustej pozycji nie może wystąpić kolejny orb.
- Bazowe statystyki postaci są liczbami całkowitymi z zakresu 0–50 000. Obsługiwane nazwy to `Siła`, `Zręczność`, `Moc`, `Wiedza`, `PŻ`, `Mana`, `Kondycja` i `Obrażenia`; kalkulator rozpoznaje wielkość liter i scala wartości ze statystykami przedmiotów pod nazwą kanoniczną.
- Poziom kamienia może dotyczyć wyłącznie zajętej pozycji. Klucze mapy poziomów drifów mają postać `0`, `1`, … bez znaków dodatkowych ani zer wiodących. Drif poza dostępnymi gniazdami jest niepoprawny także wtedy, gdy inne gniazdo pozostaje puste. Pozycje wbudowanych drifów nie mogą zawierać luk.
- Import z pliku, biblioteki i eksportu z gry przechodzi wspólną walidację wyposażenia. Starsze tablice poziomów drifów oraz mapy poziomów orbów są po walidacji przekształcane do kontenerów wymaganych przez API: odpowiednio mapy i tablicy.
- Edytor nie publikuje poziomów usuniętych kamieni. Wskazanie użytej pojemności dotyczy tylko aktywnych gniazd zwykłych drifów; wbudowane drify nie zużywają tej pojemności. Drify z gniazd zamkniętych po obniżeniu gwiazdek są usuwane również ze stanu edytora.
- Zmiana buildu, reset wyniku albo przywrócenie zapisanego przeliczenia unieważnia wcześniejsze odpowiedzi kalkulatora i ich błędy. Wskaźnik trwającego przeliczenia nie może pozostać aktywny po unieważnieniu żądania.
- Panel postaci inicjalizuje widok z zapisanej konfiguracji. Otwarcie panelu i synchronizacja importu nie zastępują istniejących statystyk wartościami domyślnymi; ręczna zmiana poziomu lub punktów publikuje nowy rozkład. Importowane punkty rozwoju są skończonymi nieujemnymi liczbami całkowitymi, ograniczonymi budżetem poziomu (maksymalnie 556 punktów).
- Wynik optymalizacji zawiera statystyki policzone dla zwróconego setupu, bez dodatkowego żądania użytkownika.

## Determinizm kalkulatora

- Dodatkowe punkty z gwiazdek są rozdzielane osobno między statystyki bazowe i odporności.
- Pula jest zaokrągloną sumą wartości grupy pomnożoną przez premię gwiazdek.
- Punkty są rozdzielane możliwie równo w stabilnej kolejności nazw.
- Identyczne wejście zawsze daje identyczny wynik.
- Kalkulator uwzględnia przedmioty, gwiazdki, orby, drify, statystyki postaci i globalną karę za powtórzenia.
- Podczas wyszukiwania tryb „od zera” korzysta ze wspólnego kalkulatora z szablonami przedmiotów, orbów i katalogiem drifów przygotowanymi raz na dane uruchomienie. Kolejni kandydaci oraz warianty tego samego buildu nie pobierają ponownie szablonów z bazy; zachowują pełną walidację i zasady naliczania statystyk. Dane przygotowanego kalkulatora nie są współdzielone pomiędzy niezależnymi uruchomieniami. Wynik końcowy jest ponownie przeliczany zwykłą ścieżką kalkulatora.
- Doradca pobiera szablony raz na analizę. Pełny kalkulator przelicza build bazowy i finalistów na tych samych szablonach, z pełną walidacją i metadanymi obejmującymi tylko kamienie użyte w danym setupie. Kolejne analizy ponownie odczytują katalog; nie korzystają ze wspólnego cache szablonów. Zamrożenie danych dotyczy wyłącznie czasu jednego uruchomienia.

## Brakujące poziomy

Dla brakującego poziomu drifa edytor i backend przyjmują poziom 1. Jawny poziom spoza zakresu nie jest normalizowany i powoduje odrzucenie żądania.

## Mapa implementacji

Backend, względem `Broken_Ranks_Tool_Backend/src/main/java/pl/brokenranks/tool/broken_ranks_tool/`:

| Obszar | Źródła |
| --- | --- |
| Kategorie slotów, orby, wbudowane drify, kary | `equipment/domain/rules/EquipmentRulesRegistry.java` |
| Gwiazdki, rozmiary, moce i capy | `equipment/domain/enums/ITEM_STAR.java`, `DRIF_SIZE.java`, `ORB_SIZE.java`, `DRIF_BONUS_TYPE.java`, `RARITY.java` |
| Poziomy, pojemność, moc | `equipment/service/validator/UpgradeLevelPolicy.java`, `equipment/domain/rules/DrifPowerRules.java` |
| Dopasowanie i walidacja kamieni | `equipment/service/validator/EquipmentPlacementRules.java`, `DrifSecurityValidator.java`, `OrbSecurityValidator.java` |
| Statystyki i naliczanie kary | `equipment/service/calculator/processor/ItemStatProcessor.java`, `DrifStatProcessor.java`, `OrbStatProcessor.java`, `equipment/service/calculator/DrifCounter.java`, `StatsAccumulator.java` |
| Wartość drifa | `equipment/domain/rules/DrifValueCalculator.java` |
| Blokady | `optimization/locking/OptimizationLockService.java` |
| Końcowa kontrola | `optimization/engine/result/OptimizationFinalResultValidator.java`, `OptimizationSetupMapper.java` |

Frontend, względem `Broken_Ranks_Tool_Frontend/src/`:

`shared/domain/equipment/equipmentRules.js`; `features/builder/gear-slot/gearSlotDomain.js`, `StandardDrifSlot.jsx`, `BuiltInDrifSlots.jsx`, `useGearSlot.js`, `useGearSlotDragDrop.js`; `features/optimizer/OptimizerSettingsPanel.jsx`, `OptimizerLocksColumn.jsx`.
