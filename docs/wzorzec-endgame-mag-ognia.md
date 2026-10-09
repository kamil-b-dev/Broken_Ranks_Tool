# Wzorzec endgame — Mag Ognia

Status: **zatwierdzony i zapisany w katalogowej bazie danych**  
Data rozpoczęcia: **2026-09-25**

Dokument opisuje zaakceptowany, wyspecjalizowany wzorzec endgame Maga Ognia oraz osobny wariant zrównoważony. Zakres akceptacji i dowodu jest określony dla każdej strategii poniżej; nie jest to uniwersalna rekomendacja najlepszego buildu.

## Kandydat na zestaw przedmiotów

Lista przedmiotów bazuje na przekazanym wcześniej `build.json`, ale wzorzec nie kopiuje z niego aktualnych gwiazdek ani rozmieszczenia drifów. Wyjątkami są broń w wariancie legendarnego Żmija tier XII oraz zastąpienie Przysięgi Draugula drugim Darem Skrzydlatej. W docelowym fixture solvera wszystkie przedmioty mają 9 gwiazdek.

| Slot | Przedmiot | ID | Docelowe gwiazdki | Status |
| --- | --- | ---: | ---: | --- |
| Broń | Żmij — wariant legendarny, tier XII | rozwiązywane technicznie z katalogu | 9 | zatwierdzone |
| Druga ręka | Ariarchy | 27 | 9 | zatwierdzone |
| Zbroja | Zalla | 2 | 9 | zatwierdzone |
| Hełm | Miłość Morany | 13 | 9 | zatwierdzone |
| Płaszcz | Cień Tarula | 7 | 9 | zatwierdzone |
| Spodnie | Temary | 12 | 9 | zatwierdzone |
| Buty | Envile | 19 | 9 | zatwierdzone |
| Rękawice | Voglery | 5 | 9 | zatwierdzone |
| Pas | Wyrok Hellara | 6 | 9 | zatwierdzone |
| Naszyjnik | Ortasis | 11 | 9 | zatwierdzone |
| Pierścień 1 | Dar Skrzydlatej | 160 | 9 | zatwierdzone |
| Pierścień 2 | Dar Skrzydlatej | 160 | 9 | zatwierdzone |

## Kryterium akceptacji

Wynik został zaakceptowany jako wyspecjalizowany build Maga Ognia maksymalizujący obrażenia magiczne. Nie należy przedstawiać go jako uniwersalnie najlepszego buildu Maga Ognia, ponieważ jego definicja świadomie podporządkowuje pozostałe kryteria maksymalnemu `DAMAGE_MAGIC`.

## Dane poza zakresem

Oracle optymalizuje wyłącznie drify. Wzorzec nie dobiera orbów ani statystyk postaci; w fixture pozostają one neutralne i nie są częścią definicji optimum.

## Ustalone wymagania dotyczące drifów

- `PASIVE_DAMAGE_REDUCTION`: co najmniej 1 drif;
- `PERCENTAGE_DAMAGE_REDUCTION`: co najmniej 1 drif.
- `HIT_CHANCE_RANGED`: końcowa wartość co najmniej 120%; po osiągnięciu progu dalszy wzrost pozostaje użyteczny, ale jest celem wtórnym względem maksymalizacji obrażeń magicznych.
- `MANA_USAGE_REDUCTION`: dokładnie 1 drif zgodnie ze wspólnym rdzeniem;
- `CRITICAL_DAMAGE_CHANCE_REDUCTION`: dokładnie 1 drif, z granicą użyteczności 9,5%;
- `CRITICAL_DAMAGE_REDUCTION`: dokładnie 1 drif zgodnie ze wspólnym rdzeniem.
- Teld, Band, Alorn i Dur: końcowa wartość każdego moda musi wynosić co najmniej `cap − 1 p.p.`.

