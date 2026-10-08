# Dane katalogowe

`catalog/broken_ranks.db` jest wersjonowaną, tylko-do-odczytu bazą SQLite zawierającą
publiczny katalog przedmiotów, orbów i drifów. Aplikacja nie zapisuje w niej danych
użytkowników.

Baza przechowuje również wersjonowane wzorce buildów udowodnione przez deweloperski
oracle. Są to dane referencyjne, nie konfiguracje użytkowników. Każdy rekord zachowuje
definicję strategii, status dowodu, datę, wartości celów oraz pełny importowalny JSON.
Status `OPTIMAL` oznacza domknięty dowód całej hierarchii, a `BEST_KNOWN` poprawny
najlepszy znaleziony wynik bez pełnego dowodu optimum.

Zmiany schematu i danych przygotowuj jako tymczasowe skrypty robocze w `migrations/`,
wykonuj na kopii bazy, a dopiero po weryfikacji zastępuj plik katalogowy. Po zapisaniu
zmiany w wersjonowanym pliku `.db` usuń zastosowany skrypt z repozytorium. Aplikacja
nie wykonuje migracji katalogu przy starcie. Po zmianie uruchom pełne `mvn clean verify`
oraz sprawdź endpoint `/api/initial-data`.

Pojedynczą migrację można zastosować do kopii za pomocą
`tools/ApplySqliteMigration.java`. Narzędzie wymaga ścieżek do źródłowej bazy,
docelowej kopii i migracji. Źródło pozostaje nietknięte. Plik docelowy musi być nowy:
narzędzie nigdy nie nadpisuje istniejącego pliku ani nie pozwala wskazać domyślnej
ścieżki `database/catalog/broken_ranks.db` jako celu, także gdy katalog został usunięty.

Źródło jest otwierane przez SQLite w trybie `mode=ro`, a kopia powstaje przez online backup.
Obejmuje ona również zatwierdzone strony WAL, bez checkpointu źródła. Ewentualny checkpoint
po migracji dotyczy wyłącznie własnej kopii roboczej przed jej publikacją.

SQL jest wykonywany parserem SQLite na kopii roboczej, w jednej transakcji. Literały,
komentarze i triggery mogą zawierać średniki. Narzędzie odrzuca sterowanie transakcją
(`BEGIN`, `COMMIT`, `END`, `ROLLBACK`, `SAVEPOINT`, `RELEASE`) poza ciałem triggera,
dołączanie innych baz (`ATTACH`, `DETACH`), `VACUUM`, ładowanie rozszerzeń oraz ustawienia
zewnętrznych katalogów plików tymczasowych. Słowa kluczowe wewnątrz literałów i cytowanych
nazw nie są operacjami. Nowa kopia docelowa jest tworzona dopiero po poprawnym
wykonaniu skryptu. Błąd SQL wycofuje zmiany i usuwa kopię roboczą, bez usuwania
istniejącej bazy docelowej. Utworzenie celu przez `CREATE_NEW` chroni również przed
nadpisaniem pliku, który pojawił się podczas wykonywania migracji.

Pliki robocze SQLite (`-journal`, `-shm`, `-wal`) są ignorowane i nie powinny trafiać
do repozytorium.
