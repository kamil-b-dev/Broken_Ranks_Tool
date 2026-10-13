# Zgodność zapisanych buildów JSON

Plik buildu jest trwałym formatem danych, niezależnym od stanu React i od kontraktu żądania kalkulatora. Aktualny eksport ma `format: "broken-ranks-tool-build"` i `version: 3`. Import obsługuje wersje 1, 2 i 3 poprzez jawny rejestr czytników w `features/builds/buildFile.js`; nie porównuje wersji pliku z bieżącą wersją eksportera.

## Kontrakt wersji 1

Schemat [build-file-v1.schema.json](build-file-v1.schema.json) opisuje strukturę zapisu. Obowiązkowe są `format`, `version`, `build`, `build.requestData` i `build.requestData.slots`. Wersja 1 zachowuje poniższe pola, kopiowane do niezależnego snapshotu. Testy nadal sprawdzają jawny eksporter v1, a obecny eksporter v2 używa tych samych pól ekwipunku:

| Ścieżka                            | Znaczenie                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `exportedAt`                       | Czas eksportu ISO 8601; stare pliki mogą go nie mieć                                        |
| `build.requestData.slots.<slot>`   | Przedmiot i kamienie: `itemId`, `itemStars`, `orbIds`, `orbLevels`, `drifIds`, `drifLevels` |
| `build.requestData.characterStats` | Bazowe statystyki postaci; brak/null oznacza pustą mapę                                     |
| `build.characterConfig`            | Poziom i rozdział punktów: `level`, `spentPoints`; brak/null oznacza brak konfiguracji      |
| `build.lockedSlots`                | Lista zablokowanych slotów; brak oznacza pustą listę                                        |
| `build.lockedDrifs`                | Indeksy zablokowanych drifów według slota; brak oznacza pustą mapę                          |

Wersja 1 zachowuje liczbowe i tekstowe ID oraz puste pozycje kamieni (`null` i historyczne `""`). Historyczne tablice poziomów drifów i mapy poziomów orbów pozostają obsługiwane. Po walidacji importer przekształca je odpowiednio w mapy oraz tablice liczbowych poziomów. Brak gwiazdek lub null oznacza 1; brak poziomu zajętego kamienia oznacza 1. Dodatkowe metadane starego pliku nie blokują importu i nie są publikowane w stanie ekwipunku.

Schemat nie potwierdza dopasowania przedmiotu do slotu, pojemności, typu wbudowanych drifów ani istnienia ID w katalogu. To nadal sprawdza wspólna walidacja importu. Zmiana katalogu lub reguł gry może sprawić, że stare wyposażenie będzie niepoprawne domenowo; migracja formatu nie może w takim przypadku po cichu usuwać kamieni ani omijać walidacji.

Końcowe puste miejsca orbów oraz odpowiadające im placeholdery poziomu `null` są pomijane. Nie oznaczają zajętych gniazd. Poziom `null` na zajętym orbie, osierocony rzeczywisty poziom i luka przed kolejnym orbem pozostają błędem. Tolerancja dodatkowych metadanych pliku jest zachowana mimo ścisłej kontroli nazw pól w HTTP API.

Biblioteka przeglądarki używa klucza `broken-ranks-tool.build-library.v1` i osobnego dokumentu `{ "version": 1, "builds": [...] }`. Każdy rekord zachowuje `id`, `name`, `savedAt`, `updatedAt`, `payload`, `stats` i `statSources`. `payload` zawiera ten sam plik buildu v1. Historyczne statystyki służą porównaniu; po wczytaniu build jest przeliczany według bieżących reguł.

Historyczny automatyczny draft ekwipunku korzysta z `broken-ranks-tool.equipment-draft.v1` i dokumentu `{ "version": 1, "value": { ... } }`, gdzie `value` zawiera `requestData`, `characterConfig`, `lockedSlots` i `lockedDrifs`. Stały fixture sprawdza również zachowanie tego klucza, wersji i danych przy odczycie oraz ponownym zapisie.

## Zasady aktualizacji

1. Nie zmieniaj znaczenia, nazw, typów ani obowiązkowości istniejących pól v1. Nie używaj tego numeru dla innej struktury.
2. Zmiana modelu edytora lub DTO API wymaga sprawdzenia jawnego mapowania w `buildPayload.js` oraz czytnika v1. Nowe pola techniczne stanu nie mają automatycznie trafiać do pliku.
3. Dla nowej struktury dodaj osobny schemat, eksporter oraz czytnik/migrację nowej wersji. Zachowaj rejestrację v1 i wszystkie stare fixture'y. Nieznanej wersji nie importuj jako aktualnej.
4. Jeśli zmieniasz bibliotekę, zachowaj odczyt dotychczasowego klucza i dodaj migrację przed zapisem do nowego. Nie traktuj starej wersji jako pustej biblioteki, która może zostać nadpisana.
5. Fixture'y w `src/test/fixtures/builds/compatibility` są trwałymi przykładami kontraktu. Nie regeneruj ich z aktualnego eksportera i nie aktualizuj wyłącznie po to, by test zaczął przechodzić. Dodawaj kolejne przykłady przy nowych wersjach. Dwa wcześniejsze pliki `legacy-epic-build.json` i `archer-endgame-build.json` także pozostają testami kompatybilności.

