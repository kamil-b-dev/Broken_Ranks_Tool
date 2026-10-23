# Ścieżka rozwoju ekwipunku

Widok `/progression-path` przyjmuje jeden docelowy build z kreatora, biblioteki
lub pliku. Sam generuje wcześniejsze wyposażenie od poziomu 1 i pokazuje plan
w kolejności gry: zakupy, zakładanie przedmiotów, ulepszenia i przenoszenie kamieni.
Jest osobną funkcją, niezależną od trybów optymalizatora.

## Przygotowanie

1. W polu „Docelowy build” wybierz aktualny kreator, zapisany build lub plik. Wybór od razu wczytuje cel; pole pokazuje jego nazwę. Broń z jednoznaczną profesją ustawia ją przy imporcie.
2. Sprawdź poziom celu; pochodzi z konfiguracji postaci, a przy jej braku wynosi 140.
3. Opcjonalnie zarezerwuj `ring1`, `ring2` lub `necklace` jako „res”.
4. Opcjonalnie włącz „Równomierny rozwój statystyk”. Domyślnie działa dotychczasowe układanie.
5. Opcjonalnie ustaw odstęp wymian przedmiotów w poziomach. 0 zachowuje wszystkie dotychczasowe etapy.
6. Uruchom planowanie. Nie trzeba wskazywać buildu początkowego ani etapów pośrednich.

Rezerwacja „res” zastępuje przedmiot katalogowy w odłączonym celu planera;
nie zmienia oryginalnego buildu. Na całej ścieżce blokuje przedmiot, orby i drify
w tym slocie. Synergetyk nie jest dodawany do bazy ani wyceniany, a jego nieznane
statystyki nie trafiają do kalkulatora. Projekt i raport zachowują oznaczenie.

Zwykłe przedmioty są celowo pominięte. Plan zaczyna się od poziomu 1, ale zakupy
pojawiają się dopiero przy pierwszym uwzględnianym przedmiocie. Puste sloty
wcześniejszych etapów nie są zaleceniem gry bez zwykłego wyposażenia.

## Kolejne przedmioty i gwiazdki

Katalog jest odczytywany raz na analizę. Planner tworzy prawie liniowe ciągi dla
slotów, uwzględniając dostępność profesji, profil statystyk oraz dokładny cel.
Przedmioty z wymaganiami różniącymi się o maksymalnie trzy poziomy od początku
grupy są traktowane jako pobliskie alternatywy. Z grupy wybierany jest jeden:
najpierw zgodność profilu z celem, potem suma udziałów jego bazowych statystyk
w odpowiadających dodatnich statystykach celu (każdy udział ograniczony do 1).
Zamienniki do trzech poziomów przed wybranym celem lub epikiem są pomijane,
aby nie zalecać zakupu tuż przed zaplanowaną wymianą.
Remis rozstrzyga wcześniejszy poziom, następnie ID. To jawna heurystyka wyboru,
a nie reguła gry ani dowód najlepszej ścieżki. Kolejne zmiany slotów są scalane
na wspólnej osi poziomów.

Ustawienie `minItemLevelGap` (0–140) pomija przedmioty przejściowe używane krócej
niż wskazana liczba poziomów. Działa osobno w każdym slocie, po wyborze pobliskich
alternatyw. Od celu wstecz zachowywany jest kolejny przedmiot oddalony od następnego
zachowanego zakupu o co najmniej ustawiony odstęp. Przy odstępie 20 w magicznych
hełmach znika Martumal na 20, zastępowany przez Khalama na 32 po 12 poziomach;
pozostaje m.in. Htagan na 100 przed Miłością Morany na 120. Różnica równa progowi
jest zachowywana. 0 wyłącza dodatkowe pomijanie, a 140 może pozostawić wyłącznie
cel i obowiązkowy epik poprzedzający legendę.

Cel, epik na 120 i legenda na 140 są obowiązkowe. Filtr nie ukrywa gotowych kart:
usuwa zakupy przed wyznaczeniem konfiguracji kamieni. Drify i orby są przeliczane
na skróconej ścieżce, także przy równomiernym rozwoju statystyk. Puste sloty przed
pierwszym zachowanym zakupem nadal oznaczają zwykłe wyposażenie poza katalogiem.
Zmiany w różnych slotach mogą być blisko siebie na wspólnej osi poziomów.

