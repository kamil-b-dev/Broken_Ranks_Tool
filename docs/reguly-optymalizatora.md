# Reguły optymalizatora drifów

Dokument opisuje zamierzony zakres i semantykę optymalizatora. Reguły gry znajdują się w [regułach ekwipunku](reguly-ekwipunku.md), a zachowanie kalkulatora i walidacji w [zasadach integracji ekwipunku](reguly-integracji-ekwipunku.md). Przed zmianą optymalizatora należy przeczytać wszystkie powiązane dokumenty.

## 1. Zakres trybu „od zera”

Tryb `BUILD_FROM_SCRATCH` układa od zera **wyłącznie drify** na ekwipunku przekazanym w żądaniu. Może zmieniać ich rozmieszczenie i poziomy w granicach reguł domenowych oraz ustawień użytkownika.

Tryb nie dobiera i nie wymienia:

- przedmiotów,
- gwiazdek przedmiotów,
- orbów,
- bazowych statystyk postaci.

Te dane są kontekstem obliczeń. Nie należy rozszerzać zakresu trybu tylko dlatego, że nazwa „od zera” może być interpretowana szerzej. Pełna przebudowa w tym trybie oznacza pełną przebudowę drifów z ich katalogu na aktualnym zestawie przedmiotów.

Epickie i setowe sloty zachowują wbudowane typy drifów. Ich poziomy mogą być podnoszone przez obecną ścieżkę algorytmu, ale ich typów nie wolno zastępować zwykłymi drifami.

### Podtryb prosty i zaawansowany

Tryb „od zera” ma dwa poziomy konfiguracji korzystające z tego samego endpointu i algorytmu:

- `SIMPLE` pozwala wybrać profil (`MAGICAL`, `PHYSICAL_MELEE` albo `PHYSICAL_RANGED`), ważne obszary buildu oraz ich ważność. Dostępne obszary to obrażenia, celność, przeżywalność, zasoby, odporności i użyteczność. Backend rozwija ten wybór na zestaw modów właściwych dla profilu; użytkownik nie przekłada modów ręcznie. Algorytm sam dobiera liczbę, rozmiary, poziomy i rozmieszczenie drifów. Nie stosuje własnych procentów, maksymalizacji, limitów rozmiarów ani wariantów.
- `ADVANCED` udostępnia wagi, łączne zakresy ilości, capy, konkretne procenty, maksymalizację, warianty oraz zakresy ilości dla poszczególnych rozmiarów drifów.

Brak pola poziomu konfiguracji w starszym żądaniu oznacza `ADVANCED`, aby zachować dotychczasową semantykę API. Nowy interfejs domyślnie uruchamia `SIMPLE`. Przełączenie podtrybu nie usuwa ustawień drugiego podtrybu; ustawienia nieaktywnego podtrybu nie mogą wpływać na wyszukiwanie.

Reguły rozwijania prostego profilu są wydzielone w pakiecie `optimization.simpleprofile`. Ocena normalizuje różne rodzaje statystyk względem ich użytecznych celów i stosuje malejącą użyteczność. Dzięki temu mała liczba gniazd jest dzielona między wybrane potrzeby buildu, zamiast bezwarunkowo przeznaczać wszystkie drify na próbę osiągnięcia jednego odległego capa. Przekroczenie celu może dawać niewielką dodatkową wartość, ale każdy kolejny punkt jest mniej cenny. Bezwzględny cap moda pozostaje granicą użyteczności i punkty ponad capem nie poprawiają oceny.

W trybie zaawansowanym użytkownik może dla każdego wybranego moda pozostawić rozmiar bez ograniczeń albo podać osobny zakres `min–max` dla `SUBDRIF`, `BIDRIF`, `MAGNIDRIF` i `ARCYDRIF`. Zakresy są ograniczeniami twardymi i dotyczą wyłącznie zwykłych drifów dobieranych przez tryb „od zera”. Wartość `0–0` zabrania danego rozmiaru, a jednakowe minimum i maksimum wymusza dokładną liczbę. Suma minimów rozmiarów nie może przekraczać łącznego maksimum moda, a suma maksimów nie może być niższa od jego łącznego minimum. Nadal obowiązują tier, gniazda, pojemność i pozostałe reguły domenowe.

## 2. Tryb Doradcy

Tryb `ADVISOR` analizuje aktualny build i proponuje krótkie plany jego ulepszenia. W przeciwieństwie do trybu „od zera” zaczyna od drifów posiadanych przez użytkownika i nie buduje dowolnego nowego układu z całego katalogu.

Doradca:

