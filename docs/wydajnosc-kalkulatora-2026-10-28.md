# Koszt przeliczeń kalkulatora — 28 października 2026

W lokalnym benchmarku przygotowanego kalkulatora dla eksportu Łucznika zmiana zmniejszyła
alokacje obiektów o około **17%** i medianę czasu CPU o **12,5%**. Statystyki przed i po
zmianie były identyczne.

| Pomiar na przeliczenie | Przed | Po |
| --- | ---: | ---: |
| Czas CPU, mediana | 187,50 µs | 164,06 µs |
| Alokacje w wątku obliczeń | 177 936 B | 147 632 B |
| Czas zegarowy w próbce mediany CPU | 191,80 µs | 174,72 µs |

## Zmiana

Wartość drifa jest obliczana przez pomnożenie przyrostu przez liczbę jego wystąpień,
z zachowaniem podwójnych przyrostów za poziomy 19–21. Zastępuje to kolejne dodawania
`BigDecimal`, zachowując dokładną arytmetykę dziesiętną i końcowe zaokrąglenie HALF_UP.

Procesor drifów przekazuje zaokrągloną wartość liczbową i informację o procentach
bezpośrednio do akumulatora. Pomija formatowanie pojedynczego drifa do tekstu i ponowne
parsowanie tego tekstu. Format odpowiedzi API i objaśnienia źródeł pozostają zachowane.
Zmiana nie dotyczy reguł gry, rankingu ani budżetów wyszukiwania.

## Odtworzenie pomiaru

W katalogu `Broken_Ranks_Tool_Backend`, z JDK 21:

```powershell
./mvnw.cmd -Dtest=EquipmentCalculationPerformanceBenchmark test
```

Benchmark korzysta z katalogu SQLite i pliku `optimization/archer-12-12-build.json`.
Przygotowuje szablony raz, wykonuje 1000 przeliczeń rozgrzewki, następnie pięć serii
po 2000 przeliczeń. Każdy mierzony wynik jest formatowany i porównywany z wynikiem
zwykłego kalkulatora. Pomiar obejmuje też to formatowanie i porównanie. Czas CPU oraz
alokacje dotyczą bieżącego wątku, bez startu Springa i odczytu katalogu.

Próbę wykonano na Windows, HotSpot 21.0.7, z konfiguracją agentów testowych repozytorium.
Surowe próbki zapisano lokalnie w `tmp/calculator-before.json` i `tmp/calculator-after.json`;
nowe uruchomienie zapisuje `target/calculator-benchmark.json`.

Jest to pomiar jednego buildu i części obsługi żądania. Nie wyznacza procentowej oszczędności
całego optymalizatora ani rachunku Railway. Mniejsze alokacje ograniczają ilość pracy GC;
rzeczywisty efekt na CPU i pamięć usługi należy zmierzyć po wdrożeniu przy jej normalnym ruchu.

## Sprawdzenie poprawności

Testy porównują wartości drifów z niezależnym naliczaniem krok po kroku dla każdego poziomu
1–21, również dla ujemnych wartości, procentów i granic zaokrągleń. Akumulator jest sprawdzany
pod kątem zgodności statystyk i objaśnień oraz odrzucania wartości nieskończonych i przepełnień.

Pełny zestaw backendu uruchomiony w Linuksie, z Temurin 21.0.12.1, zaliczył 810 testów
bez błędów, w tym testy solvera CP-SAT. Lokalny HotSpot 21.0.7 na Windows przerywał proces
w natywnym `msvcp140.dll` podczas testu CP-SAT; awaria powtórzyła się też przy uruchomieniu
tego testu osobno. Benchmark kalkulatora i jego bezpośrednie testy przeszły na Windows.

Kontrole pokrycia JaCoCo przeszły w Linuksie. Całe `clean verify` w kontenerze zakończyło się
jednak kodem 1 na Spotless: zamontowane pliki robocze Windows miały CRLF, a kontener oczekiwał
LF. Osobne `spotless:check` na Windows zakończyło się kodem 0 dla wszystkich 421 plików.
Kontrola `npm run format:check` frontendu również przeszła. Wyników tych nie należy opisywać
jako pojedynczego zakończonego powodzeniem przebiegu `clean verify`.
