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

- `SIMPLE` pozwala wybrać profesję (`BARBARIAN`, `KNIGHT`, `ARCHER`, `FIRE_MAGE`, `DRUID`, `SHEED` albo `VOODOO`) i nieliczne decyzje właściwe dla jej profilu. Jest wyłącznie nakładką budującą deterministyczną konfigurację tych samych priorytetów, zakresów ilości, capów i celów procentowych, które przyjmuje tryb zaawansowany; po rozwinięciu profilu oba podtryby korzystają z identycznej oceny i wyszukiwania. Użytkownik wybiera preferowaną liczbę drifów głównych obrażeń i celności w zakresie `1–12`, a algorytm maksymalizuje efekt uzyskany z nie większej liczby takich kamieni. Jest to preferencja miękka: słabszy ekwipunek może pomieścić mniej drifów, co ma zostać pokazane w raporcie bez odrzucania poprawnego buildu. Rycerz i Druid mają wariant ofensywny i defensywny. Barbarzyńca wybiera obowiązkowy żywioł broni, a Sheed może opcjonalnie wybrać żywioł. Dostępne są osobne przełączniki redukcji obrażeń biernych i procentowych; ich włączenie wymaga dokładnie jednego odpowiedniego drifa. Łucznik, Sheed i Voodoo mogą dodatkowo włączyć Holma oraz Farida. Tryb prosty nadal nie udostępnia własnych procentów, ręcznych wag, limitów rozmiarów ani wariantów.
- `ADVANCED` udostępnia wagi, łączne zakresy ilości, capy, konkretne procenty, maksymalizację, warianty oraz zakresy ilości dla poszczególnych rozmiarów drifów.

Brak pola poziomu konfiguracji w starszym żądaniu oznacza `ADVANCED`, aby zachować dotychczasową semantykę API. Nowy interfejs domyślnie uruchamia `SIMPLE`. Przełączenie podtrybu nie usuwa ustawień drugiego podtrybu; ustawienia nieaktywnego podtrybu nie mogą wpływać na wyszukiwanie.

Reguły rozwijania prostego profilu są wydzielone w pakiecie `optimization.simpleprofile`. Każda profesja otrzymuje wspólny rdzeń: jeden drif redukcji właściwego zasobu (Druid preferuje dwa), jeden drif redukcji szansy otrzymania krytyka z granicą użyteczności `9,5%` oraz jeden drif redukcji otrzymywanych obrażeń krytycznych. Teld, Band, Dur i Alorn są rozwijane równolegle według postępu do własnych capów, aby algorytm nie maksymalizował jednego z nich kosztem symbolicznej wartości pozostałych. Punkty ponad capem nie poprawiają oceny.

Domyślne liczby drifów obrażeń/celności wynoszą: Barbarzyńca `7/6`, Łucznik `7/7`, Mag Ognia `7/6`, Sheed `7/7`, Voodoo `7/7`, ofensywny Rycerz i Druid `6/5`, defensywny Rycerz i Druid `4/4`. Barbarzyńca używa obrażeń fizycznych i trafienia wręcz, Łucznik obrażeń fizycznych i trafienia dystansowego, Mag Ognia obrażeń magicznych i trafienia dystansowego, Sheed obrażeń fizycznych i trafienia wręcz, a Druid i Voodoo obrażeń magicznych i trafienia mentalnego. Ofensywny Druid oraz Voodoo dążą do capa przełamania odporności na uroki. Defensywny Rycerz i Druid zwiększają udział redukcji obrażeń biernych, Alorna i Holma.

Przełączenie stylu Rycerza lub Druida aktualizuje każdą liczbę obrażeń/celności, która nadal odpowiada domyślnej wartości poprzedniego stylu. Niestandardowe liczby pozostają zachowane. Import niepełnego profilu uzupełnia brakujące liczby według jego stylu. Redukcja bierna jest domyślnie włączona w stylu defensywnym, ale nadal wymaga dokładnie jednego drifa; ma wyższy priorytet niż w stylu ofensywnym, a nie ukryty cel 60%.

Zastosowanie wariantu wymaga zgodności bazowych statystyk postaci i blokad z obliczeniem, z którego wariant pochodzi. Aktualny ekwipunek musi odpowiadać buildowi bazowemu, zastosowanemu wynikowi głównemu albo jednemu z wariantów tego obliczenia. Ręczna zmiana buildu poza tym zakresem wymaga ponownego uruchomienia optymalizatora. Ta zasada obejmuje Doradcę i tryb zaawansowany.

Teld, Band, Alorn i Dur są przekazywane do wspólnego rdzenia jako maksymalizowane statystyki z naturalnym capem. Wartość ponad capem nie poprawia oceny i przegrywa z układem, który tę samą pojemność lub gniazdo wykorzystuje do poprawienia użytecznej statystyki. Starsze ogólne identyfikatory profili pozostają obsługiwane wyłącznie dla zgodności zapisanych żądań i są migrowane przez frontend do najbliższej profesji.

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

