# Broken Ranks Tool

Aplikacja webowa do budowania ekwipunku, obliczania statystyk i optymalizacji buildów
w Broken Ranks. Repozytorium zawiera frontend React/Vite, backend Spring Boot oraz
wersjonowany, tylko-do-odczytu katalog SQLite.

## Struktura

- `Broken_Ranks_Tool_Frontend/` — interfejs użytkownika pogrupowany według funkcji:
  builder, optymalizator, biblioteka buildów i wspólna domena ekwipunku.
- `Broken_Ranks_Tool_Backend/` — API z modułami katalogu, kalkulatora ekwipunku,
  optymalizacji i wspólnej infrastruktury HTTP.
- `docs/reguly-ekwipunku.md` — źródło reguł domenowych obowiązujących wszystkie
  warstwy aplikacji.
- `Dockerfile`, `.railway/` i `DEPLOYMENT.md` — produkcyjny obraz oraz konfiguracja
  Railway.

## Uruchomienie lokalne

Wymagane są Java 21 i Node.js 22. Najpierw uruchom API:

```powershell
cd Broken_Ranks_Tool_Backend
./mvnw spring-boot:run
```

W drugim terminalu uruchom frontend; Vite przekieruje `/api` na port `8080`:

```powershell
cd Broken_Ranks_Tool_Frontend
npm ci
npm run dev
```

## Weryfikacja

```powershell
cd Broken_Ranks_Tool_Backend
./mvnw clean verify

cd ../Broken_Ranks_Tool_Frontend
npm run format:check
npm run lint
npm run test:coverage
npm run build
npm run check:bundle-size
npm run test:e2e
```

Pełny smoke test obrazu produkcyjnego wymaga Dockera i jest dostępny jako
`.\scripts\smoke-test.ps1`.

## Przepływ zmian

Zmiany trafiają na gałąź `dev`. Po testach i przeglądzie pull request scala `dev`
do `master`; `master` jest źródłem wdrożenia produkcyjnego. GitHub Actions uruchamia
testy jakości dla obu gałęzi, audyt zależności dla pull requestów i pełny smoke test
kontenera po zmianie `master`.

Szczegóły konfiguracji Railway, limitów zasobów i kontroli po wdrożeniu opisuje
[`DEPLOYMENT.md`](DEPLOYMENT.md).