- oblicza punkt odniesienia dla aktualnego buildu wspólnym kalkulatorem,
- szuka poprawy wskazanego głównego modyfikatora,
- chroni pozostałe obecne mody na zadanych minimach,
- zwraca kilka krótkich planów wraz z listą działań i przeliczonym wynikiem,
- nie stosuje rekomendacji automatycznie.

Podstawowymi, zawsze dostępnymi operacjami są przełożenie drifa do wolnego gniazda oraz zamiana miejscami dwóch posiadanych drifów. Zależnie od opcji użytkownika Doradca może również analizować:

- podnoszenie gwiazdek przedmiotów,
- ulepszanie poziomów posiadanych drifów,
- zakup dodatkowego drifa,
- wymianę przedmiotu.

Włączenie dodatkowej opcji rozszerza zbiór dozwolonych rekomendacji, ale nie zmienia reguł domenowych. Doradca nie usuwa posiadanych drifów ani nie obniża ich poziomów. Nie przekłada i nie ulepsza drifów wbudowanych. Nie proponuje wymiany orbów.

Blokada slotu wyklucza w nim wszystkie rekomendowane zmiany, w tym zmianę przedmiotu, gwiazdek i drifów. Blokada konkretnego drifa zachowuje go w danej pozycji. Każdy prezentowany plan musi respektować blokady i wszystkie reguły ekwipunku.

Cel Doradcy jest określany względem statystyk aktualnego buildu. Użytkownik może maksymalizować efekt głównego moda, podać wartość docelową albo wymagany przyrost. Wartość docelowa głównego moda jest celem planu, natomiast minima chronionych modów są ograniczeniami twardymi dla prezentowanego wyniku. Plan niespełniający chronionych minimów nie może zostać pokazany jako poprawna rekomendacja.

Wyszukiwanie może przejściowo rozważać stan niespełniający minimów, jeżeli kolejne działanie może go skompensować. Ostateczny plan musi jednak przejść walidację i przeliczenie wspólnym kalkulatorem.

Brak zwróconego planu jest dowodem niewykonalności wyłącznie przy statusie `INFEASIBLE`, po pełnym przeszukaniu i autorytatywnej weryfikacji całego badanego zakresu. W pozostałych przypadkach oznacza tylko brak znalezionej poprawy. Limity i sposób wyszukiwania opisują [reguły Doradcy](reguly-doradcy.md), a nie reguły gry.

## 3. Ograniczenia twarde

Wynik nie może naruszać:

- blokady całego slotu ani blokady konkretnego drifa,
- minimalnej i maksymalnej liczby drifów danego typu,
- liczby gniazd przedmiotu,
- pojemności przedmiotu,
- dopuszczalnego rozmiaru i poziomu drifa,
- zakazu powtarzania typu bonusu w jednym przedmiocie,
- ograniczeń położenia drifów żywiołowych,
- pozostałych reguł opisanych w dokumencie domenowym.

Niespełnienie ograniczenia twardego oznacza brak poprawnego wyniku. Nie wolno przedstawiać ani automatycznie stosować takiego układu jako częściowego sukcesu.

## 4. Cele miękkie

Cap oraz wymuszony procent są celami optymalizacji, a nie warunkami poprawności buildu. Algorytm powinien dążyć do ich osiągnięcia zgodnie z priorytetami, ale może zwrócić najlepszy znaleziony poprawny układ, gdy cel jest niemożliwy albo nie został znaleziony w dostępnym budżecie wyszukiwania.

Nieosiągnięcie celu miękkiego:

- nie odrzuca buildu,
- nie oznacza błędu walidacji,
- powinno być widoczne jako ostrzeżenie,
- powinno pokazywać wartość osiągniętą i docelową,
- nie może być komunikowane jako dowód, że cel jest matematycznie niemożliwy.

Tolerancja celu procentowego w trybie „od zera” wynosi obecnie 0,5 p.p. i jest szczegółem tego trybu, nie ogólną regułą domenową.

## 5. Charakter algorytmu i jakość wyniku

Wyszukiwanie produkcyjne jest deterministyczną heurystyką z ograniczonym budżetem operacji. Korzysta z etapów konstrukcji zachłannej, beam search, alokacji poziomów, naprawy wymagań, deterministycznego dopracowania, wypełniania pozostałej pojemności, maksymalizacji wybranych bonusów i przeszukiwania sąsiedztwa.

Zakończenie pełnego zaplanowanego przebiegu heurystyki nie jest dowodem globalnego optimum. Komunikaty nie powinny nazywać wyniku optymalnym, jeżeli algorytm nie ma na to dowodu, na przykład z pełnego przeszukania małej przestrzeni.

Warstwa odpowiedzi i UI powinna rozróżniać co najmniej:

