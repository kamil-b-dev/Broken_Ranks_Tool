# Audyt luk w testach — 21.10.2026

Przegląd aktualnego katalogu roboczego na bazie commita `c73a667`, z zachowaniem istniejących niezacommitowanych zmian użytkownika. Obejmuje reguły domenowe wskazane przez AGENTS.md, kod produkcyjny, testy jednostkowe i integracyjne, scenariusze przeglądarkowe, pomiar pokrycia oraz workflow i wymagane checki GitHuba. W tym audycie nie wdrażano nowych funkcji ani nowych testów.

Zidentyfikowano **30 grup luk w pokryciu lub zakresie weryfikacji i 5 dodatkowych propozycji wzmocnienia**: 10 P1, 19 P2, 6 P3. Pozycja na liście oznacza brak określonego zabezpieczenia testowego; sama w sobie nie oznacza błędu aplikacji.

**Zakres i znaczenie kompletności**

Zestawienie CSV obejmuje wszystkie niepokryte linie, częściowo wykonane linie Javy i niepokryte gałęzie, które wystąpiły w świeżych raportach LCOV/JaCoCo. Osobny plik obejmuje wszystkie funkcje/metody z zerową liczbą wykonań. Ręczna lista grupuje ważne brakujące scenariusze i luki między warstwami. Żaden skończony przegląd nie jest dowodem, że nie istnieje inny możliwy błąd lub kombinacja wejść; raport nie utożsamia wszystkich liczników z taką samą liczbą niezależnych błędów.

J = luka wykonania w aktualnym zestawie unit/in-process integration. Ta sama ścieżka może mieć częściową ochronę przeglądarkową, co zaznaczono w opisach. E = brak lub ograniczenie pokrycia end-to-end/platformy. G = luka bramki lub pomiaru. R = dodatkowe wzmocnienie, bez stwierdzenia braku podstawowych testów. P1 = pierwsza kolejność ze względu na stan użytkownika, reguły lub wdrożenie; P2 = kolejne istotne scenariusze; P3 = porządek pomiaru i dodatkowa odporność.

**Weryfikacja wykonana podczas audytu**

| Kontrola                                        | Wynik                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Frontend: `npm run test:coverage`               | 872/872 testów, 124 pliki, exit 0; globalne i indywidualne progi spełnione                              |
| Backend: `clean verify` na Java 21              | 774 testy, 0 błędów, 0 pominięć; JaCoCo i Spotless, exit 0                                              |
| Infrastruktura: lint, TypeScript, kontrakty     | exit 0; 26 testów kontraktów i 4 polityki zależności przechodzą                                         |
| Smoke assertions PowerShell                     | przypadek poprawny i sześć niepoprawnych wyników przechodzą                                             |
| Frontend: lint i `format:check`                 | exit 0                                                                                                  |
| Playwright: odkrywanie scenariuszy              | 114 browser tests w 26 plikach, 33 real-API integration w 6 plikach, 4 production performance w 1 pliku |
| Pełne E2E wszystkich przeglądarek w tym audycie | nie uruchamiano ponownie; analizowano kod, konfigurację i discovery                                     |

Lokalne zależności npm zostały odtworzone przez `npm ci` z istniejących lockfile po problemie z dowiązaniem wcześniejszego worktree. Lockfile i kod produktu nie były zmieniane. Zakończenia linii wcześniej dodanego skryptu optymalizacji assetów zostały ponownie zapisane Prettierem; nie ma różnicy treści w Git.

**Aktualne liczniki pokrycia**

| Warstwa  |              Linie | Niewykonane linie |            Gałęzie | Niewykonane gałęzie | Niewykonane funkcje/metody |
| -------- | -----------------: | ----------------: | -----------------: | ------------------: | -------------------------: |
| Frontend | 96,52% (5367/5560) |               193 | 86,33% (5294/6132) |                 838 |                        100 |
| Backend  | 96,68% (8494/8786) |               292 | 82,61% (4918/5953) |                1035 |                         36 |

Procenty frontendu są wartościami podanymi przez V8. Drobne różnice jednego licznika między przebiegami mogą wynikać z wykonania ramki animacji; nie oznaczają zmiany wyników asercji. Pokrycie frontendu zawiera także fixture opisaną w L30.

**Pełne załączniki do dalszej pracy**

- [Pokrycie plików](pokrycie-testow-2026-10-21.csv): 419 pozycji raportu, w tym 258 z co najmniej jednym niewykonanym licznikiem.
- [Wszystkie niepokryte punkty](luki-pokrycia-testow-2026-10-21.csv): 2032 wiersze lokalizacji z numerem linii, brakującymi gałęziami i fragmentem źródła.
- [Wszystkie niewykonane funkcje/metody](funkcje-bez-pokrycia-2026-10-21.csv): 136 wpisów; w tym lambdy, callbacki i zgodnościowe przeciążenia.

CSV zachowują ścieżki względem repozytorium. `missedLine=true` oznacza brak wykonania linii, `partlyCoveredLine=true` niewykonane instrukcje na wykonanej już linii Javy, a `missedBranches` liczbę niewykonanych wyjść warunkowych w danej lokalizacji. Brak osobnego pliku `*.test` obok klasy nie był automatycznie uznawany za lukę: kod może być testowany pośrednio.

**Mapa obszarów**

