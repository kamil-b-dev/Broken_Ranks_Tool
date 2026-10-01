# Audyt backend–frontend — 2026-10-01

## Zakres

Przegląd objął wszystkie endpointy używane przez frontend: inicjalizację danych, kalkulator, optymalizację i anulowanie Doradcy. Porównano trasy i nagłówki, DTO i kontrakt OpenAPI, katalog i reguły gry, publikowanie slotów, import plików i biblioteki, statystyki postaci, tryby prosty i zaawansowany, Doradcę, blokady, warianty, ostrzeżenia oraz reakcję na spóźnione odpowiedzi. Przejrzano również dodatkowe endpointy katalogu i konfigurację wspólnego pochodzenia API (proxy Vite oraz frontend dołączony do aplikacji w Dockerze).

Poprzednie poprawki optymalizatora i odczytów SQL są opisane w [osobnym audycie](audyt-optymalizatora-2026-10-01.md).

## Nowe błędy i poprawki

| Obszar | Potwierdzony problem | Poprawka |
| --- | --- | --- |
| Reset kalkulatora | Unieważnione żądanie nie wyłączało wskaźnika obliczeń. | Reset od razu kończy lokalny stan oczekiwania. |
| Przywracanie wyniku | Odpowiedź wcześniejszego kalkulatora mogła zastąpić przywrócone statystyki. | Przywrócenie unieważnia starsze odpowiedzi i błędy. |
| Edycja podczas obliczeń | Błąd poprzedniego buildu mógł być pokazany po zmianie danych. | Zmiana wejścia unieważnia poprzednie przeliczenie. |
| Przeciąganie przedmiotów | Edytor przyjmował przedmiot spoza katalogu właściwego slotu. | Sprawdza identyfikator w filtrowanej liście przedmiotów. |
| Przeciąganie drifów | Można było powtórzyć zwykły typ drifa, mimo blokady tej kombinacji w formularzu i backendzie. | Odrzucane są duplikaty w aktywnych gniazdach i pozycje poza nimi. Podmiana w tym samym gnieździe pozostaje dozwolona. |
| Publikowanie slotu | Usunięty drif pozostawiał poziom bez kamienia. | Publikowane są poziomy tylko zajętych gniazd, a pusty przedmiot nie publikuje kamieni. |
| Wskazanie pojemności | Ukryty po obniżeniu gwiazdek drif oraz importowane drify wbudowane obciążały licznik. | Licznik obejmuje wyłącznie aktywne gniazda zwykłych drifów. Zamknięte gniazdo jest czyszczone, aby kamień nie wracał po ponownym podniesieniu gwiazdek. |
| Import natywny | Nieznane statystyki postaci, identyfikator 0, nadmiar pozycji i drify poza gniazdami przechodziły walidację frontendu. | Import odrzuca te przypadki przed wywołaniem API. |
| Starsze kontenery poziomów | Import akceptował tablicę drifów albo mapę orbów, ale przekazywał kontener niezgodny z DTO. | Po walidacji poziomy są normalizowane do mapy drifów i tablicy orbów. |
| Import z gry | Omijał walidację wyposażenia stosowaną dla plików natywnych. Jawne zero statystyki zastępował wartością domyślną. | Oba formaty mają tę samą walidację, a jawne zero jest zachowywane. |
| Punkty postaci | Ogromne lub nieskończone wartości mogły zablokować pętlę przycinającą punkty; ułamki naruszały całkowitoliczbowy budżet. | Normalizacja ogranicza liczbę operacji oraz zakres punktów, a następnie przycina budżet do poziomu. |
| Otwarcie panelu postaci | Panel publikował wartości domyślne przed synchronizacją zapisanego rozkładu; istniejące statystyki bez rozkładu również mógł zastąpić przy otwarciu. | Widok zaczyna od zapisanego rozkładu, import nie publikuje nowych statystyk, ręczne akcje nadal je aktualizują. |
| Kalkulator: wbudowane drify | Pusta lista omijała sprawdzenie wymaganych drifów EPIC/SET. Luki w pozycjach były kompaktowane. Doradca również akceptował puste pozycje przy właściwej długości listy. | Walidatory wymagają pełnej, prawidłowej listy bez luk. |
| Poziomy kamieni | Kalkulator ignorował poziom pustego gniazda i klucze typu `00`; Doradca i optymalizator nie wykrywały wszystkich analogicznych przypadków. | Ujednolicono kontrolę zajętych pozycji i kanonicznych indeksów w zakresie sprawdzanym przez dany tryb. |
| Statystyki kalkulatora | Akceptowana nazwa `siła` zmieniała wielkość liter klucza w odpowiedzi API; pusty zestaw slotów omijał walidację statystyk. | Nazwy są kanonizowane, a walidacja poprzedza obsługę pustego wyposażenia. |
| DTO i OpenAPI | DTO dopuszczało 0 gwiazdek, a dalsza walidacja odrzucała taki przedmiot. OpenAPI wymagało priorytetów również dla nazwanego profilu prostego i pomijało granice statystyk. | Zakres gwiazdek to 1–9; kontrakt opisuje rozwijanie profilu na backendzie oraz zakres 0–50 000. |

## Sprawdzenie rzeczywistego API

Lokalny backend uruchomiono z katalogiem SQLite w trybie tylko do odczytu. Moduły frontendu zostały załadowane przez Vite, aby żądania powstały z rzeczywistych funkcji importu i budowania konfiguracji.

- `build.json`: import i kalkulator poprawne, 12 slotów.
- `broken-ranks-build-2026-09-30.json`: import i kalkulator poprawne, 12 slotów.
- Prosty Łucznik 12/12, redukcja procentowa i Holm: **4,23 s** razem z kontrolnym przeliczeniem.
- Zaawansowany, priorytet szansy krytycznej: **1,36 s** razem z kontrolnym przeliczeniem.
- Doradca, szansa krytyczna i domyślne dozwolone zmiany: **2,75 s** razem z kontrolnym przeliczeniem.

W każdym z trzech trybów `calculationResult` był identyczny ze świeżym wynikiem `/calculator/calculate` dla zwróconego setupu, razem z kategoriami drifów i bonusami orbów. Są to pomiary lokalne różnych konfiguracji; nie są porównaniem równoważnych celów ani pomiarem hostingu.

Prosty przebieg zwrócił poprawny układ z ostrzeżeniem dotyczącym preferowanej liczby drifów. `summary.success=false` oznacza tu nieosiągnięcie wszystkich celów, a nie brak poprawnego buildu. Frontend zachowuje i stosuje ten wynik oraz pokazuje ostrzeżenia; potwierdzono istniejące testy tego zachowania.

## Weryfikacja

- Backend: pełne Maven `verify`, **412 testów**, bez błędów, próg JaCoCo spełniony, Spotless poprawny, rzeczywisty kod wyjścia **0**.
- Frontend: pełny zestaw **341 testów** bez błędów, pełny ESLint, `format:check` oraz build produkcyjny zakończone kodem **0**.
- Przeglądarka: **9/9** istniejących testów Chromium, obejmujących nawigację, inicjalizację, błędy API, widok mobilny, assety, dostępność i zastosowanie planu Doradcy. Odpowiedzi API w tym zestawie są kontrolowane; osobno wykonano opisane wyżej sprawdzenie prawdziwego backendu.

Audyt nie stanowi dowodu poprawności wszystkich możliwych konfiguracji ani pomiaru zachowania usługi pod obciążeniem produkcyjnym.
