# Sygnatury stanów wyszukiwania — 28 października 2026

Uproszczono tworzenie sygnatury `BuildState`, używanej do deduplikacji i odczytu cache
ocen. Klucz zachowuje dokładnie ten sam zapis i kolejność elementów.

Zamiast budować osobne strumienie i pośrednie napisy dla kolejnych slotów oraz drifów,
kod zapisuje wartości bezpośrednio do jednego `StringBuilder`. Liczbowe ID są dopisywane
bez tworzenia osobnych napisów. Niezmienna, posortowana lista nazw slotów jest współdzielona
przez kopie stanu. Dodanie nowego slotu unieważnia ją tylko w zmienionej kopii.

Rozmieszczenie drifów nadal jest kopiowane i chronione przed zewnętrzną modyfikacją.
Zmiany kontrolowane przez `setPlacement` pozostają widoczne we wcześniej pobranych widokach
list. Nie zmieniono kryteriów jakości, budżetów ani zbioru generowanych kandydatów.

## Pomiar tworzenia kandydata

Benchmark obejmuje kopię stanu z 12 slotami i 36 drifami, zmianę jednego gniazda oraz
utworzenie i odczyt skrótu sygnatury. Po 5000 iteracji rozgrzewki wykonuje pięć serii
po 50 000 iteracji. Każda seria sprawdza sumę skrótów względem oczekiwanego tekstu,
a źródłowy stan pozostaje niezmieniony.

| Pomiar na operację, próbka mediany CPU | Przed | Po |
| --- | ---: | ---: |
| Alokacje obiektów | 9816 B | 2776 B |
| Czas CPU | 5,31 µs | 2,19 µs |
| Czas zegarowy | 5,17 µs | 2,30 µs |

W tej próbie oznacza to około 72% mniej alokacji i 59% mniej CPU dla samej mierzonej
operacji. Pomiar wykonano na Windows z HotSpot 21.0.7 i agentami testowymi repozytorium.

```powershell
cd Broken_Ranks_Tool_Backend
./mvnw.cmd -Dtest=BuildStatePerformanceBenchmark test
```

Wyniki trafiają do `target/build-state-benchmark.json`. Lokalne próbki porównawcze
zachowano w `tmp/build-state-before.json` oraz `tmp/build-state-after.json`.

## Wynik całego optymalizatora i ograniczenia

W osobnym uruchomieniu `OptimizationArcherPerformanceBenchmark`, porównanym z ostatnim
wynikiem po usprawnieniu wyboru wiązki, przebieg prosty zmienił czas z 4,02 s na 3,20 s,
a zaawansowany z 2,18 s na 1,62 s. Zapisana odpowiedź zachowała identyczny build,
statystyki, budżety i wszystkie liczniki raportu wyszukiwania poza czasami.

Są to pojedyncze pomiary całych przebiegów. W uruchomieniu łączącym mikrobenchmark
i test optymalizatora czasy wyniosły odpowiednio 4,31 s i 2,88 s, co pokazuje wpływ
rozgrzewki JVM i wcześniejszego obciążenia. Wyniki nie wyznaczają gwarantowanej poprawy
czasu każdego żądania ani rachunku Railway. Najbardziej powtarzalny efekt tej zmiany
to mniejsza ilość tworzonych obiektów pomocniczych.

Testy sprawdzają dokładny zapis sygnatur, puste gniazda i sloty, kolejność nazw,
niezależność rozgałęzionych kopii, dodawanie i zastępowanie slotów, duże ID oraz
dotychczasowy zapis brakującego ID w wewnętrznym modelu. Nie rozszerza to walidacji
wejścia o dopuszczanie brakujących szablonów. Testy optymalizacji, niezależnego pełnego
przeszukania i reorganizacji oraz kontrola Spotless przeszły na Windows. Test korzystający
z natywnego CP-SAT (`OptimizationExhaustiveSearchTests`) przeszedł osobno w Linuksie
z kodem 0. Na Windows ten test odtworzył lokalną awarię `msvcp140.dll`; pozostałe testy
dokończono bez ponawiania zaliczonych wcześniej modułów.