| Obszar                                |  Linie | Brakujące linie | Gałęzie | Brakujące gałęzie |
| ------------------------------------- | -----: | --------------: | ------: | ----------------: |
| frontend / app                        | 95,68% |              13 |  87,10% |                32 |
| frontend / features/builder           | 96,82% |              66 |  85,58% |               318 |
| frontend / features/builds            | 97,67% |              18 |  84,24% |               107 |
| frontend / features/equipment         | 99,25% |               1 |  90,00% |                 9 |
| frontend / features/optimizer         | 96,37% |              58 |  87,59% |               274 |
| frontend / features/progression-path  | 92,58% |              34 |  83,10% |                84 |
| frontend / shared                     | 98,64% |               3 |  93,14% |                14 |
| backend / catalog                     | 98,97% |               1 | 100,00% |                 0 |
| backend / equipment                   | 96,71% |              31 |  82,81% |                99 |
| backend / optimization                | 96,25% |             149 |  80,88% |               542 |
| backend / optimization/reorganization | 94,95% |              43 |  83,72% |               111 |
| backend / progressionpath             | 97,25% |              35 |  83,90% |               128 |
| backend / application                 | 33,33% |               2 |       — |                 0 |
| backend / core                        | 96,78% |              11 |  81,75% |                23 |
| backend / optimization/advisor        | 98,46% |              20 |  85,82% |               132 |

Porównano 178 produkcyjnych plików JS/JSX i 258 plików Java z raportami. 19 nie ma osobnego wpisu źródłowego: celowo wyłączony `src/main.jsx` oraz 18 typów Java bez osobnych wykonywalnych liczników, m.in. DTO generowane przez Lombok, interfejsy i package-info. Nie stanowią one automatycznie 19 nieprzetestowanych funkcji. Raport frontendu zawiera dodatkowo JSON słownika oraz testową fixture. Start aplikacji jest wykonywany w E2E i kontenerze, mimo braku licznika main w pomiarze jednostkowym.

**Lista luk i scenariuszy do uzupełnienia**

| ID  | Priorytet | Rodzaj | Luka                                                                     |
| --- | --------- | ------ | ------------------------------------------------------------------------ |
| L01 | P1        | J      | Warianty: blokady użytkownika i blokady techniczne                       |
| L02 | P1        | J      | Import buildu: brak testów części odrzuceń domenowych                    |
| L03 | P1        | J      | Dwa importy kończące się w odwrotnej kolejności                          |
| L04 | P1        | J      | Zastosowanie reorganizacji: pozostałe odrzucenia muszą być atomowe       |
| L05 | P1        | J      | Formularz po zastosowaniu wyniku i ponowne uruchomienie                  |
| L06 | P1        | J      | Reorganizacja: pełna macierz walidacji zadania                           |
| L07 | P1        | J      | Wspólna bramka obliczeń: presja pamięci i progi konfiguracji             |
| L08 | P1        | G      | Gotowy kontener nie jest uruchamiany przed merge                         |
| L09 | P2        | J      | Blokady: testy negatywne porównania pełnego slotu                        |
| L10 | P2        | J      | Wybór między szablonami tego samego drifa                                |
| L11 | P2        | J      | Reorganizacja: ścieżki dużej puli i nieudanego szukania poziomu          |
| L12 | P2        | J      | Doradca: sortowanie niezdominowanych zamienników                         |
| L13 | P2        | J      | Doradca: komplet negatywnych wariantów opcji                             |
| L14 | P2        | J      | Rate limiter: usuwanie starych klientów i współbieżność                  |
| L15 | P1        | J      | Ścieżka rozwoju: negatywny replay orbów                                  |
| L16 | P1        | J      | Edycja poziomu celu w interfejsie planera                                |
| L17 | P2        | J      | Projekt ścieżki: błąd zapisu i pobranie projektu                         |
| L18 | P2        | J      | Raport ścieżki: koniec listy, ostrzeżenia i wolne kamienie               |
| L19 | P2        | J      | Automatyczny zapis przy ukryciu karty                                    |
| L20 | P2        | J      | Plecak: zdarzenia drag-over/leave i wybór do backendu                    |
| L21 | P2        | J      | Raport reorganizacji: jednoczesny ruch i odłożenie sztuk                 |
| L22 | P2        | E      | Krytyczne przepływy działają w testach głównie na serwerze developerskim |
| L23 | P2        | E      | WebKit pomija reorganizację, planer i część wspólnych przepływów         |
| L24 | P2        | E      | Dostępność nowych raportów i stanów interfejsu                           |
| L25 | P2        | E      | Wydajność: brak dwóch tras i miar czasu reakcji                          |
| L26 | P2        | G      | Kompletność tłumaczeń nowych tekstów i komunikatów API                   |
| L27 | P2        | E      | Schemat rzeczywistej odpowiedzi reorganizacji                            |
| L28 | P2        | G      | CI dopuszcza test przeglądarkowy przechodzący dopiero po retry           |
| L29 | P3        | G      | Brak wspólnej kontroli nieoczekiwanych błędów strony w E2E               |
| L30 | P3        | G      | Raport pokrycia frontendu obejmuje także fixture testową                 |

**L01 · P1 · Warianty: blokady użytkownika i blokady techniczne**