## Kontrole w CI

`npm run test:contracts` w root uruchamia test schematu i dokładnego eksportu v1. Istniejące zadanie `infrastructure` już uruchamia to polecenie. Test niezależnego wejścia edytora i stałego JSON-a wykrywa zmianę dowolnego pola eksportu poza czasem zapisu.

Frontendowe `buildCompatibility.test.js` sprawdza import stałych JSON-ów, domyślne wartości, historyczne kontenery poziomów, ponowny eksport, bibliotekę i odczyt v1 po symulowanej zmianie aktualnych stałych formatu i wersji. Standardowy zestaw Vitest w CI obejmuje ten plik.

## Wersja 2: plecak

Schemat [build-file-v2.schema.json](build-file-v2.schema.json) zachowuje znaczenie pól v1 i dodaje obowiązkową listę `build.backpack` (pusta lista dla starszego buildu). Każdy wpis ma własne stabilne `id`; kolejność listy jest kolejnością w siatce. `ITEM` zawiera `equipment` z sześcioma polami slota (`itemId`, `itemStars`, `orbIds`, `orbLevels`, `drifIds`, `drifLevels`). `ORB` oraz `DRIF` zawierają `templateId` i `level`. ID wystąpienia odróżnia kopie tego samego szablonu. Rozmiar kamienia wynika z szablonu. Plecak mieści maksymalnie 200 wpisów. Przedmiot wraz z osadzonymi orbami i drifami zajmuje jeden slot; każdy osobny kamień także zajmuje jeden slot. Format, importer i operacje edytora odrzucają przekroczenie limitu bez przycinania listy.

Struktura plecaka jest walidowana podczas importu, lecz jego przedmioty mogą być roboczymi konfiguracjami przekraczającymi pojemność. Pozostają w zapisie i mają ostrzeżenie w UI. Zawartość plecaka jest sprawdzana niezależnie od założonego buildu oraz innych alternatyw, więc orb tego samego typu może istnieć na różnych potencjalnych zamiennikach. Nieznane już w katalogu ID są zachowane z ostrzeżeniem, a nie usuwane. Potwierdzenie poprawności potencjalnego zamiennika nie oznacza jeszcze zgodności z ograniczeniami konkretnego trybu optymalizatora.

Odczyt v1 nadal zwraca dotychczasowe pola i nie zależy od aktualnej wersji eksportera. Aplikacja po wczytaniu v1 nadaje mu pusty plecak. Nie zmieniono starych fixture'ów, schematu v1 ani klucza biblioteki. Biblioteka `broken-ranks-tool.build-library.v1` może przechowywać rekordy z payloadem v1 lub v2, ponieważ jej własna struktura się nie zmienia.

Nowy draft ekwipunku używa `broken-ranks-tool.equipment-draft.v2`, wrappera `version: 2` i wartości rozszerzonej o `backpack`. Gdy nowy klucz nie istnieje, czytnik odczytuje stary klucz v1. Pierwszy zapis tworzy v2 i zachowuje oryginalny v1. Istniejący nieczytelny klucz v2 nie powoduje cofnięcia do starego v1; przed nadpisaniem jest zachowana dokładna kopia `.recovery`, a niemożność zapisania kopii blokuje automatyczne zapisy. Draft optymalizatora nadal używa własnej wersji 1.

Plecak pozostaje osobnym stanem od `requestData` i nie trafia do HTTP kalkulatora. Dobór przedmiotów i orbów przez optymalizator pozostaje poza zakresem integracji.

## Wersja 3: wybór drifów do optymalizacji

Schemat [build-file-v3.schema.json](build-file-v3.schema.json) zachowuje konfigurację v2 i dodaje opcjonalne pole boolean `sendToBackend` na osobnych wpisach `DRIF`. Brak pola oznacza brak zaznaczenia; eksporter pomija wartość false. Przedmioty, orby oraz drify osadzone w przedmiotach nie są zaznaczane. Czytnik v2 ignoruje te metadane, a import v1 nadal tworzy pusty plecak. Biblioteka zachowuje własną wersję 1 i może przechowywać payloady wszystkich trzech wersji.

Aktualny draft używa `broken-ranks-tool.equipment-draft.v3` i wrappera `version: 3`. Przy braku tego klucza odczytywane są kolejno v2 i v1. Pierwszy zapis tworzy v3, zachowując wcześniejsze klucze. Nieczytelny bieżący dokument nie jest zastępowany starszym; mechanizm kopii `.recovery` nadal chroni dane przed nadpisaniem.
