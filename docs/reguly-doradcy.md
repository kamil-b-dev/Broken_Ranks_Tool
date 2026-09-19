# Zasady trybu Doradcy

Dokument opisuje uzgodniony zakres, ocenę planów i wymagania dla rozwoju trybu `ADVISOR`. Reguły ekwipunku znajdują się w [regułach ekwipunku](reguly-ekwipunku.md), a wspólne zasady optymalizacji w [regułach optymalizatora](reguly-optymalizatora.md). Przed zmianą Doradcy należy przeczytać wszystkie trzy dokumenty.

## 1. Rola i zakres

Doradca zaczyna od aktualnego buildu użytkownika i proponuje możliwe do wykonania plany jego ulepszenia. Nie buduje dowolnego zestawu od zera i nie stosuje rekomendacji automatycznie.

Zawsze dozwolone są przełożenie posiadanego drifa do wolnego gniazda oraz zamiana miejscami dwóch posiadanych drifów. Zależnie od ustawień użytkownik może dodatkowo zezwolić na:

- podnoszenie gwiazdek przedmiotów,
- ulepszanie posiadanych drifów,
- zakup drifa do wolnego gniazda,
- wymianę przedmiotu.

Doradca nie usuwa posiadanych drifów, nie obniża ich poziomów, nie przekłada ani nie ulepsza drifów wbudowanych i nie wymienia orbów. Blokada slotu wyklucza wszystkie zmiany w tym slocie. Blokada drifa zachowuje go na wskazanej pozycji.

## 2. Cel, ochrony i capy

Użytkownik wskazuje główny mod oraz może ustawić wartość docelową, wymagany przyrost albo maksymalizację. Aktywne ochrony pozostałych modów są ograniczeniami twardymi: plan niespełniający ochrony nie może zostać pokazany niezależnie od wybranej strategii wyniku.

Cap jest granicą użyteczności moda:

- wzrost ponad cap nie poprawia oceny planu,
- punkty ponad cap nie są chronione,
- minimum ochrony liczy się od wartości ograniczonej do capa,
- przy dopuszczalnej stracie odejmuje się ją od użytecznej wartości, a nie od nadmiaru ponad cap,
- cel przekraczający cap jest ograniczany do capa i wymaga czytelnej informacji dla użytkownika,
- dla modów o ujemnym kierunku stosuje się analogiczne zasady po przeliczeniu na kierunek „większy efekt jest lepszy”.

Przykład: dla capa 60%, aktualnej wartości 62% i dopuszczalnej straty 3 p.p. chronione minimum wynosi 57%, a nie 59%.

## 3. Strategie wyboru planu

Użytkownik wybiera jedną z dwóch strategii. Strategia wpływa tylko na ranking planów, które wcześniej przeszły wszystkie ochrony, blokady i reguły domenowe.

### Najmniejsza ingerencja (`MINIMUM_CHANGE`)

Po osiągnięciu celu preferowane są kolejno:

1. mniej zakupów i ulepszeń,
2. mniejszy łączny wzrost poziomów,
3. mniej działań,
4. lepszy wynik głównego moda.

Jeżeli żaden plan nie osiąga celu, ważniejszy jest większy postęp głównego moda, a ingerencja rozstrzyga wynik pomocniczo. Jest to strategia domyślna.

### Najlepszy wynik (`BEST_RESULT`)

Preferowane są kolejno:

1. największa użyteczna wartość głównego moda, nie wyższa niż cap,
2. mniej zakupów i ulepszeń,
3. mniejszy łączny wzrost poziomów,
4. mniej działań.

Znacznie droższy plan może wygrać nawet dla niewielkiej użytecznej poprawy. Nie może to jednak ukrywać tańszych niezdominowanych alternatyw.

## 4. Działania i budżet

Użytkownik może ustawić limit od 1 do 10 działań; wartość domyślna to 3. Jednym działaniem jest:

- przełożenie jednego drifa do wolnego gniazda,
- zamiana miejscami dwóch drifów,
- podniesienie jednego przedmiotu bezpośrednio do wybranej liczby gwiazdek,
- ulepszenie jednego drifa bezpośrednio do wybranego istotnego poziomu,
- zakup jednego drifa,
- wymiana jednego przedmiotu.

