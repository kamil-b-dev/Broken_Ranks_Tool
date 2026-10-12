# Wydajność mobilnego interfejsu — 9 października 2026

Największe znalezione problemy dotyczyły renderowania całej listy przedmiotów, ładowania kodu desktopu na telefonie oraz grafik znacznie większych niż ich rozmiar na ekranie. Poprawki zmniejszają koszt uruchomienia i opóźnienia interakcji w kreatorze.

## Pomiary przed i po zmianach

Build produkcyjny z `npm run build`, lokalny `vite preview`, Chromium z profilem Pixel 7, CPU spowolnione czterokrotnie przez CDP. Każda z trzech prób używała nowego kontekstu przeglądarki. Katalog testowy zawierał 1500 hełmów; API było zastąpione lokalną odpowiedzią. Czasy poniżej są medianami trzech prób.

| Pomiar | Przed | Po |
| --- | ---: | ---: |
| Zasoby startowe kreatora, po dekompresji, bez API | 2,66 MB | 0,79 MB |
| JavaScript pobrany na start, po dekompresji | 467 kB | 345 kB |
| Otwarcie wyszukiwarki, od tapnięcia do dostępnych wyników | 1017 ms | 219 ms |
| Najdłuższa zarejestrowana interakcja w próbie | 864 ms | 152 ms |
| Pierwsze wyświetlenie treści (FCP) | 632 ms | 440 ms |
| Liczba przycisków przedmiotów w DOM | 1500 | 40 |

Rozmiary pochodzą z `PerformanceResourceTiming.decodedBodySize`; nie są rozmiarem transferu po kompresji HTTP ani pamięcią zdekodowanych obrazów. Pomiar interakcji korzysta z Event Timing i obejmuje otwarcie edytora, otwarcie wyszukiwarki oraz wpisanie frazy. Nie jest pomiarem INP rzeczywistych użytkowników. Czas otwarcia uwzględnia również obsługę akcji przez Playwright. FCP z lokalnego serwera jest szczególnie zależny od obciążenia komputera.

## Wprowadzone zmiany

- Desktop jest osobnym modułem ładowanym tylko po wybraniu tej prezentacji. Mobilny optymalizator i biblioteka buildów ładowane są przy pierwszym otwarciu odpowiedniego widoku. Stan ekwipunku pozostaje we wspólnym providerze.
- Wyszukiwarka pokazuje maksymalnie 40 przedmiotów na stronie. Przeszukuje cały katalog, zeruje numer strony przy zmianie frazy i zachowuje stronę po powrocie ze szczegółów. Indeks tekstowy jest przygotowywany raz dla danego katalogu.
- Mobile używa osobnych, mniejszych ikon, herbu, atlasu slotów i tekstur. Grafiki desktopu pozostają dostępne w dotychczasowej jakości. Warianty mobilne odtwarza `npm run assets:optimize:mobile`.
- Testy sprawdzają dostęp do przedmiotów z ostatniej strony i końca katalogu oraz brak pobierania desktopu, optymalizatora i biblioteki podczas otwierania mobilnego kreatora.

## Granice oceny

Wyniki potwierdzają poprawę w lokalnym teście obciążeniowym. Nie obejmują czasu odpowiedzi produkcyjnego API, obliczeń backendu, sieci komórkowej ani Safari na fizycznym iPhonie. Podział CSS według widoków został wykonany podczas pełnego wdrożenia audytu opisanego poniżej. Rzeczywistą płynność przewijania i wpływ na baterię należy ocenić na urządzeniach fizycznych.

## Weryfikacja zmian

Build produkcyjny, kontrola budżetu rozmiaru, ESLint zmienionych plików oraz `npm run format:check` zakończyły się kodem 0. Sprawdzono zrzuty mobilnego startu, kreatora i stronicowania przy szerokości 320 px; kontrola Axe nowej nawigacji nie wykazała naruszeń WCAG A/AA.