### Dokładny solver deweloperski

Dokładny solver jest narzędziem referencyjnym umieszczonym wyłącznie w źródłach testowych backendu. Nie jest beanem Springa, nie ma kontrolera ani endpointu i nie może być uruchomiony przez frontend lub żądanie produkcyjne.

- Małe, jawnie ograniczone przestrzenie są automatycznie sprawdzane w standardowym `mvn test` i w CI.
- Każde automatyczne przeszukanie ma twardy limit czasu i liczby ocenionych stanów.
- Status `OPTIMAL` oznacza pełne przejście przestrzeni i stanowi dowód optimum dla modelu testu. `INFEASIBLE` oznacza pełne przejście bez poprawnego stanu. `TIME_LIMIT` nie jest dowodem optimum ani niewykonalności.
- Większy benchmark uruchamia się świadomie profilem `mvn -Poracle-tests test`. Nie należy dodawać go do zwykłej ścieżki CI.
- Eksportowany build można sprawdzić benchmarkiem `OptimizationRealBuildExactBenchmark`, przekazując ścieżki we właściwościach `optimizer.build` i `optimizer.config` oraz budżety `optimizer.exact.seconds` i `optimizer.exact.max-states`. Benchmark zawsze ocenia wynik heurystyki jako punkt startowy, ale raportuje dowód wyłącznie po zakończeniu pełnego przeszukania ze statusem `OPTIMAL`.
- Domyślnym silnikiem benchmarku realnego buildu jest testowy CP-SAT. Odwzorowuje legalne wybory kamieni oraz leksykograficzną kolejność jakości: deficyt celów, najniższy znormalizowany postęp wśród maksymalizowanych modów, łączny ważony postęp maksymalizowanych modów, ważoną użyteczność, stratę od kary powtórzeń, nadmiar ponad capy i wykorzystanie pojemności. Dzięki temu jeden maksymalizowany mod nie może zostać poświęcony wyłącznie dla zwiększenia innego. Udowodniony prefiks celów można przekazać przez `optimizer.cp-sat.proven-objectives`, aby wznowić kosztowny dowód bez ponownego rozwiązywania wcześniejszych poziomów. Prefiks musi zawierać dokładne całkowite wartości raportowane przez solver, a nie procenty zaokrąglone na potrzeby interfejsu. Benchmark zrównoważonego Maga Ognia automatycznie wczytuje zapisany wzorzec z katalogowej bazy jako hint; hint przyspiesza znalezienie incumbenta, ale sam nie jest dowodem ani ograniczeniem celu.
- Każdy znaleziony przez CP-SAT poprawny wynik jest zapisywany obok pliku wejściowego jako `<nazwa>-optimized.json`, w tym samym formacie `broken-ranks-tool-build` obsługiwanym przez importer aplikacji. Eksport zachowuje konfigurację postaci, blokady, przedmioty, gwiazdki i orby, a zastępuje `requestData` setupem zwróconym przez wspólny mapper wyniku. Docelową ścieżkę można nadpisać właściwością `optimizer.output`.
- Diagnostyka może zatrzymać się po wybranej liczbie kryteriów przez `optimizer.cp-sat.objective-limit`, zamrozić wektor liczności przez `optimizer.cp-sat.fixed-counts` albo bezpośrednio próbować wykluczyć wynik lepszy od incumbenta przez `optimizer.cp-sat.prove-objective-index` i `optimizer.cp-sat.prove-incumbent`. Optimum przy zamrożonych licznościach jest wyłącznie optimum warunkowym; globalny dowód wymaga dodatkowo wykluczenia lepszego rozwiązania dla wszystkich innych dopuszczalnych wektorów.
- Benchmark zrównoważonego Maga Ognia przyjmuje analogiczny wektor przez `optimizer.fire-mage.balanced.fixed-counts`. W trybie dowodowym usuwa warianty zdominowane oraz zastępuje funkcję kary stałym mnożnikiem dla zamrożonych liczności. Wynik pojedynczego przebiegu wolno uznać za globalny wyłącznie wtedy, gdy podział obejmuje wszystkie dopuszczalne wektory i każdy przypadek został rozstrzygnięty bez limitu czasu.
- Dla dużego rzeczywistego buildu liczba wariantów może przekroczyć zakres `long`. Zatrzymanie po limicie ma wtedy służyć porównaniu znalezionych wyników, a komunikat `proof_unavailable` musi pozostać jednoznaczny; nie wolno na tej podstawie ogłaszać optimum.
- Wyniki solvera służą do wykrywania regresji, strojenia heurystyki i profili oraz mierzenia luki jakościowej. Nie zmieniają komunikatów produkcyjnego optymalizatora.
