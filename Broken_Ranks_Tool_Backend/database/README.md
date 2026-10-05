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

SQL jest wykonywany parserem SQLite na kopii roboczej, w jednej transakcji. Literały,
komentarze i triggery mogą zawierać średniki. Skrypt nie powinien sterować transakcją
przez `BEGIN`, `COMMIT`, `ROLLBACK` ani zawierać operacji wymagających pracy poza
transakcją, takich jak `VACUUM`. Nowa kopia docelowa jest tworzona dopiero po poprawnym
wykonaniu skryptu. Błąd SQL wycofuje zmiany i usuwa kopię roboczą, bez usuwania
istniejącej bazy docelowej. Utworzenie celu przez `CREATE_NEW` chroni również przed
nadpisaniem pliku, który pojawił się podczas wykonywania migracji.

Pliki robocze SQLite (`-journal`, `-shm`, `-wal`) są ignorowane i nie powinny trafiać
do repozytorium.
