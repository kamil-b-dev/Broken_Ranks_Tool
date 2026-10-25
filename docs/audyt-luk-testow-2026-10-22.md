# Wdrożenie audytu testów — 22 października 2026

Ten lokalny raport uzupełnia audyt z 21 października. Oba raporty i pomocnicze CSV są ignorowane przez Git. Poniższa macierz odnosi się do 30 ustaleń i 5 zaleceń z audytu, nie jest deklaracją braku wszystkich możliwych błędów aplikacji.

## Zakres wdrożenia

| ID | Dodana ochrona lub scenariusz |
| --- | --- |
| L01 | Mieszane blokady użytkownika i prelocki; izolacja statystyk, celu i cache wariantu w `OptimizationVariantGeneratorTests`. |
| L02 | Odrzucenia domenowe przez publiczny importer, zachowanie całego stanu w `buildFile.test.js`. |
| L03 | Odwrócona kolejność zakończenia importów plik/plik, plik/snapshot i snapshot/plik, starsze błędy i anulowanie w testach obu hooków importu. |
| L04 | Pozostałe odrzucenia wadliwego wyniku oraz atomowość w `backpackReorganizationTransfer.test.js`. |
| L05 | Formularz po zastosowaniu wyniku, nowe położenie sztuk, kilka ulepszeń i zgodność legacy w `ReorganizationGoalsPanel.test.jsx`. |
| L06 | Macierz wadliwych zadań, granica 36/37, null, ochrony oraz HTTP bez uruchomienia wyszukiwania w `ReorganizationTaskRulesTests` i `OptimizationControllerTests`. |
| L07 | Deterministyczny odczyt sterty, progi konfiguracji, brak zużycia permitu oraz HTTP 503 i odzyskanie gotowości w `HeavyCalculationGateTests` i `ProgressionPathControllerTests`. |
| L08 | Wymagane zadanie `container-audit` uruchamia zeskanowany obraz przed merge, sprawdza trasy SPA, kalkulator i pięć krytycznych przepływów przeglądarkowych. |
| L09 | Osobne odrzucenie zmiany każdego zablokowanego pola i usunięcia slotu w `OptimizationLockServiceTests`. |
| L10 | Silniejszy szablon i stabilne ID przy różnej kolejności katalogu w `OptimizationSlotContextFactoryTests`. |
| L11 | Duża pula przekraczająca próg przycinania, zgodność kalkulatora, zachowanie tożsamości oraz przywrócenie żądanego poziomu po nieudanym maximize. |
| L12 | Niezdominowane kompromisy, kolejność bonusów i stabilne ID kandydatów w `AdvisorItemActionGeneratorTests`. |
| L13 | Negatywna macierz opcji i granice budżetów/liczby akcji w `AdvisorOptionsValidatorTests`. |
| L14 | Usuwanie starych klientów i równoczesne żądania różnych klientów z limitem globalnym w `RequestRateLimiterTests`. |
| L15 | Atomowe odrzucenie wadliwego replay orbów oraz epik 9★ → legenda 1★ z kilkoma orbami w `ProgressionOrbsTests`. |
| L16 | Commit poziomu celu po blur, ograniczenie punktów i zachowanie pustego draftu w `ProgressionWorkspace.test.jsx`. |
| L17 | Quota zapisu, rzeczywista treść pobranego projektu, opcje res/balance i sprzątanie URL w testach workspace oraz rzeczywisty round-trip w integracji. |
| L18 | Odhaczenie wszystkich etapów i ponowne otwarcie, ostrzeżenia, wolne kamienie oraz pusty raport w `ProgressionResult.test.jsx`. |
| L19 | Jednokrotny flush po ukryciu karty, anulowanie i usunięcie listenerów w `useWorkingDraftSave.test.js`. |
| L20 | Drag-over/leave przez granice dzieci gniazda oraz wybór konkretnej sztuki do backendu w `BackpackGrid.test.jsx`. |
| L21 | Jednoczesna zamiana identycznych sztuk i odłożenie kamieni, dokładna liczba operacji w `reorganizationReportData.test.js`. |
| L22 | Wszystkie konfiguracje Playwright używają produkcyjnego build/preview; integracja może wskazać bezpośrednio kontener. |
| L23 | WebKit obejmuje reorganizację, planer, dostępność i współbieżność kart. Długie scenariusze mobile podzielone według operacji. |
| L24 | Axe PL/EN i desktop/mobile dla otwartego raportu reorganizacji, wszystkich zakładek porównywarki oraz planera z checklistą, ostrzeżeniem i błędem; rzeczywiste interakcje klawiaturą. Istniejące scenariusze dialogów nadal sprawdzają Escape i powrót fokusu. |
| L25 | Budżety `/builds` i `/progression-path`, 10 buildów, 200 sztuk plecaka, 140 etapów, pomiary interakcji i długich zadań oraz budżety wzrostu sterty/DOM/listenerów po nawigacji. |
| L26 | Kontrola statycznych kluczy tłumaczeń, rzeczywiste błędy API i ostrzeżenia celów miękkich, angielski raport planera z ostrzeżeniami i zachowaniem nazw własnych. |
| L27 | Walidacja faktycznie serializowanych żądań i rzeczywistych odpowiedzi reorganizacji oraz błędów za pomocą OpenAPI. |
| L28 | `failOnFlakyTests` w CI dla wszystkich konfiguracji Playwright; retry służy diagnostyce i nie daje zielonego checka. |
| L29 | Wspólna automatyczna fixture egzekwująca brak pageerror i nieoczekiwanych console.error; celowe błędy deklarowane lokalnie. |
| L30 | Fixture testowe wyłączone z mianownika pokrycia, zachowane nieimportowane pliki produkcyjne. |
| R01 | 48 deterministycznych kombinacji zachowania puli, sztuk, poziomów i blokad w transferze reorganizacji, obok istniejących niezależnych oracle. |
| R02 | Powtarzana reorganizacja pełnego buildu i 30-etapowy planner wraz z dotychczasowym Doradcą przy stercie 128 MB; kontrola cache i parytetu kalkulatora. Zestaw jest ograniczony kosztowo, nie stanowi wyczerpującego przeszukania wszystkich maksymalnych kombinacji wejścia. |
| R03 | Cztery kontrolowane mutacje zabezpieczeń: własność sztuki, limit przełożeń, cap i kierunek redukcji. Błąd importu lub transformacji nie liczy się jako wykryta mutacja. |
| R04 | Dodatkowe progi krytycznych plików frontendu i pakietów backendu, bez wymuszania 100% globalnie. |
| R05 | Dwie prawdziwe karty i Web Locks: konflikt usunięcia po nadpisaniu i nadpisania po usunięciu tego samego buildu. |