Źródło: [OptimizationVariantContextFactory.java:52](../Broken_Ranks_Tool_Backend/src/main/java/pl/brokenranks/tool/broken_ranks_tool/optimization/engine/variant/OptimizationVariantContextFactory.java#L52). Fabryka ma 45,45% gałęzi. Ścieżka rozróżnienia blokady użytkownika od prelocka optymalizatora, w tym samo zwolnienie prelocka, nie została wykonana.

Brakujący scenariusz / kryterium testu: Jeden stan zawierający jednocześnie zablokowany slot, zablokowane gniazdo, prelock algorytmu, pustą pozycję i niezablokowany drif. Wariant ma zwolnić wyłącznie prelock algorytmu, zachować pozostałe blokady oraz nie zmienić stanu wejściowego. Osobno sprawdzić kopię statystyk postaci i izolację celu wariantu.

**L02 · P1 · Import buildu: brak testów części odrzuceń domenowych**

Źródło: [buildImportValidation.js:130](../Broken_Ranks_Tool_Frontend/src/features/builds/buildImportValidation.js#L130). Nie wykonano 9 linii odrzucających import, m.in. kamienie w pustym slocie, część niepoprawnych układów orbów, orb/drif ponad tier, powtórzony globalnie bonus orba i część niepoprawnych blokad.

Brakujący scenariusz / kryterium testu: Przekazać każdy z tych błędów przez publiczny importer, a nie tylko helper reguł. Dla każdego potwierdzić zachowanie poprzedniego ekwipunku, plecaka, postaci i blokad. Testy walidacji API i helperów domenowych istnieją; nie zastępują kontroli tej ścieżki importu.

**L03 · P1 · Dwa importy kończące się w odwrotnej kolejności**

Źródło: [useEquipmentBuildTransfer.js:81](../Broken_Ranks_Tool_Frontend/src/features/builds/useEquipmentBuildTransfer.js#L81). Wszystkie cztery warunki odrzucające nieaktualną wersję importu mają niewykonane odgałęzienie. W useBuildFileActions nie są wykonane także ścieżki pominięcia starszego sukcesu/błędu oraz zwrotu false.

Brakujący scenariusz / kryterium testu: Opóźniony import A i szybszy import B; A kończy się sukcesem lub błędem po B. Powtórzyć dla plik–snapshot i snapshot–plik. Tylko B może zmienić wyposażenie i komunikat. Dodać anulowany wybór pliku oraz częściowy import z pominiętymi dodatkami i ostrzeżeniem.

**L04 · P1 · Zastosowanie reorganizacji: pozostałe odrzucenia muszą być atomowe**

Źródło: [backpackReorganizationTransfer.js:21](../Broken_Ranks_Tool_Frontend/src/features/builder/backpack/backpackReorganizationTransfer.js#L21). Nie wykonano 6 linii odrzucenia: brak mapowania źródeł, błędny limit ruchów, błędny cel ulepszenia, pusta lista ulepszeń, niepoprawne wskazanie osobnych sztuk i pominięcie wymaganej ulepszanej sztuki.

Brakujący scenariusz / kryterium testu: Osobny wadliwy wynik dla każdej klasy błędu i porównanie całego stanu przed/po. Istnieją już testy zduplikowanego użycia, blokad, nieaktualnej odpowiedzi i przepełnienia plecaka; uzupełnienie dotyczy pozostałych warunków, a nie braku całej ochrony.

**L05 · P1 · Formularz po zastosowaniu wyniku i ponowne uruchomienie**

Źródło: [ReorganizationGoalsPanel.jsx:55](../Broken_Ranks_Tool_Frontend/src/features/optimizer/reorganization/ReorganizationGoalsPanel.jsx#L55). Panel ma 80% linii i 65,57% gałęzi. Test komponentu nie przekazuje applied result, a mapowanie źródła ulepszenia na nowe położenie pozostaje niewykonane.

Brakujący scenariusz / kryterium testu: Zastosować wynik, który przenosi ulepszany drif, a następnie zmienić cel i wysłać drugie żądanie. Sprawdzić nowy slot i indeks, poziom i szablon; również kilka ulepszeń, brak wpisu mapowania i zgodność starszego pola upgrade z listą upgrades.

**L06 · P1 · Reorganizacja: pełna macierz walidacji zadania**

Źródło: [ReorganizationTaskRules.java:29](../Broken_Ranks_Tool_Backend/src/main/java/pl/brokenranks/tool/broken_ranks_tool/optimization/reorganization/ReorganizationTaskRules.java#L29). 70,93% gałęzi. Nie wykonano m.in. odrzucenia jednoczesnego upgrade i upgrades oraz jawnie pustych insertions. Pozostały odgałęzienia limitów list, elementów null, niezgodności zadania i parametrów oraz wartości ochron.

Brakujący scenariusz / kryterium testu: Testy tabelaryczne: 36/37 wpisów, null w listach, pusta lista, parametry należące do innego zadania, oba formaty naraz, więcej niż jeden maximizeLevel, ujemna strata i niepoprawne wartości DTO. Osobno potwierdzić odrzucenie przez HTTP bez rozpoczęcia wyszukiwania. Część ograniczeń jest już sprawdzana przez testy schematu OpenAPI; brakuje pełnego sprawdzenia implementacji backendowej.

**L07 · P1 · Wspólna bramka obliczeń: presja pamięci i progi konfiguracji**

Źródło: [HeavyCalculationGate.java:35](../Broken_Ranks_Tool_Backend/src/main/java/pl/brokenranks/tool/broken_ranks_tool/core/execution/HeavyCalculationGate.java#L35). Bramka ma 50% gałęzi. Nie wykonano rzeczywistego rzucenia błędu presji pamięci ani niepoprawnych parametrów konstruktora. Testy OptimizationMemoryGuard i zwalniania semafora istnieją, ale nie pokrywają tego warunku wspólnej bramki używanej przez planner.

Brakujący scenariusz / kryterium testu: Kontrolowany odczyt sterty: poniżej progu, dokładnie na progu, powyżej, brak znanego maksimum. Dla planowania potwierdzić 503/OPTIMIZER_MEMORY_PRESSURE, brak wywołania serwisu oraz możliwość późniejszego uruchomienia. Testy limitu liczby workerów i zakresu 1–95%. Nie opierać testu na losowym zajęciu prawdziwej sterty.

**L08 · P1 · Gotowy kontener nie jest uruchamiany przed merge**

Źródło: [quality.yml:214](../.github/workflows/quality.yml#L214). container-smoke uruchamia się tylko po pushu do master. Audyt bezpieczeństwa buduje i skanuje obraz, ale nie sprawdza jego uruchomienia.

Brakujący scenariusz / kryterium testu: Przed merge uruchomić obraz: readiness, serwowany index i zasoby, odczyt katalogu z produkcyjnej bazy oraz żądanie optymalizacji i zgodność kalkulatora. Obecny smoke już zawiera dużą część tych asercji; luka dotyczy momentu jego wykonywania.

**L09 · P2 · Blokady: testy negatywne porównania pełnego slotu**

Źródło: [OptimizationLockService.java:127](../Broken_Ranks_Tool_Backend/src/main/java/pl/brokenranks/tool/broken_ranks_tool/optimization/locking/OptimizationLockService.java#L127). 61,46% gałęzi. Testy klasy obejmują dwa poprawne przypadki zachowania blokady. Pozostają niewykonane warunki części brakujących danych i różnic wykrywanych przez isValid/slotEquals.

Brakujący scenariusz / kryterium testu: Dla blokady całego slotu osobno zmienić itemId, gwiazdki, orbIds, orbLevels, drifIds i drifLevels; każdy wynik musi być odrzucony. Dla blokady gniazda: brak slotu, brak pozycji, zmieniony poziom, null i indeks spoza listy. Potwierdzić też odłączenie kopii wejścia.

**L10 · P2 · Wybór między szablonami tego samego drifa**

Źródło: [OptimizationSlotContextFactory.java:119](../Broken_Ranks_Tool_Backend/src/main/java/pl/brokenranks/tool/broken_ranks_tool/optimization/engine/context/OptimizationSlotContextFactory.java#L119). Cała metoda preferMoreValuable i lambda scalająca kandydatów nie zostały wykonane; fabryka ma 60% gałęzi.

Brakujący scenariusz / kryterium testu: Katalog z więcej niż jednym kandydatem dla grupy redukowanej przez fabrykę. Różna wartość bonusu przy tej samej mocy, remis wartości rozstrzygany poziomem i pełny remis rozstrzygany ID. Odwrócona kolejność katalogu musi dać ten sam wybór.

**L11 · P2 · Reorganizacja: ścieżki dużej puli i nieudanego szukania poziomu**

Źródło: [ReorganizationSearch.java:129](../Broken_Ranks_Tool_Backend/src/main/java/pl/brokenranks/tool/broken_ranks_tool/optimization/reorganization/ReorganizationSearch.java#L129). Nie wykonano przywrócenia żądanego poziomu po całkowicie nieudanym maximizeLevel, sortowania/obcięcia ponad 64 kandydatów oraz kilku gałęzi naprawy i ograniczeń liczności.

Brakujący scenariusz / kryterium testu: Brak poprawnego wyniku dla każdego sprawdzanego poziomu: wejściowy targetLevel ma zostać przywrócony. Osobno pula generująca ponad 64 kandydatów, limity rozmiarów i liczności, identyczne sztuki oraz zakończenie budżetu; wynik nadal musi respektować własność, blokady i limit ruchów.

**L12 · P2 · Doradca: sortowanie niezdominowanych zamienników**

Źródło: [AdvisorItemActionGenerator.java:114](../Broken_Ranks_Tool_Backend/src/main/java/pl/brokenranks/tool/broken_ranks_tool/optimization/advisor/AdvisorItemActionGenerator.java#L114). Niewykonana lambda sortowania kandydatów łącząca bonus do drifów i pojemność. Testy dominacji oraz poprawności zamienników istnieją.

Brakujący scenariusz / kryterium testu: Kilka jednocześnie niezdominowanych zamienników o różnych kombinacjach pojemności i bonusu do drifów, brak stats, remis i odwrócona kolejność wejścia. Sprawdzić stabilne ID oraz brak utraty użytecznego kandydata.

**L13 · P2 · Doradca: komplet negatywnych wariantów opcji**

Źródło: [AdvisorOptionsValidator.java:8](../Broken_Ranks_Tool_Backend/src/main/java/pl/brokenranks/tool/broken_ranks_tool/optimization/advisor/AdvisorOptionsValidator.java#L8). 65,38% gałęzi przy 100% linii. Pozostają odgałęzienia null dla pól, jednoczesnych targetValue/targetGain oraz niepoprawnych wpisów ochron.

Brakujący scenariusz / kryterium testu: Każde wymagane pole DTO wyzerowane osobno, oba rodzaje celu naraz, null wartości ochron, nieujemność i skończoność straty. Rozdzielić walidację DTO od błędów odrzucanych wcześniej przez deserializację. Limit 32 ochron nie jest dziś osiągalny poprawną mapą 30 typów.

**L14 · P2 · Rate limiter: usuwanie starych klientów i współbieżność**

Źródło: [RequestRateLimiter.java:59](../Broken_Ranks_Tool_Backend/src/main/java/pl/brokenranks/tool/broken_ranks_tool/core/ratelimit/RequestRateLimiter.java#L59). Nie wykonano predykatu usuwania starych liczników. Pięć testów klasy jest sekwencyjnych i nie tworzy ponad 256 klientów.

Brakujący scenariusz / kryterium testu: Przekroczyć 256 identyfikatorów, zmienić okno zegara i sprawdzić usunięcie starych liczników bez utraty bieżących. Równoczesne żądania tego samego klienta i różnych klientów muszą dopuścić dokładnie tyle operacji, ile wynoszą limity, bez podwójnego zużycia.

**L15 · P1 · Ścieżka rozwoju: negatywny replay orbów**

Źródło: [ProgressionOrbs.java:108](../Broken_Ranks_Tool_Backend/src/main/java/pl/brokenranks/tool/broken_ranks_tool/progressionpath/planning/ProgressionOrbs.java#L108). 70,51% gałęzi. Nie wykonano m.in. odrzucenia powtórzonej tożsamości orba; pozostały gałęzie warunków zmiany typu, obniżenia rozmiaru/poziomu i odtwarzania zajętych pozycji. Replay drifów ma osobne liczne testy negatywne; orby nie mają równoważnego zestawu bezpośredniego.

Brakujący scenariusz / kryterium testu: Duplikat instanceId, zmiana bonusu, obniżenie poziomu przy zwiększeniu rozmiaru i odwrotnie, zajęty cel, zamiana przez magazyn, epik–legenda i dwa ofensywne orby legendy. Sprawdzić kolejność MOVE/UPGRADE, zachowanie tożsamości oraz brak publikacji częściowego etapu po błędzie.

**L16 · P1 · Edycja poziomu celu w interfejsie planera**

Źródło: [ProgressionWorkspace.jsx:266](../Broken_Ranks_Tool_Frontend/src/features/progression-path/ProgressionWorkspace.jsx#L266). Niewykonany cały handler zmiany poziomu celu, przycinania spentPoints i odtwarzania characterStats.

Brakujący scenariusz / kryterium testu: Obniżyć poziom celu z rozdanymi punktami przekraczającymi nowy budżet i podnieść go ponownie. Sprawdzić budżet 4 punktów/poziom, zgodność konfiguracji postaci ze statystykami żądania, zapis draftu oraz unieważnienie poprzedniego wyniku i odpowiedzi w locie.

**L17 · P2 · Projekt ścieżki: błąd zapisu i pobranie projektu**

Źródło: [ProgressionWorkspace.jsx:59](../Broken_Ranks_Tool_Frontend/src/features/progression-path/ProgressionWorkspace.jsx#L59). Niewykonany komunikat nieudanego zapisu lokalnego. Unit coverage nie wykonuje downloadProject i przycisku jego pobrania; test eksportu etapu dotyczy innego dokumentu.

Brakujący scenariusz / kryterium testu: Odmowa/quota przy setItem bez utraty celu, widoczny komunikat i działające pobranie projektu do pliku; ponowny import pobranego projektu musi zachować opcje, cel i rezerwacje. Zwolnić object URL, nie przywracać historycznego raportu. Oddzielić projekt od eksportu pojedynczego buildu etapu.

**L18 · P2 · Raport ścieżki: koniec listy, ostrzeżenia i wolne kamienie**

Źródło: [ProgressionResult.jsx:63](../Broken_Ranks_Tool_Frontend/src/features/progression-path/ProgressionResult.jsx#L63). 68,96% gałęzi. Niewykonany handler najbliższego etapu oraz render części ostrzeżeń i pozostałych drifów; nie wszystkie przejścia checklisty są sprawdzane.

Brakujący scenariusz / kryterium testu: Odhaczyć wszystkie etapy, cofnąć odhaczenie, zwinąć aktualny etap i użyć przycisku najbliższego. Osobno raport bez pełnej ścieżki, z ostrzeżeniami i wolnymi drifami. Sprawdzić widoczność, nazwy, przewijanie i brak zmiany danych wejściowych.

**L19 · P2 · Automatyczny zapis przy ukryciu karty**

Źródło: [useWorkingDraftSave.js:24](../Broken_Ranks_Tool_Frontend/src/app/storage/useWorkingDraftSave.js#L24). Obsługa visibilitychange nie została wykonana. Istnieją testy pagehide, odmontowania i wyłączonego zapisu.

Brakujący scenariusz / kryterium testu: visibilitychange przy document.hidden=true przed upływem 150 ms ma zapisać najnowszy draft dokładnie raz. hidden=false nie może wymusić zapisu. Sprawdzić zmianę enabled z true na false z oczekującym timerem, wymianę callbacka oraz usunięcie listenerów.

**L20 · P2 · Plecak: zdarzenia drag-over/leave i wybór do backendu**

Źródło: [BackpackGrid.jsx:53](../Broken_Ranks_Tool_Frontend/src/features/builder/backpack/BackpackGrid.jsx#L53). 72,72% gałęzi. Niewykonane handlery podświetlania stref i opuszczenia celu oraz jedna ścieżka zaznaczania sendToBackend. Część przeciągania jest już sprawdzana w Chromium E2E.

Brakujący scenariusz / kryterium testu: Przeciągnięcie do jawnego gniazda, przejście między dziećmi karty i rzeczywiste opuszczenie karty, niedozwolony zasób i czyszczenie podświetlenia. Zaznaczenie/odznaczenie konkretnej sztuki ma dotyczyć tylko jej ID, także przy sortowaniu.

**L21 · P2 · Raport reorganizacji: jednoczesny ruch i odłożenie sztuk**

Źródło: [reorganizationReportData.js:39](../Broken_Ranks_Tool_Frontend/src/features/optimizer/reorganization/reorganizationReportData.js#L39). 75,94% gałęzi; nie wykonano callbacka porównującego źródła w detekcji kamieni odłożonych do plecaka.

Brakujący scenariusz / kryterium testu: W jednym wyniku przenieść jedną sztukę, odłożyć drugą, zostawić trzecią zablokowaną i mieć dwie sztuki tego samego szablonu. Raport i instrukcja muszą wymienić wyłącznie rzeczywiste odłożenia i zachować rozróżnienie źródeł; nie mogą zaliczyć wbudowanych drifów jako zwracanych.

**L22 · P2 · Krytyczne przepływy działają w testach głównie na serwerze developerskim**

Źródło: [playwright.integration.config.js:20](../Broken_Ranks_Tool_Frontend/playwright.integration.config.js#L20). Browser E2E i real API integration korzystają z Vite dev. Produkcyjny preview ma cztery testy i nie obejmuje pełnej reorganizacji, Doradcy, biblioteki ani planera.

Brakujący scenariusz / kryterium testu: Mały zestaw krytycznych przepływów na zbudowanym frontendzie serwowanym przez aplikację/kontener: import–reorganizacja–cofnięcie, jawne zastosowanie Doradcy oraz wygenerowanie i eksport ścieżki. Sprawdzić bezpośrednie wejście i reload tras oraz pobieranie lazy chunków.

**L23 · P2 · WebKit pomija reorganizację, planer i część wspólnych przepływów**

Źródło: [playwright.config.js:22](../Broken_Ranks_Tool_Frontend/playwright.config.js#L22). Projekt mobile-webkit wybiera tylko mobile-_.spec.js. Pliki reorganization_.spec.js, localization.spec.js, interface-preferences.spec.js i integration nie spełniają tego wzorca. Mobilny viewport w Chromium nie rozszerza tego zakresu.

Brakujący scenariusz / kryterium testu: Uruchamiać reprezentatywne reorganizowanie/cofanie, planer, zmianę języka oraz bibliotekę w WebKit z odpowiednim urządzeniem mobilnym. Zakres Firefox można dobrać do faktycznie wspieranych przeglądarek; jego brak sam w sobie nie dowodzi naruszenia wymagań produktu.

**L24 · P2 · Dostępność nowych raportów i stanów interfejsu**

Źródło: [app.spec.js:77](../Broken_Ranks_Tool_Frontend/e2e/app.spec.js#L77). Axe jest uruchamiany w kreatorze i optymalizatorze oraz kilku testach mobile. Nie ma analogicznych skanów otwartego raportu reorganizacji, biblioteki porównań i planera z etapami. Testy etykiet i niektórych interakcji klawiaturowych istnieją.

Brakujący scenariusz / kryterium testu: Skanować te stany w PL i EN, także z błędem i ostrzeżeniem. Osobno przejście wyłącznie klawiaturą przez raport, checklistę i dialogi, kolejność fokusu oraz jego powrót po zamknięciu. Axe nie zastępuje tych asercji zachowania.

**L25 · P2 · Wydajność: brak dwóch tras i miar czasu reakcji**

Źródło: [production-ui.spec.js:22](../Broken_Ranks_Tool_Frontend/e2e/performance/production-ui.spec.js#L22). Budżety startu dotyczą /, /builder i /optimizer, a pomiar sumuje decodedBodySize. Nie mierzy czasu interakcji, długich zadań ani wzrostu pamięci. Biblioteka i ścieżka nie mają analogicznych budżetów tras.

Brakujący scenariusz / kryterium testu: Dodać /builds i /progression-path oraz scenariusze 10 zapisanych buildów, 200 wpisów plecaka i długiego raportu. Zmierzyć deterministycznie wybrane interakcje/renderowanie i powtarzane wejście–wyjście z widoku. Czasowe budżety ustalić z pomiarów; nie opierać testu na przypadkowej szybkości runnera.

**L26 · P2 · Kompletność tłumaczeń nowych tekstów i komunikatów API**

Źródło: [translation.test.js:63](../Broken_Ranks_Tool_Frontend/src/shared/i18n/translation.test.js#L63). Test katalogu sprawdza istniejące wpisy i placeholdery. Nie porównuje wszystkich używanych tekstów ze słownikiem. Fallback nieznanego komunikatu jest celowo akceptowany; testy przeglądarkowe języka używają mockowanych odpowiedzi.

Brakujący scenariusz / kryterium testu: Kontrolować pokrycie statycznych kluczy oraz uzgodniony zestaw dynamicznych szablonów backendu. Dodać EN z rzeczywistym błędem API, ostrzeżeniem reorganizacji i raportem planera, zachowując nazwy własne i dane użytkownika. To luka kontroli kompletności, nie stwierdzenie, że każdy fallback jest błędem.

**L27 · P2 · Schemat rzeczywistej odpowiedzi reorganizacji**

Źródło: [reorganization.spec.js:126](../Broken_Ranks_Tool_Frontend/e2e/integration/reorganization.spec.js#L126). Testy reorganizacji sprawdzają wartości i zgodność z kalkulatorem, ale nie używają walidatora OpenAPI dla tych rzeczywistych odpowiedzi. Takie walidowanie istnieje dla innych scenariuszy optymalizatora i planera.

Brakujący scenariusz / kryterium testu: Przepuścić rzeczywiste żądania i odpowiedzi UPGRADE/INSERT/RESERVE, wynik z niespełnionym celem miękkim oraz błędy HTTP przez odpowiadające im schematy. Sprawdzić także mapowania sztuk i null/nieobecne pola zgodnościowe.

**L28 · P2 · CI dopuszcza test przeglądarkowy przechodzący dopiero po retry**

Źródło: [playwright.config.js:8](../Broken_Ranks_Tool_Frontend/playwright.config.js#L8). retries wynosi 2 w CI, bez failOnFlakyTests ani osobnej bramki niestabilności. Taki test może zostać uznany przez job za sukces po ponowieniu.

Brakujący scenariusz / kryterium testu: Ustalić świadomą politykę: failOnFlakyTests dla krytycznego zestawu albo osobna kontrola/raport niestabilnych testów. Zachować retry jako diagnostykę. Sama konfiguracja nie dowodzi, że aktualne testy są niestabilne.

**L29 · P3 · Brak wspólnej kontroli nieoczekiwanych błędów strony w E2E**

Źródło: [playwright.config.js:10](../Broken_Ranks_Tool_Frontend/playwright.config.js#L10). Scenariusze mają lokalne listenery requestfailed/request i dialog, ale brak wspólnego egzekwowania pageerror/console.error. Sprawdzany fragment interfejsu może przejść mimo niepowiązanego wyjątku po renderze.

Brakujący scenariusz / kryterium testu: Wspólna fixture zbierająca nieoczekiwane błędy runtime i wybrane błędy konsoli, z lokalnym jawnie określonym oczekiwaniem dla testów celowo wywołujących błąd. Bez globalnego ignorowania komunikatów i bez traktowania każdego 4xx jako awarii produktu.

**L30 · P3 · Raport pokrycia frontendu obejmuje także fixture testową**

Źródło: [vite.config.js:79](../Broken_Ranks_Tool_Frontend/vite.config.js#L79). W mianowniku pokrycia znalazł się progressionReport.fixtures.js: 6 linii, 4 gałęzie i 4 funkcje wykonywane przez testy. coverage.exclude wyklucza src/test, ale nie fixture leżące obok komponentów. To mały wpływ liczbowy, lecz raport nie opisuje wyłącznie kodu produkcyjnego.

Brakujący scenariusz / kryterium testu: Wyłączyć helpery i fixture testowe niezależnie od ich katalogu oraz sprawdzić politykę pomiaru na przykładzie testowej fixture obok funkcji. Zachować w raporcie nieimportowane pliki produkcyjne. Nie wykluczać rzeczywistego kodu wyłącznie dlatego, że obniża pokrycie.

**Dodatkowe wzmocnienia**

**R01 · P3 · Generowane kombinacje reguł i zachowania tożsamości**

Źródło: [OptimizationIndependentOracleTests.java:14](../Broken_Ranks_Tool_Backend/src/test/java/pl/brokenranks/tool/broken_ranks_tool/optimization/service/impl/OptimizationIndependentOracleTests.java#L14). Istnieją niezależne małe oracle, także dla reorganizacji, oraz wiele przykładów domenowych. Nie znaleziono generowanego zestawu łączącego nowe zadania, blokady, identyczne sztuki i limity.

Propozycja: Ograniczone, deterministyczne generowanie z zapisanym seedem. Sprawdzać zachowanie własności, brak obniżania drifów/orbów, pojemności i gniazda, blokady, atomowe cofanie oraz zgodność kalkulatora. Nie wymagać dowodu optimum dla dużej heurystyki i nie nazywać braku pełnego oracle brakiem jakichkolwiek testów oracle.

**R02 · P2 · Test zasobów nowych trybów przy maksymalnych wejściach**

Źródło: [quality.yml:51](../.github/workflows/quality.yml#L51). Test ograniczonej sterty uruchamia trzy powtórzenia OptimizationArcherPerformanceBenchmark. Nie jest to analogiczna kontrola pamięci dla reorganizacji, Doradcy i planera.

Propozycja: Mały powtarzalny zestaw najcięższych poprawnych wejść tych trybów, po rozgrzaniu, z kontrolą wspólnego workera, ograniczonych cache i odzyskiwania gotowości. Oddzielić funkcjonalny test limitów od pomiaru wydajności i nie uruchamiać kosztownego pełnego solvera przy każdym PR.

**R03 · P3 · Siła asercji poza samym wykonaniem kodu**

Źródło: [coverage-floor.mjs:1](../Broken_Ranks_Tool_Frontend/scripts/coverage-floor.mjs#L1). Pokrycie mierzy wykonanie. Nie ma kontroli mutacji najważniejszych reguł; wysokie pokrycie nie dowodzi, że asercja wykryje zmianę operatora lub pominięcie zabezpieczenia.

Propozycja: Najpierw mały audyt mutacyjny dla zachowania puli, limitu ruchów, capów i ujemnego kierunku redukcji. Wprowadzić tylko stabilny, ograniczony zestaw do automatyzacji. Nie dodawać testów lustrzanych wyłącznie dla podbicia procentów.

**R04 · P3 · Progi pokrycia nie wyróżniają wszystkich krytycznych obszarów**

Źródło: [pom.xml:160](../Broken_Ranks_Tool_Backend/pom.xml#L160). Backend ma dodatkowe progi pakietów ratelimit i advisor, ale nie reorganization/progressionpath/variant/locking. Frontend dopuszcza 50% gałęzi w pliku i ma stosunkowo szerokie progi funkcji. Obecny zestaw wszystkie te progi spełnia.

Propozycja: Po dodaniu testów ustalić minima dla krytycznych modułów i kontrolę regresji zmienianego kodu. Nie podnosić globalnie progów do 100% ani nie wymuszać testowania nieosiągalnych zabezpieczeń i kodu generowanego.

**R05 · P3 · Konflikt nadpisania/usunięcia tego samego buildu w prawdziwych kartach**

Źródło: [audit-repairs.spec.js:43](../Broken_Ranks_Tool_Frontend/e2e/audit-repairs.spec.js#L43). Test prawdziwych kart sprawdza równoczesne tworzenie różnych rekordów i odświeżanie biblioteki. Konflikt tego samego rekordu jest już testowany jednostkowo z kontrolowanym Web Locks.

Propozycja: Dwie rzeczywiste karty: obie otwierają ten sam rekord, jedna go nadpisuje albo usuwa, druga próbuje zapisać starą wersję. Oczekiwany jawny konflikt i brak utraty nowszego buildu. To rozszerzenie istniejącego testu, nie brak całej obsługi współbieżności.

**Rzeczy już zabezpieczone i korekty wcześniejszych sugestii**

- Istnieją niezależne małe oracle dla optymalizatora i reorganizacji. Brak pełnego dowodu optimum dużego buildu nie jest luką testu, który miałby taki dowód zapewniać.
- Istnieją testy utrzymania tożsamości sztuk, pełnego plecaka 200/201, atomowego odrzucania części wyników, nieaktualnych odpowiedzi po edycji, ochron i blokad, anulowania Doradcy, niespełnionych celów miękkich oraz zgodności ze wspólnym kalkulatorem.
- Podstawowa ścieżka epik 9★ → legenda 1★ jest testowana dla wszystkich siedmiu profesji. Nie zgłaszam braku całej funkcji ani testów reguł gry.
- Biblioteka ma testy współbieżnych zapisów, konfliktu tego samego rekordu i braku Web Locks. R05 dotyczy tylko rozszerzenia prawdziwego scenariusza przeglądarkowego.
- Wcześniejszą sugestię testowania granicy 32/33 ochron należy skorygować: obecnie jest 30 wartości DRIF_BONUS_TYPE, więc prawidłowa mapa nie osiąga 33 różnych kluczy. Takiej gałęzi nie należy sztucznie wykonywać wyłącznie dla podniesienia procentu.
- Testy benchmarków uruchamianych ręcznie lub osobnym profilem Maven nie są pominiętymi zwykłymi testami. Discovery nie wykazało skip/todo/only w standardowych scenariuszach; warunkowy duży oracle jest świadomie oddzielony.

**Wymagane checki GitHuba**

Odczyt efektywnych rulesetów `master` potwierdził strict_required_status_checks_policy=true i 10 wymaganych kontekstów: backend OSV, audyt kontenera, oba npm audit, Backend tests, Frontend checks, Real frontend-backend integration, Infrastructure lint and API contract checks oraz oba języki CodeQL. Starszy endpoint branch protection zwraca 404, ponieważ ochrona jest oparta na rulesetach; nie oznacza to braku ochrony. Production container smoke test nie należy do wymaganego zestawu i jest uruchamiany dopiero dla push/master (L08). Ustawień repozytorium nie zmieniano.

**Uwagi o interpretacji i środowisku**

Audyty zależności i skan obrazu przeszły w poprzednim etapie pracy; nie są pomiarem pokrycia funkcjonalnego. W tym audycie nie powtarzano kosztownego budowania kontenera bez zmiany jego kodu. Nie wykonywano prób obciążenia działającej produkcji.

Repozytorium nie ustala LF dla wszystkich plików tekstowych w .gitattributes, a Prettier oczekuje LF. Przy Windows/core.autocrlf=true świeży checkout może zgłaszać różnice formatowania bez zmiany treści kodu, co odtworzono przy wcześniejszym worktree i pojedynczym skrypcie po fast-forward. To kwestia odtwarzalności środowiska; nie należy rozwiązywać jej wyłączeniem format:check.

**Kolejność dalszych prac**

Najpierw L01–L08, L15 i L16; następnie pozostałe P2. Zmiany dobierać małymi grupami domenowymi i uruchamiać testy danego obszaru, a nie cały zestaw po każdej poprawce. Przed zmianą algorytmu zachować niezależność oracle. Gałęzie defensywne, kod generowany i zgodnościowe przeciążenia ocenić przed pisaniem nowych testów — celem jest wykrywanie regresji, a nie mechaniczne osiągnięcie 100%.
