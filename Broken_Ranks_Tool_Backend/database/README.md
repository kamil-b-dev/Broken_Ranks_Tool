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
docelowej kopii i migracji; odmawia modyfikacji pliku źródłowego.

Pliki robocze SQLite (`-journal`, `-shm`, `-wal`) są ignorowane i nie powinny trafiać
do repozytorium.