Dla docelowej legendy broń prowadzi przez epik tej samej nazwy i profesji.
Plan zakłada pozyskanie epika na poziomie 120 i legendy na poziomie 140:
Gorthdar, Allenor, Imisindo, Żmij, Latarnia Życia, Washi i Attawa. Wymagania
noszenia z katalogu (60 i 120) nie wyznaczają tych terminów. Wcześniejsza rzadka
broń jest dobierana do poziomu 120. Cel z epikiem poniżej 120 lub legendą poniżej
140 wymaga podniesienia poziomu celu; nie jest po cichu przesuwany ani zmieniany.
Rzadka broń o wyższym poziomie
nie jest automatycznym następcą epika. Epik docelowy kończy swoją ścieżkę przed
legendą; planner nie dopisuje rzeczy poza celem.

Przedmioty przejściowe mają 1★. Gwiazdki docelowego przedmiotu są planowane po
jego uzyskaniu, jeżeli katalog nie zawiera późniejszego zgodnego następcy,
który nie pogarsza żadnej dodatniej bazowej statystyki i poprawia choć jedną;
w pozostałych przypadkach dopiero w dokładnym końcowym celu. Wyjątkiem jest
epik prowadzący do legendy ma 9★ już od poziomu 120. Na poziomie 140 następuje
ulepszenie do legendy z resetem do 1★. Dopiero potem podnoszone są gwiazdki legendy do
wartości wskazanej w celu. Inne warunki tej przemiany nie są modelowane,
zgodnie z uzgodnionym zakresem.

Jeżeli sam epik jest dokładnym celem, jego wybrane gwiazdki obowiązują od poziomu 120.
Docelowy epik 9★ nie czeka z gwiazdkowaniem do końcowego poziomu ścieżki.

Legenda zachowuje maksymalnie trzy zwykłe drify wybrane przez użytkownika w docelowym
buildzie, wraz z ich poziomami. Łączna moc musi mieścić się w pojemności przy wybranych
gwiazdkach. Układ przekraczający pojemność jest odrzucany; planner nie usuwa wybranych
drifów ani nie obniża ich poziomów w celu dopasowania celu.

## Drify, orby i punkty postaci

### Opcjonalny równomierny rozwój statystyk

Opcja `balanceStats` zmienia dobór i poziomy zwykłych drifów na etapach pośrednich.
Kolejność przedmiotów, gwiazdki, terminy epika i legendy, punkty postaci i dokładny
cel pozostają takie same. Orby są projektowane jak dotąd; ich wkład jest
uwzględniany przy ocenie drifów. Bez opcji działa wcześniejsza projekcja, w tej
samej kolejności kamieni i slotów.

Równomierność oznacza zbliżony postęp względem wartości bonusów drifów w celu,
z odjęciem domyślnej bazy (np. 2% krytyka). Nie oznacza identycznych procentów
wszystkich statystyk. Oceniane są typy z docelowych zwykłych i wbudowanych drifów.
Wbudowane bonusy, przedmioty, orby, globalna kara powtórzeń i capy są liczone
wspólnym kalkulatorem; redukcje zużycia many i kondycji mają ujemny kierunek
korzyści. Postęp jest ograniczony do zakresu 0–1. Nadwyżka jednego bonusu nie
zastępuje brakującego innego. Użyteczność `log(1 + 9 × postęp)` daje większą
wartość poprawie zaniedbanej statystyki.

Heurystyka najpierw osadza kamienie do poziomu 6 (lub niższego późniejszego
limitu konkretnej sztuki), aby nie zużyć całej pojemności na pierwszy bonus.
Następnie podnosi poziomy o kolejny próg mocy, wybierając największy przyrost
użyteczności na dodatkową jednostkę pojemności. Każda propozycja przechodzi
wspólny kalkulator. Limity rozmiaru i poziomu sztuk są nadal przenoszone wstecz,
a wszystkie operacje sprawdzane w przód. Opcja nie wprowadza obniżania kamieni
ani osobnych niezależnych optymalizacji etapów.