## Błędy znalezione przez nowe testy

- Brak limitu straty wariantu był serializowany jako `null`, a wartość ułamkowa naruszała typ integer w OpenAPI. Żądanie pomija niepasujące lub niefinitywne wartości i serializuje poprawny limit zgodnie z typem backendu.
- Przewijana tabela statystyk porównywarki nie była osiągalna klawiaturą na wąskim ekranie. Kontener tabeli jest teraz fokusowalny, a test naciska strzałkę i sprawdza faktyczne przewinięcie.
- Rzeczywiste ostrzeżenie o brakującym procencie celu nie miało szablonu angielskiego. Dodano tłumaczenie etykiety moda i liczb dziesiętnych z zachowaniem nazw drifów.
- Kontrola kluczy znalazła trzy brakujące tłumaczenia etykiet reorganizacji.
- Scenariusze EN otwartego raportu znalazły pominięcie tłumaczenia przycisków uruchamiania i ponawiania obliczeń. Naprawiono etykiety desktop i mobile, a osobny test kontroluje cztery stany przycisku desktop.

## Czas i użyteczność testów

- E2E i wydajność w jednym zadaniu CI korzystają z wcześniej zbudowanego `dist` zamiast powtarzać build. Lokalnie domyślnie powstaje świeży build; ponowne użycie jest jawne.
- Smoke kontenera używa obrazu, który właśnie przeszedł skan. Usunięto osobne, powtarzające tę pracę zadanie uruchamiane dopiero po merge.
- WebKit ma jednego workera, a długie scenariusze mobile są podzielone na krótsze odpowiedzialności. Nie zwiększano timeoutów, by ukrywać zawieszenia.
- Testy domeny, UI i powiązanych plików można uruchamiać oddzielnie. Audyt mutacyjny obejmuje cztery istotne reguły, nie cały kosztowny solver.
- Czas interakcji i długie zadania są załącznikami diagnostycznymi. Progi czasu wymagają powtarzalnych pomiarów CI; nie ustawiono arbitralnych limitów zależnych od szybkości komputera.