Wymagania dwóch redukcji są twardymi minimami liczby kamieni, a nie wymogiem osiągnięcia konkretnej wartości procentowej. Większa liczba pozostaje dopuszczalna i będzie oceniana według ustalanej hierarchii celów. Celność jest natomiast wymaganiem dotyczącym końcowej wartości moda.

Teld, Band, Alorn i Dur nie muszą trafić matematycznie dokładnie w cap. Dopuszczalna jest odchyłka maksymalnie 1 p.p. w dół. Wartość powyżej capa nie unieważnia buildu, lecz nadmiar ma zerową użyteczność i nie poprawia rankingu rozwiązania.

## Główny cel

Po spełnieniu wszystkich wymagań solver maksymalizuje końcową wartość `DAMAGE_MAGIC`. Liczba drifów obrażeń nie otrzymuje z góry limitu 7 ani 8. Kara za globalne powtórzenia ma naturalnie wyznaczyć granicę użyteczności; przewidywane 7–8 drifów jest hipotezą do zweryfikowania wynikiem solvera, a nie ograniczeniem modelu.

Dopiero między rozwiązaniami o identycznej maksymalnej wartości obrażeń solver maksymalizuje celność dystansową ponad wymagane 120%. Celność nie może zostać zwiększona kosztem nawet części maksymalnej wartości obrażeń.

Aktualna hierarchia leksykograficzna:

1. spełnienie wszystkich twardych wymagań;
2. maksymalna końcowa wartość `DAMAGE_MAGIC`;
3. maksymalna końcowa wartość `HIT_CHANCE_RANGED`;
4. maksymalna użyteczność pozostałych priorytetów zgodnie ze wspólnym rdzeniem;
5. minimalna strata wynikająca z kar za powtórzenia;
6. minimalny bezużyteczny nadmiar ponad capy;
7. minimalne zużycie pojemności jako ostatnie rozstrzygnięcie remisu.

## Wynik oracle z 2026-09-25

CP-SAT zakończył wszystkie poziomy hierarchii statusem `OPTIMAL` w 103,74 s. Dla zapisanej wyżej definicji optimum otrzymano:

| Mod | Wartość końcowa | Liczba drifów |
| --- | ---: | ---: |
| Obrażenia magiczne | 108,75% | 12 |
| Celność dystansowa | 160,21% | 5 |
| Teld | 59,47% | 4 |
| Band | 59,66% | 4 |
| Alorn | 39,65% | 3 |
| Dur | 60,90% | 3 |
| Redukcja zużycia many | -18,40% | 1 |
| Redukcja szansy na obrażenia krytyczne | 10,92% | 1 |
| Redukcja obrażeń krytycznych | 33,35% | 1 |
| Redukcja obrażeń biernych | 12,65% | 1 |
| Redukcja obrażeń procentowych | 33,35% | 1 |

Wynik dowodzi optimum względem tej konkretnej hierarchii, ale ujawnia istotną konsekwencję definicji: ścisła maksymalizacja obrażeń przed każdym innym kryterium prowadzi do użycia 12 drifów obrażeń. Kara za powtórzenia obniża wartość kolejnych kamieni, lecz nie może odrzucić dodatniego przyrostu, dopóki obrażenia są nadrzędnym celem leksykograficznym. Hipoteza 7–8 drifów nie potwierdziła się.

Wzorzec zapisano 2026-09-26 w tabeli `optimization_reference_builds` jako:

- `slug`: `fire-mage-max-magic-damage`;
- wersja wzorca: `1`;
- wersja definicji celu: `1`;
- strategia: `MAXIMIZE_MAGIC_DAMAGE`;
- status dowodu: `OPTIMAL`.

Rekord zawiera pełny importowalny JSON, wartości funkcji celu, użyty solver, czas obliczeń i datę dowodu. Zmiana wyposażenia, wymagań albo hierarchii celów wymaga utworzenia nowej wersji i ponownego dowodu.

Importowalny wynik jest generowany poleceniem:

```powershell
./mvnw -Dtest=FireMageEndgameOracleBenchmark -Doptimizer.fire-mage.seconds=300 -Doptimizer.fire-mage.output=target/fire-mage-endgame-candidate.json test
```