Pełny zestaw testów frontendu miał 404 zaliczone testy i jeden timeout podczas pierwszego dynamicznego importu. Po dostosowaniu oczekiwania na moduł testy integracji mobile przeszły 3/3; testy aplikacji i wyszukiwarki przeszły 11/11. Z 19 wybranych testów E2E dwa początkowo nie zdążyły załadować desktopu. Osobne powtórzenie testu motywów oraz powtórzenie testu klawiatury po dodaniu oczekiwania na link pominięcia treści zakończyły się powodzeniem. Nowy test dużego katalogu przeszedł również po dodaniu kontroli dostępności i szerokości 320 px.

## Pełne wdrożenie ustaleń audytu

Zrealizowano 29 wpisów audytu, łącząc M07 z jego rozszerzeniem N05. Zmiany obejmują stabilną identyfikację danych kalkulatora, kolejność importów, lokalne zatwierdzanie poziomu postaci, grupowanie zapisów, izolację subskrypcji i renderów, cache potencjału modów, mniejsze grafiki oraz ładowanie kodu i stylów według widoku. Desktop utrzymuje jeden aktywny edytor i najwyżej 60 wierszy bazy na stronie. Ukryte zakładki porównywarki oraz ikony mobilnych kontrolek nie są montowane. Samodzielny licznik czasu aktualizuje wyłącznie własny komponent i zatrzymuje zegar w ukrytej karcie.

Pomiar końcowy wykonano na lokalnym buildzie produkcyjnym, w świeżych kontekstach Chromium, z tym samym katalogiem testowym. Dane API pozostają wyłączone z podanych rozmiarów. Kolumna „przed” dotyczy stanu po pierwszej optymalizacji, przed pełnym wdrożeniem audytu.

| Widok | Przed | Po |
| --- | ---: | ---: |
| Mobilny Start | 698 kB | 533 kB |
| Mobilny kreator | 788 kB | 677 kB |
| Desktopowy Start | 1328 kB | 473 kB |
| Desktopowy kreator | 4800 kB | 2064 kB |

Główny CSS zmalał ze 163 kB do około 58 kB bez kompresji. Produkcyjny output wynosi 4,29 MB, w tym 2,83 MB zasobów strony i 1,47 MB karty społecznościowej. Koszt JavaScript podczas 20 ruchów myszy z tooltipem, przy CPU spowolnionym czterokrotnie i katalogu 174 przedmiotów, spadł z 446 ms do 43 ms. Wynik obejmuje również stronicowanie listy — po zmianie zamontowanych było 60 wierszy zamiast 174. To pojedyncza próba diagnostyczna, nie pomiar INP użytkowników.

Końcowa weryfikacja:

- 415 testów w 83 plikach przeszło; `test:coverage` i wszystkie progi dla plików zakończyły się kodem 0. Pokrycie: 95,82% instrukcji, 86,95% gałęzi, 95,59% funkcji i 97,41% linii. Czyste testy domenowe działają w Node, a komponenty i hooki w jsdom.
- Pełny przebieg E2E zaliczył 30 z 33 scenariuszy. Trzy przypadki WebKit sprawdzono osobno: duży katalog przeszedł bez zmiany aplikacji; dwa testy fokusu przeszły po jawnym wskazaniu przycisku otwierającego dialog. Po tych poprawkach przeszły również trzy powiązane scenariusze Chromium.
- Cztery nowe scenariusze `npm run test:performance` przeszły na produkcyjnym buildzie: budżety mobilnych widoków, ograniczenie DOM desktopu, wynik importu i zachowanie punktów oraz brak pobierania ukrytych ikon.
- Build, ESLint, Prettier i budżet outputu przeszły. Skontrolowano wizualnie mobilny i desktopowy kreator.

WebKit jest dodatkową weryfikacją silnika przeglądarki; nie zastępuje testu fizycznego iPhone'a. Nie uruchamiano w tej zmianie scenariuszy wymagających rzeczywistego backendu na porcie 8082. Reguły gry i algorytmy backendu pozostały bez zmian.
