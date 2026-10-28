# Wybór wiązki kandydatów — 28 października 2026

W przeszukiwaniu sąsiedztwa zastąpiono pełne sortowanie kandydatów wyborem najlepszych
24 stanów przez kolejkę priorytetową. Ocena jakości każdego stanu jest odczytywana raz
w ramach selekcji. Dotyczy to rozszerzania grup slotów oraz finalistów ruchów kierowanych.

Zachowano deduplikację po sygnaturze, pełny ranking jakości, rozstrzyganie remisów,
kolejność wybranych stanów i szerokość wiązki. Kandydaci z identyczną oceną i sygnaturą
zachowują kolejność wejściową. Budżety generacji i dalszej weryfikacji pozostają takie same.

Koszt porównań przy wyborze `k` stanów wynosi teraz `O(n log k)` zamiast `O(n log n)`.
Końcowe sortowanie obejmuje wyłącznie zatrzymane `k` stanów. Deduplikacja nadal wymaga
pamięci proporcjonalnej do liczby różnych kandydatów; sama kolejka przechowuje najwyżej `k`.

## Pomiar selekcji

Porównano poprzednie pełne sortowanie i nową selekcję w jednym procesie, z rzeczywistą
oceną jakości oraz produkcyjnym limitem cache 8192. Dla każdej wielkości wykonano trzy
pary pomiarów w naprzemiennej kolejności, ze świeżymi kontekstami. Każda para zwróciła
dokładnie te same 24 sygnatury w tej samej kolejności.

| Liczba stanów | Pełne sortowanie, mediana | Nowa selekcja, mediana |
| --- | ---: | ---: |
| 256 | 3,79 ms | 2,28 ms |
| 2048 | 23,99 ms | 11,75 ms |
| 10 000 | 110,60 ms | 46,73 ms |

Dla 10 000 stanów poprzednia ścieżka wykonywała 13 549 ocen i 227 085 trafień cache;
nowa wykonała 10 000 ocen bez ponownych odczytów cache podczas selekcji. Alokacje spadły
z około 53,02 MB do 39,06 MB. Przy mniejszych partiach alokacje obu ścieżek były zbliżone.

To syntetyczny benchmark etapu wyszukiwania, wykonany na Windows z HotSpot 21.0.7
i agentami testowymi repozytorium. Rozmiary partii są scenariuszami pomiaru, a nie limitem
czy deklaracją typowego ruchu produkcyjnego. Czas CPU mierzony na Windows ma zbyt małą
rozdzielczość dla najkrótszych próbek, więc tabela przedstawia czas zegarowy.

```powershell
cd Broken_Ranks_Tool_Backend
./mvnw.cmd -Dtest=OptimizationBeamSelectionPerformanceBenchmark test
```

Surowe próbki trafiają do `target/beam-selection-benchmark.json`.

## Rzeczywisty build i poprawność

W dwóch osobnych uruchomieniach `OptimizationArcherPerformanceBenchmark` czas przebiegu
prostego wyniósł 4,45 s przed zmianą i 4,02 s po zmianie, a zaawansowanego 2,80 s i 2,18 s.
Są to pojedyncze próbki całych przebiegów, zależne również od JIT i obciążenia komputera.
Nie wyznaczają gwarantowanej poprawy czasu ani kosztu usługi Railway.

Porównanie zapisanych odpowiedzi potwierdziło identyczny build główny, statystyki, cele,
ostrzeżenia, wynik i wszystkie budżety. W obu przypadkach wygenerowano 40 000 stanów
sąsiedztwa, wykonano 66 567 ocen i 311 weryfikacji kalkulatorem. Trafienia cache ocen
zmalały z 1 448 832 do 782 100. Limit cache pozostał równy 8192. Przebiegi z wariantami
oraz Doradcą nadal przeszły swoje sprawdzenia zgodności ze wspólnym kalkulatorem.

Zaliczone testy obejmują dokładną zgodność wyboru i kolejności, remisy, puste wiązki,
brak mutacji stanów i zużycia budżetu przez selekcję, cache, naprawy, LNS i porównanie
małych przestrzeni z niezależnym pełnym przeszukaniem. `spotless:check` zakończył się
kodem 0. Zmiana nie rozszerza przestrzeni wyszukiwania ani nie daje dowodu optimum.
