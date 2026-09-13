# Dane katalogowe

`catalog/broken_ranks.db` jest wersjonowaną, tylko-do-odczytu bazą SQLite zawierającą
publiczny katalog przedmiotów, orbów i drifów. Aplikacja nie zapisuje w niej danych
użytkowników.

Zmiany schematu i danych przygotowuj jako skrypty w `migrations/`, wykonuj na kopii
bazy, a dopiero po weryfikacji zastępuj plik katalogowy. Po zmianie uruchom pełne
`mvn clean verify` oraz sprawdź endpoint `/api/initial-data`.

Pliki robocze SQLite (`-journal`, `-shm`, `-wal`) są ignorowane i nie powinny trafiać
do repozytorium.