## Granice weryfikacji

| Kontrola | Potwierdzony wynik lokalny |
| --- | --- |
| Frontend, pełny zestaw z pokryciem | 918/918, 126 plików, exit 0; 64,04 s. Linie 97,44%, gałęzie 87,31%. Progi plików spełnione. |
| Backend | Pełne `clean verify`: 804 testy, exit 0, Spotless i JaCoCo przechodzą. Następnie po dodaniu trzeciego scenariusza orbów: 3/3 `ProgressionOrbsTests` i Spotless, exit 0. Linie pełnego raportu 97,27%, gałęzie 84,18%. |
| Ograniczona sterta | 128 MB, trzy powtórzenia i rozgrzanie reorganizacji/planera; oba benchmarki exit 0. |
| Dostępność rozszerzonych stanów | 24/24 PL/EN × desktop/mobile × Chromium/WebKit, exit 0. |
| Wydajność produkcyjnego UI | 6/6, exit 0. Pomiary interakcji i długich zadań załączone do raportu. |
| Siła asercji | 4/4 mutacje wykryte, exit 0. |
| Egzekwowanie błędów przeglądarki | Kontrolowana próba: czysty kontekst przechodzi; console.error w domyślnym i osobnym kontekście oraz pageerror w osobnym kontekście powodują dokładnie trzy oczekiwane porażki. |
| Konteksty tworzone ręcznie | 2/2 scenariusze mobile-builder oraz scenariusze wydajności używają monitorowanej fabryki kontekstów. Polityka repozytorium wykrywa ominięcie tej fabryki. |
| Infrastruktura | 26 kontraktów, 6 testów polityki zależności, lint, typecheck i asercje smoke przechodzą. |
| Frontend build i higiena | Build, budżety bundle, Prettier i lint przechodzą. |
| Obraz produkcyjny | `docker build --pull --no-cache --tag broken-ranks-tool:security .`, exit 0. Trivy HIGH/CRITICAL z dostępną poprawką: 0 dla Ubuntu i JAR, exit 0. |
| Rzeczywista integracja na aktualnym obrazie | 35/35, exit 0, 1,7 min. Obejmuje rzeczywiste błędy API w EN, ostrzeżenia reorganizacji, raport planera, wszystkie zadania reorganizacji i cofnięcie, pełny plecak, Doradcę oraz import/eksport. |

Wyniki lokalne i logi znajdują się w ignorowanym `tmp/audit-implementation-*.log`. Nowe zmiany nie zostały jeszcze sprawdzone przez GitHub Actions. Lokalne przejście nie zastępuje wyniku checków konkretnego commita.

Po aktualizacji Vitest i `@vitest/coverage-v8` do 4.1.12 oba audyty npm zgłaszają 0 podatności. Usunięto również trzy wcześniejsze wpisy moderate, wynikające z dwóch podatności `@vitest/mocker`. Po aktualizacji ponownie przeszło 918 testów z pokryciem i progi plików, cztery mutacje, formatowanie, build oraz budżety bundle. Porównanie SHA-256 całego `dist` potwierdziło identyczny wynik produkcyjny. Logi tej aktualizacji: `tmp/vitest-upgrade-*.log`. Trzy wcześniej znalezione high usunięto kompatybilnymi aktualizacjami lockfile.
