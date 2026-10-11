# Zgodność zapisanych buildów JSON

Plik buildu jest trwałym formatem danych, niezależnym od stanu React i od kontraktu żądania kalkulatora. Aktualny eksport ma `format: "broken-ranks-tool-build"` i `version: 1`. Import obsługuje wersję 1 poprzez jawny rejestr czytników w `features/builds/buildFile.js`; nie porównuje wersji pliku z bieżącą wersją eksportera.

## Kontrakt wersji 1

Schemat [build-file-v1.schema.json](build-file-v1.schema.json) opisuje strukturę zapisu. Obowiązkowe są `format`, `version`, `build`, `build.requestData` i `build.requestData.slots`. Eksporter zapisuje tylko poniższe pola, kopiując ich wartości do niezależnego snapshotu:

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

Automatyczny draft ekwipunku korzysta z `broken-ranks-tool.equipment-draft.v1` i dokumentu `{ "version": 1, "value": { ... } }`, gdzie `value` zawiera `requestData`, `characterConfig`, `lockedSlots` i `lockedDrifs`. Stały fixture sprawdza również zachowanie tego klucza, wersji i danych przy odczycie oraz ponownym zapisie.

## Zasady aktualizacji

1. Nie zmieniaj znaczenia, nazw, typów ani obowiązkowości istniejących pól v1. Nie używaj tego numeru dla innej struktury.
2. Zmiana modelu edytora lub DTO API wymaga sprawdzenia jawnego mapowania w `buildPayload.js` oraz czytnika v1. Nowe pola techniczne stanu nie mają automatycznie trafiać do pliku.
3. Dla nowej struktury dodaj osobny schemat, eksporter oraz czytnik/migrację nowej wersji. Zachowaj rejestrację v1 i wszystkie stare fixture'y. Nieznanej wersji nie importuj jako aktualnej.
4. Jeśli zmieniasz bibliotekę, zachowaj odczyt dotychczasowego klucza i dodaj migrację przed zapisem do nowego. Nie traktuj starej wersji jako pustej biblioteki, która może zostać nadpisana.
5. Fixture'y w `src/test/fixtures/builds/compatibility` są trwałymi przykładami kontraktu. Nie regeneruj ich z aktualnego eksportera i nie aktualizuj wyłącznie po to, by test zaczął przechodzić. Dodawaj kolejne przykłady przy nowych wersjach. Dwa wcześniejsze pliki `legacy-epic-build.json` i `archer-endgame-build.json` także pozostają testami kompatybilności.

## Kontrole w CI

`npm run test:contracts` w root uruchamia test schematu i dokładnego eksportu v1. Istniejące zadanie `infrastructure` już uruchamia to polecenie. Test niezależnego wejścia edytora i stałego JSON-a wykrywa zmianę dowolnego pola eksportu poza czasem zapisu.

Frontendowe `buildCompatibility.test.js` sprawdza import stałych JSON-ów, domyślne wartości, historyczne kontenery poziomów, ponowny eksport, bibliotekę i odczyt v1 po symulowanej zmianie aktualnych stałych formatu i wersji. Standardowy zestaw Vitest w CI obejmuje ten plik.