## Plan dalszej pracy

1. Nie modyfikować ręcznie zapisanego wyniku bez ponownego uruchomienia oracle.
2. Przy zmianie definicji utworzyć nową wersję wzorca zamiast nadpisywać historię.
3. Osobno opracować inne strategie Maga Ognia, jeśli będą potrzebne buildy bardziej zrównoważone.

## Wariant zrównoważony z 2026-09-26

Drugi wariant zachowuje to samo wyposażenie i wymagania wspólnego rdzenia, ale:

- ogranicza `DAMAGE_MAGIC` (Abaf) do maksymalnie 7 drifów;
- wymaga co najmniej 140% celności dystansowej;
- po maksymalizacji obrażeń równoważy procentowy postęp do capa Farida, Holma, Ioriego i Jorna;
- dopiero po równowadze defensywnej maksymalizuje łączny postęp tej czwórki i dodatkową celność.

Solver udowodnił, że maksymalna wartość obrażeń przy tych wymaganiach wynosi 99,25%. Najlepszy znaleziony układ osiąga:

| Mod | Wartość | Postęp do capa |
| --- | ---: | ---: |
| Farid | 35,53% | 59,22% |
| Holm | 36,28% | 60,47% |
| Iori | 51,75% | 64,69% |
| Jorn | 37,70% | 62,83% |
| Celność dystansowa | 140,85% | — |
| Obrażenia magiczne | 99,25% | — |

Zapisany wariant zawiera ręczną korektę: Von Subdrif 6 w Envilach został zmieniony na Grud ArcyDrif 21. Pozostałe rozmieszczenie solvera, w tym Ariarchy, pozostaje bez zmian. Build zachowuje `140,85%` celności i zyskuje `50,025%` obrony mentalnej. Usunięcie jedynego Vona oznacza jednak niespełnienie wcześniejszego wymogu wspólnego rdzenia dotyczącego redukcji zużycia many. Z tego powodu rekord nie dziedziczy dowodu solvera dla wcześniejszego kandydata; ręczna korekta i niespełniony wymóg są zapisane jawnie.

Pełne optimum równowagi nie zostało udowodnione. Dalsze przeszukiwanie przerwano na życzenie użytkownika, dlatego rekord pozostaje `BEST_KNOWN`, a nie `OPTIMAL`. Udowodnione zostały dwa pierwsze cele: maksymalne obrażenia `992525000` (`99,25%`) oraz najlepszy minimalny postęp defensywny `1421000000` (około `59,21%`). Zapisany build osiąga `5932500000` na trzecim celu — łącznym postępie defensywnym — oraz `1408530000` na czwartym celu celności. Te dwie ostatnie wartości są najlepszym znanym wynikiem, ale nie mają zamkniętego dowodu globalnego.

Globalny dowód pierwszych dwóch celów został domknięty przez rozłączne partycjonowanie przestrzeni. Próba dowodu trzeciego celu została zachowana w manifeście roboczym, lecz zakończona przed zamknięciem wszystkich gałęzi. Wpisy `TIME_LIMIT` nie są dowodem niewykonalności ani optimum.

Próba szerszego dowodu, w której ustalono wyłącznie liczności czterech drifów defensywnych (`2/2/2/1`), również zakończyła się limitem 120 s. Ustalenie dodatkowo siedmiu drifów obrażeń nie zamknęło przypadku w 60 s. Model automatycznie traktuje teraz każde żądanie `min == max` jako stałą liczność, dzięki czemu nie tworzy dla takich modów zbędnych przypadków funkcji kary. Kolejne podejście powinno dzielić pozostałe liczności ofensywne na rozłączne przypadki i uznać dowód globalny dopiero po zamknięciu całego podziału.

Rekord bazy danych:

- `slug`: `fire-mage-balanced`;
- wersja: `1`;
- strategia: `BALANCED_DEFENSE`;
- status: `BEST_KNOWN`.