To przybliżone wyrównanie, ograniczone dostępnością bonusów w celu, gniazdami,
pojemnością i stałymi bonusami epika. Nie gwarantuje równych proporcji ani
globalnego optimum. Raport oznacza wariant jako `BALANCED_BACKWARD_PROJECTION`
i nadal zwraca `proofComplete: false`.

### Projekcja wspólna dla obu wariantów

Konfiguracje kamieni są projektowane wstecz od celu: rozmiar i poziom wcześniejszej
sztuki nie przekraczają jej najmniejszego późniejszego użycia. Planner preferuje
dotychczasowy slot, dobiera największy pasujący rozmiar i istotny poziom, sprawdza
gniazda, tier, pojemność, bonusy i ograniczenia żywiołów. Orby zachowują globalną
unikalność typu. Kamień, który chwilowo nie ma miejsca, może wrócić w późniejszym
etapie. Wbudowane bonusy docelowego epika mogą uzasadniać wcześniejszy drif
przejściowy, ale sam wbudowany drif pozostaje częścią przedmiotu.

Następnie operacje są odtwarzane w przód od pustej puli posiadanych kamieni.
Każda zwykła sztuka ma własne ID; wyjęcie poprzedza zmianę przedmiotu i osadzenie
w zajętym gnieździe. Poziom i rozmiar mogą rosnąć, lecz nigdy maleć. Orby epika są
wymienne; jego wbudowane drify nie stają się zwykłymi drifami legendy. Raport
oddzielnie pokazuje operacje drifów i orbów, w kolejności wykonania.

Wcześniejsze punkty znanych atrybutów są proporcjonalną, zaokrągloną w dół częścią
przydziału docelowego; niewydane punkty pozostają niewydane. Jest to projekcja
przydziału, nie optymalizacja rozwoju postaci. Końcowy etap zachowuje dokładne
statystyki docelowe, gwiazdki, przedmioty i konfiguracje kamieni (po nałożeniu res).
Wszystkie etapy przechodzą wspólną walidację i kalkulator statystyk.

Plan nie korzysta z plecaka jako posiadanych zasobów: opisuje drogę od początku
gry. Nie wycenia rynku, materiałów ani działań i nie deklaruje najtańszej lub
globalnie najlepszej drogi. Nie ma osobnego wyszukiwania każdego etapu przez
optymalizator. Liczba etapów jest ograniczona do 160, prób projekcji do 100 000;
przekroczenie limitu nie zwraca fragmentu jako pełnej ścieżki.

## Czytanie raportu

Raport grupuje kolejne konfiguracje na tym samym poziomie w jedną kartę.
Domyślnie rozwinięty jest najbliższy etap z działaniami, pozostałe są zwinięte.
Nagłówek podaje poziom, zmieniane przedmioty i liczbę rzeczy do przygotowania,
ulepszenia oraz przeniesienia. Sekcje „Przygotuj”, „Ulepsz”, „Przenieś” pokazują
krótką listę decyzji. Nowe kopie tego samego kamienia są zliczane jako sztuki;
osadzenie nowo pozyskanego kamienia nie jest dodatkowym zakupem. Wyjęcie i ponowne
osadzenie istniejącej sztuki jest podsumowywane jako jedno przeniesienie.
„Przenieś” zajmuje osobny obszar pod przygotowaniem i ulepszaniem. Karty są pogrupowane
według przedmiotu docelowego; każdy wiersz wskazuje rodzaj kamienia i docelowe gniazdo,
kamień oraz osobno przedmiot i gniazdo źródłowe. Kamienie odkładane trafiają do osobnej
karty puli wolnych kamieni. Przed osadzaniem należy opróżnić wskazane gniazda źródłowe;
pełna kolejność operacji pozostaje w instrukcji mobilnej.
Ponowne osadzenie w tym samym gnieździe tego samego przedmiotu nie zwiększa
licznika przeniesień.

