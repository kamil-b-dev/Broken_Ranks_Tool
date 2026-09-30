# Audyt integracji optymalizatora i zapytań SQL — 2026-10-01

## Potwierdzone i poprawione

1. **Konflikt capa i maksymalizacji.** `useOptimizerPriorities.updateBonus` pozwalał zaznaczyć oba cele, natomiast `OptimizationRequestValidator` odrzuca takie żądanie. Przełączniki obecnie wykluczają się wzajemnie. Import konfiguracji oraz budowanie żądania również usuwają sprzeczne cele; przy sprzecznym zapisanym stanie pierwszeństwo ma cap, następnie własny procent, następnie maksymalizacja.
2. **Nadpisanie zmienionego buildu odpowiedzią trwającej optymalizacji.** `useEquipmentOptimization` sprawdzał tylko, czy rozpoczęto kolejne obliczenie. Zmiana przedmiotu, statystyk postaci albo blokad nie unieważniała odpowiedzi. Obecnie odpowiedź po zmianie danych wejściowych nie jest stosowana, nie udostępnia starych wariantów i zwraca komunikat o konieczności ponownego obliczenia. Testy odtworzyły wszystkie cztery przypadki przed poprawką.
3. **Podpis ograniczeń Doradcy z innych danych niż żądanie.** Podpis używał `configuration.characterStats`, a żądanie korzystało ze wspólnego `requestData.characterStats`. Obecnie podpis powstaje ze statystyk faktycznie wysłanych do backendu.
4. **N+1 przy pobieraniu przedmiotów po ID.** `allowedClasses` jest kolekcją EAGER. Graf encji obejmował `findAll` i `findByCategory`, ale nie `findAllById`, wykorzystywane przez kalkulator i optymalizator. Test na rzeczywistym katalogu wykazał pięć zapytań dla czterech przedmiotów. Dodany graf pobiera przedmioty i klasy jednym zapytaniem; test sprawdza również kompletność klas, powtórzone ID oraz nieistniejące ID.

Benchmark zapisanego buildu Łucznika 12/12 po poprawce: SIMPLE **2,72 s / 4 zapytania**, ADVANCED **2,29 s / 4 zapytania**. Oba przebiegi zwróciły identyczny setup i wynik kalkulatora. W poprzednim pomiarze ten build wykonywał 26 zapytań po wcześniejszym usunięciu odczytów katalogu dla każdego kandydata. Czasy są lokalne i zależą od rozgrzania JVM; nie stanowią pomiaru hostingu.

## Pozostałe niezgodności i miejsca do dalszej pracy

- **Domyślne liczby w profilu defensywnym.** `simpleProfileDefinitions.js` definiuje dla Rycerza i Druida tylko ofensywne 6/5. Zmiana stylu w `SimpleProfileGoalsPanel.jsx` ustawia redukcję bierną, ale zachowuje liczby. Backend i reguły optymalizatora przewidują defensywne domyślne 4/4. Import defensywnego profilu bez liczb także uzupełnia 6/5. Trzeba ujednolicić domyślne wartości, zachowując liczby świadomie ustawione przez użytkownika.
- **Znaczenie przełącznika redukcji biernej w profilu defensywnym.** Reguły opisują włączony przełącznik jako dokładnie jeden drif. `SimpleProfileConfigurationResolver` dla defensywnego Rycerza/Druida rozwija go do miękkiego celu 60%, z maksimum 12 drifów. To rozbieżność algorytmu z dokumentem domenowym; nie należy jej rozstrzygać samą zmianą etykiety.
- **Zastosowanie starych wariantów zaawansowanych po zakończeniu obliczeń.** `OptimizerPanel.handleApplyVariant` sprawdza zgodność buildu i blokad tylko dla Doradcy. Po ręcznej zmianie buildu albo blokad można nadal zastosować stary wariant zaawansowany. Poprawka odrzucająca odpowiedź po zmianach podczas obliczeń nie obejmuje zmian wykonanych już po otrzymaniu odpowiedzi.
- **Ponowne odczyty katalogu przy weryfikacji finalistów Doradcy.** `AdvisorOptimizationService` ładuje wszystkie szablony, a następnie kalkulator odczytuje ponownie bazę dla buildu bazowego i każdego finalisty. `AdvisorFinalistVerifier` w wyszukiwaniu heurystycznym sprawdza do 18 kandydatów; w pełnym wyszukiwaniu limit wynika z liczby kandydatów i czasu. Można współdzielić dane katalogowe w obrębie analizy również dla kalkulatora zwracającego źródła statystyk. Trzeba zachować pełną walidację, prawdziwe źródła wyniku i ustaloną politykę świeżości katalogu.
- **Zakres danych ładowanych przez Doradcę.** `loadTemplates` zawsze czyta wszystkie przedmioty, orby i drify. Orby nie są dobierane przez Doradcę, więc wystarczą te z aktualnego buildu. Przy wyłączonej wymianie przedmiotów wystarczą wyposażone przedmioty. Zawężenie drifów wymaga uwzględnienia dozwolonych ulepszeń i zmiany rozmiaru, również gdy zakup nowych drifów jest wyłączony.

Sprawdzony plan SQL korzysta z istniejącego indeksu `item_template_classes(item_template_id, character_class)`. Potwierdzony problem dotyczył liczby zapytań; nie wymagał dodawania indeksu.

## Weryfikacja

- Frontend: 69 plików, 311 testów, bez błędów; ESLint zmienionych plików oraz pełne `format:check` zakończone kodem 0.
- Backend: 402 testy wraz z benchmarkiem Łucznika, bez błędów; `spotless:apply`, testy i `spotless:check`, kod wyjścia 0.
