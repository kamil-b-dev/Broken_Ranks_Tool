# Backend

API Spring Boot 3 uruchamiane na Javie 21.

Pakiety najwyższego poziomu odpowiadają funkcjom i kierunkowi zależności:

- `catalog` — publiczny odczyt katalogu i DTO inicjalizujące frontend,
- `equipment` — reguły domenowe, walidacja i kalkulator statystyk,
- `optimization` — doradca oraz silnik optymalizacji,
- `core` — konfiguracja i współdzielona infrastruktura HTTP.

Lokalny profil czyta wersjonowany katalog z `database/catalog/broken_ranks.db`.
Zasady jego aktualizacji opisuje `database/README.md`.

```powershell
./mvnw spring-boot:run
./mvnw clean verify
```
