# Audyt integracji optymalizatora i zapytań SQL — 2026-10-01

## Potwierdzone i poprawione

1. **Konflikt capa i maksymalizacji.** `useOptimizerPriorities.updateBonus` pozwalał zaznaczyć oba cele, natomiast `OptimizationRequestValidator` odrzuca takie żądanie. Przełączniki obecnie wykluczają się wzajemnie. Import konfiguracji oraz budowanie żądania również usuwają sprzeczne cele; przy sprzecznym zapisanym stanie pierwszeństwo ma cap, następnie własny procent, następnie maksymalizacja.
2. **Nadpisanie zmienionego buildu odpowiedzią trwającej optymalizacji.** `useEquipmentOptimization` sprawdzał tylko, czy rozpoczęto kolejne obliczenie. Zmiana przedmiotu, statystyk postaci albo blokad nie unieważniała odpowiedzi. Obecnie odpowiedź po zmianie danych wejściowych nie jest stosowana, nie udostępnia starych wariantów i zwraca komunikat o konieczności ponownego obliczenia. Testy odtworzyły wszystkie cztery przypadki przed poprawką.
3. **Podpis ograniczeń Doradcy z innych danych niż żądanie.** Podpis używał `configuration.characterStats`, a żądanie korzystało ze wspólnego `requestData.characterStats`. Obecnie podpis powstaje ze statystyk faktycznie wysłanych do backendu.
4. **N+1 przy pobieraniu przedmiotów po ID.** `allowedClasses` jest kolekcją EAGER. Graf encji obejmował `findAll` i `findByCategory`, ale nie `findAllById`, wykorzystywane przez kalkulator i optymalizator. Test na rzeczywistym katalogu wykazał pięć zapytań dla czterech przedmiotów. Dodany graf pobiera przedmioty i klasy jednym zapytaniem; test sprawdza również kompletność klas, powtórzone ID oraz nieistniejące ID.

Benchmark zapisanego buildu Łucznika 12/12 po zakończeniu poprawek: SIMPLE **2,43 s / 4 zapytania**, ADVANCED **2,11 s / 4 zapytania**. Oba przebiegi zwróciły identyczny setup i wynik kalkulatora. W poprzednim pomiarze ten build wykonywał 26 zapytań po wcześniejszym usunięciu odczytów katalogu dla każdego kandydata. Czasy są lokalne i zależą od rozgrzania JVM; nie stanowią pomiaru hostingu.

## Poprawki wykonane po audycie

- **Domyślne liczby w profilu defensywnym.** Frontend, import i formularz używają obecnie 4/4 dla defensywnego Rycerza i Druida. Zmiana stylu aktualizuje liczby odpowiadające domyślnym wartościom poprzedniego stylu; niestandardowe liczby pozostają zachowane. Brakujące wartości i domyślna redukcja bierna są normalizowane według stylu, a jawne wyłączenie redukcji pozostaje zachowane.
- **Znaczenie przełącznika redukcji biernej w profilu defensywnym.** Backend wymaga dokładnie jednego drifa, zgodnie z regułami. Usunięto ukryty cel 60% i możliwość dobrania do 12 drifów przez ten przełącznik. Styl defensywny nadal nadaje redukcji biernej wyższy priorytet.
- **Zastosowanie starych wariantów zaawansowanych po zakończeniu obliczeń.** Odpowiedź zawiera podpis bazowego buildu, statystyk i blokad oraz automatycznie zastosowanego wyniku. Panel sprawdza je także w trybie zaawansowanym. Ręczna zmiana przedmiotu, statystyk postaci lub blokad blokuje zastosowanie starego wariantu. Nadal można przełączać warianty z tego samego obliczenia.
- **Ponowne odczyty katalogu przy weryfikacji finalistów Doradcy.** Doradca przygotowuje kalkulator ze źródłami na raz pobranych szablonach. Build bazowy i każdy finalista przechodzą pełny wspólny kalkulator oraz jego walidację bez dalszych zapytań. Metadane obejmują tylko kamienie z konkretnego setupu, a nie cały katalog kandydatów. Szablony nie są współdzielone między niezależnymi analizami.
- **Zakres danych ładowanych przez Doradcę.** Bez wymiany przedmiotów pobierane są tylko wyposażone przedmioty. Orby są pobierane tylko po identyfikatorach z obecnego buildu. Bez zakupu drifów wystarczają posiadane szablony, również do ulepszania poziomów. Włączenie zakupów lub wymiany przedmiotów nadal zapewnia dostęp do odpowiedniego katalogu kandydatów.

Test na rzeczywistym katalogu: analiza z jednym przedmiotem, drifem i orbem wykonała **3 zapytania**, przeliczyła **8 finalistów**, a wynik główny i wszystkie prezentowane warianty były identyczne ze świeżym przeliczeniem zwykłą ścieżką kalkulatora. Przenoszenie i ulepszanie posiadanych drifów oraz włączone zakupy mają osobne testy zakresu odczytów.

Sprawdzony plan SQL korzysta z istniejącego indeksu `item_template_classes(item_template_id, character_class)`. Potwierdzony problem dotyczył liczby zapytań; nie wymagał dodawania indeksu.

## Weryfikacja

- Frontend: sprawdzono wszystkie 321 testów w 69 plikach. Po rozszerzeniu odpowiedzi o podpisy zaktualizowano oczekiwanie testu providera i ponownie uruchomiono cały jego moduł: 13/13 testów przechodzi. Pozostałe 68 plików przeszło w pełnym przebiegu. ESLint zmienionych plików oraz pełne `format:check` zakończone kodem 0.
- Backend: 407 testów wraz z pomiarem SQL Doradcy i benchmarkiem Łucznika, bez błędów; `spotless:apply`, testy i `spotless:check`, kod wyjścia 0.