Grupowanie nie zmienia danych ani kolejności wykonania: ścieżka epik 9★ → legenda
1★ → docelowe gwiazdki pozostaje widoczna w ulepszeniu przedmiotu. Rozwijany panel
w obu wersjach nazywa się „Szczegóły”. Na telefonie zawiera instrukcję, która zachowuje
wszystkie operacje kolejnych konfiguracji, włącznie z wyjęciem kamieni i wymaganą
kolejnością przemiany. Na komputerze pokazuje stan przed poziomem oraz po wszystkich
jego działaniach i wyróżnia zmienione kamienie. Sloty zarezerwowane na resy są pomijane
w szczegółach wyposażenia. Obie wersje
kończą się podsumowaniem statystyk końcowego wyposażenia etapu. Przy zarezerwowanych
slotach widnieje „Statystyki nie uwzględniają synergetyków”. Nazwy kamieni zawierają
rozmiar oraz poziom. Opisy wyjmowania, wkładania i przenoszenia wskazują nazwę
przedmiotu, slot i gniazdo po właściwej stronie zmiany wyposażenia. Wymiana
kamieni w tym samym przedmiocie pokazuje stary i nowy kamień; ulepszenie tej samej
sztuki pozostaje ulepszeniem. Identyfikatory sztuk służą odtwarzaniu operacji,
bez numerowanych etykiet „Drif 1” lub „Orb 1” w interfejsie.

Pole „Twój poziom” wskazuje najbliższy nieodhaczony próg na tym lub wyższym
poziomie; nie odhacza automatycznie wcześniejszych etapów. Checklista dotyczy
konkretnego celu i wygenerowanych instrukcji. Poziom i odhaczenia są zapisywane
lokalnie, osobno od projektu v2. Po ponownym otwarciu „Odtwórz plan” generuje
świeży raport z API; aplikacja nie przywraca historycznego raportu jako aktualnego.
Przy identycznym wejściu i instrukcjach odtwarza poziom i checklistę. Zmiana celu,
profesji, rezerwacji, opcji planowania albo instrukcji usuwa odhaczenia z widoku
z komunikatem o konieczności ponownego sprawdzenia etapów. Poziom postaci pozostaje
zachowany w granicach nowego celu. Przechowywany jest ostatni checkpoint; samo
planowanie innego celu nie nadpisuje go, dopóki użytkownik nie zmieni poziomu
lub odhaczenia. Błąd zapisu pozostawia stan w karcie i udostępnia ponowienie.
Checklista nie jest częścią eksportowanego projektu v2. Eksport karty obejmuje końcową
konfigurację danego poziomu, po wszystkich jego działaniach.

## API, zapis i eksport

`POST /api/progression-path/plan` przyjmuje `characterClass`, `targetLevel`,
`targetEquipment` oraz opcjonalne `resSlots`, `balanceStats` (domyślnie `false`)
i `minItemLevelGap` (domyślnie 0). Zajęty zarezerwowany slot jest
odrzucany przez API; frontend nakłada rezerwację na kopię celu przed wysłaniem.
Kontrakt znajduje się w [OpenAPI](openapi.yaml). Raport zawiera etapy, operacje
kamieni, zmiany przedmiotów, pozostałe wolne drify, rezerwacje oraz metadane
`BACKWARD_PROJECTION` albo `BALANCED_BACKWARD_PROJECTION`, z `proofComplete: false`. Endpoint współdzieli limit
kosztownych obliczeń i pamięci z optymalizatorem.

Projekt `broken-ranks-tool-progression-path` v2 zapisuje tylko cel, profesję,
rezerwacje, `balanceStats` i `minItemLevelGap`, bez historycznego raportu. Starszy
v2 bez tych opcji zachowuje odpowiednio `false` i 0. Import starszego projektu v1 jawnie
przyjmuje ostatni ręczny etap jako cel; wcześniejsze etapy są generowane ponownie.
Starszy lokalny zapis v1 pozostaje dostępny. Błędny zapis nie jest nadpisywany
przed jawną edycją lub importem.

Eksport etapu tworzy zwykły plik buildu z faktycznym wyposażeniem i statystykami,
pustym plecakiem i bez blokad. Nie przenosi pełnych punktów celu na wczesny etap.
Rezerwacje res zachowuje projekt ścieżki; zwykły format buildu nie zawiera ich
oznaczeń. Planowanie i eksport nie zmieniają aktywnego kreatora ani plecaka.
Zmiana wejścia unieważnia wynik i oczekujące odpowiedzi.