- znalezienie poprawnego najlepszego sprawdzonego układu bez dowodu optimum,
- udowodnione optimum, jeśli dana ścieżka rzeczywiście je potwierdzi,
- zakończenie z powodu wyczerpania budżetu,
- poprawny wynik z nieosiągniętym celem miękkim,
- brak wyniku przez sprzeczne ograniczenia twarde,
- niepoprawne dane wejściowe.

Obecny tryb „od zera” komunikuje wynik jako najlepszy sprawdzony poprawny układ heurystyki i wprost zaznacza brak dowodu globalnego optimum. Nieosiągnięte capy i cele procentowe pozostają ostrzeżeniami celu miękkiego.

Przy rozbudowie kontraktu warto zwracać powód zakończenia, liczbę ocenionych stanów, wykorzystanie budżetu oraz informację, czy optimum zostało udowodnione. Brak dowodu optimum nie oznacza niepowodzenia optymalizacji.

## 6. Walidacja

Walidacja przed wyszukiwaniem powinna odrzucać niepoprawne wejście z precyzyjnym wskazaniem slotu lub ustawienia. Nieprawidłowy slot nie powinien być po cichu pomijany, jeżeli pozostałe sloty pozwalają kontynuować wyszukiwanie.

Przed uruchomieniem heurystyki wykonywana jest bezpieczna kontrola oczywiście nieosiągalnych minimów na podstawie dostępnych przedmiotów i szablonów drifów. Jeżeli ta kontrola nie dowodzi sprzeczności, brak wyniku jest komunikowany jako nieznalezienie układu w dostępnym budżecie, a nie jako dowód jego nieistnienia.

Kontrola uwzględnia również zablokowane i wbudowane drify, pozostałe wolne gniazda oraz łączną liczbę gniazd wymaganą przez minima. Odrzuca też konfigurację, w której zachowywane drify już przekraczają ustawione maksimum. Jest to nadal kontrola bezpieczna, a nie pełny dowód wykonalności wszystkich kombinacji pojemności i typów.

Należy kontrolować co najmniej:

- istnienie przedmiotu i zgodność jego kategorii ze slotem,
- zakres gwiazdek,
- istnienie drifów oraz poprawność ich rozmiarów i poziomów,
- liczbę gniazd, pojemność i duplikaty typu w przedmiocie,
- ograniczenia drifów żywiołowych,
- poprawność nazw slotów i indeksów blokad,
- zgodność blokad z przekazaną konfiguracją,
- zakresy ilości oraz sprzeczności z blokadami i fizycznie dostępnymi gniazdami.

Końcowy setup powinien przechodzić wspólną walidację domenową obejmującą wszystkie reguły, a nie tylko minima ilościowe, pojemność, liczbę gniazd i duplikaty. Walidacja końcowa jest zabezpieczeniem; nie zastępuje generowania wyłącznie poprawnych ruchów podczas wyszukiwania.

Komunikaty powinny odróżniać:

- niepoprawne dane wejściowe,
- sprzeczne lub niemożliwe ograniczenia twarde,
- nieznalezienie rozwiązania w budżecie heurystyki,
- nieosiągnięcie celu miękkiego.

## 7. Ocena i kalkulator

Priorytety określają względną wartość modyfikatorów. Minima i maksima ilościowe pozostają ograniczeniami twardymi. Cap, wskazany procent i maksymalizacja wpływają na ocenę kandydatów zgodnie ze swoją semantyką.

Samo wyszukiwanie może korzystać z modelu wkładu drifów, lecz wynik prezentowany użytkownikowi musi być zweryfikowany wspólnym kalkulatorem ekwipunku. Statystyki końcowe muszą uwzględniać przedmioty, gwiazdki, orby, drify, bazowe statystyki postaci i globalną karę za powtórzenia.

Jeżeli katalog zawiera kilka szablonów drifa tego samego typu pasujących do danego przedmiotu, optymalizator wybiera wariant dający największą wartość przy najwyższym poziomie mieszczącym się w pojemności slotu. Sam większy rozmiar kamienia nie przesądza o wyborze.

## 8. Zmiany i testy

Przy zmianie algorytmu należy zachować testy małych przestrzeni porównujące heurystykę z niezależnym pełnym przeszukaniem. Testy korzystające z tych samych funkcji oceny co kod produkcyjny nie są samodzielnym dowodem poprawności.

Zmiana walidacji powinna zawierać test pozytywny i test każdej nowej klasy błędu. Zmiana komunikowania jakości wyniku powinna testować osobno sukces heurystyki, wyczerpanie budżetu, niespełniony cel miękki i brak rozwiązania dla ograniczeń twardych.

Przy zmianie zakresu lub semantyki optymalizatora aktualizuj ten dokument razem z kodem. Przy zmianie reguł gry aktualizuj również [reguły ekwipunku](reguly-ekwipunku.md).