Istotne docelowe poziomy drifów to 6, 11, 16 i 21, z ograniczeniem wynikającym z rozmiaru drifa. Przy ulepszaniu pomija się progi nie wyższe od aktualnego poziomu. Poziom 1 nie jest kandydatem zakupu, ponieważ przy tym samym zużyciu pojemności co poziom 6 daje słabszy efekt.

Analiza może trwać maksymalnie 5 sekund. Limit czasu i limit ocenionych stanów mają chronić aplikację przy dużej przestrzeni oraz większym ruchu. Maksymalnie jedna analiza Doradcy powinna być aktywna na instancję aplikacji; kolejne uruchomienie tego samego użytkownika anuluje jego poprzednią analizę.

## 5. Przedmioty zastępcze

Kandydat musi pasować do slotu i profilu oraz zachowywać poprawność pozostawionych kamieni. Dla uproszczenia zgodnego z danymi gry przyjmuje się, że przedmiot o większej pojemności nie może być gorszy od przedmiotu o mniejszej pojemności. Dlatego:

1. ustala się największą pojemność wśród zgodnych zamienników,
2. odrzuca się kandydatów o mniejszej pojemności,
3. wśród przedmiotów o tej samej maksymalnej pojemności uwzględnia się bonus do drifów, statystyki głównego moda i chronione mody,
4. zachowuje się niezdominowane warianty zamiast arbitralnego limitu trzech przedmiotów.

## 6. Alternatywy i jakość wyniku

Doradca zwraca maksymalnie 6 różnych, niezdominowanych planów. W miarę dostępności powinny się wśród nich znaleźć:

- plan najlepszy według wybranej strategii,
- plan z najlepszym bezwzględnym wynikiem,
- plan o najmniejszej ingerencji,
- pozostałe niezdominowane alternatywy.

Duplikaty tych kategorii są scalane. Plan A dominuje plan B tylko wtedy, gdy daje co najmniej równie dobry użyteczny wynik i nie wymaga większej ingerencji, a w co najmniej jednym z tych aspektów jest lepszy.

Wyszukiwanie powinno być adaptacyjne:

- `OPTIMAL` oznacza, że wyczerpano całą zdefiniowaną przestrzeń planów w wybranym zakresie,
- `BEST_FOUND` oznacza najlepszy zweryfikowany plan znaleziony przed limitem czasu lub stanów,
- `INFEASIBLE` wolno zwrócić tylko po udowodnieniu braku poprawnego planu w pełnym badanym zakresie,
- `CANCELLED` oznacza anulowanie analizy.

Przy większym limicie działań wynik najczęściej będzie heurystyczny. Samo zakończenie heurystyki nie jest dowodem optimum. Odpowiedź i UI powinny pokazywać status, wykorzystany limit, liczbę ocenionych unikalnych stanów i zakres ewentualnego dowodu.

## 7. Kalkulator i testowanie

Ocena końcowa korzysta ze wspólnego, deterministycznego kalkulatora ekwipunku. Identyczne dane wejściowe muszą dawać identyczny wynik. Każdy prezentowany plan musi zostać nim przeliczony i ponownie sprawdzony pod kątem ochron.

Zmiany Doradcy wymagają testów obejmujących co najmniej:

- obie strategie i ich kolejność rozstrzygania,
- ochrony modów, wartości ponad cap i dopuszczalną stratę,
- cele ponad cap,
- limity 1, 3 i 10 działań,
- zakończenia `OPTIMAL`, `BEST_FOUND`, `INFEASIBLE` i `CANCELLED`,
- zachowanie niezdominowanych alternatyw,
- dobór przedmiotów według pojemności i bonusu do drifów,
- progi ulepszeń drifów 6, 11, 16 i 21,
- zgodność wyniku modelu wyszukiwania ze wspólnym kalkulatorem.

Przy zmianie uzgodnionej semantyki Doradcy aktualizuj ten dokument razem z kodem.
