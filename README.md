# Broken Ranks Tool

Aplikacja webowa do budowania ekwipunku, obliczania statystyk i optymalizacji buildów
w Broken Ranks. Repozytorium zawiera frontend React/Vite, backend Spring Boot oraz
wersjonowany, tylko-do-odczytu katalog SQLite.

## Struktura

- `Broken_Ranks_Tool_Frontend/` — interfejs użytkownika pogrupowany według funkcji:
  builder, optymalizator, biblioteka buildów i wspólna domena ekwipunku.
- `Broken_Ranks_Tool_Backend/` — API z modułami katalogu, kalkulatora ekwipunku,
  optymalizacji i wspólnej infrastruktury HTTP.
- `docs/openapi.yaml` — wersjonowany kontrakt publicznego API.
- `Dockerfile`, `.railway/` i `DEPLOYMENT.md` — produkcyjny obraz oraz konfiguracja
  Railway.

## Uruchomienie lokalne

Wymagane są Java 21 i Node.js 22.13 lub nowszy. Najpierw uruchom API:

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

## Integracja z rzeczywistym API

`npm run test:integration` uruchamia przeglądarkę i frontend połączony z backendem
na porcie `8082`. Testy korzystają z katalogu SQLite i odpowiedzi działającego API.
Obejmują import i zapis buildów, optymalizację, anulowanie Doradcy, kontrakt API oraz
zakładanie przedmiotów i kamieni z plecaka na desktopie i telefonie. Sprawdzają także
obsługę błędów kalkulatora i zgodność prezentowanych wyników z odpowiedzią backendu.

W PowerShellu uruchom backend z katalogu głównego repozytorium:

```powershell
cd Broken_Ranks_Tool_Backend
./mvnw.cmd --batch-mode -DskipTests package
if ($LASTEXITCODE -ne 0) { throw "Budowanie backendu nie powiodło się." }
$catalogPath = (Resolve-Path database/catalog/broken_ranks.db).Path.Replace('\', '/')
java -Xmx2g -jar target/Broken_Ranks_Tool_Backend-0.0.1-SNAPSHOT.jar `
    --server.address=127.0.0.1 --server.port=8082 --spring.profiles.active=prod `
    "--spring.datasource.url=jdbc:sqlite:file:${catalogPath}?mode=ro" `
    --abuse-protection.optimizer.client-requests-per-minute=300 `
    --abuse-protection.optimizer.global-requests-per-minute=300 `
    --abuse-protection.calculator.client-requests-per-minute=3000 `
    --abuse-protection.calculator.global-requests-per-minute=3000 `
    --abuse-protection.public-data.client-requests-per-minute=3000 `
    --abuse-protection.public-data.global-requests-per-minute=3000 `
    --abuse-protection.control.client-requests-per-minute=300 `
    --abuse-protection.control.global-requests-per-minute=300
```

Po uruchomieniu backendu wykonaj w drugim terminalu:

```powershell
cd Broken_Ranks_Tool_Frontend
npm ci
npx playwright install chromium
npm run test:integration
```

Podwyższone limity żądań obowiązują w tym lokalnym procesie testowym. Katalog jest
otwarty tylko do odczytu. Po testach zakończ backend przez `Ctrl+C`.
Ten sam zestaw uruchamia zadanie `Real frontend-backend integration` w GitHub Actions.

## Przepływ zmian

Zmiany trafiają na gałąź `dev`. Po testach i przeglądzie pull request scala `dev`
do `master`; `master` jest źródłem wdrożenia produkcyjnego. GitHub Actions uruchamia
testy jakości dla obu gałęzi, audyt zależności dla pull requestów i pełny smoke test
kontenera po zmianie `master`.

Szczegóły konfiguracji Railway, limitów zasobów i kontroli po wdrożeniu opisuje
[`DEPLOYMENT.md`](DEPLOYMENT.md).

Zasady prywatnego zgłaszania podatności opisuje [`SECURITY.md`](SECURITY.md).

## Licencja

Oryginalny kod źródłowy Broken Ranks Tool jest udostępniany na warunkach
[`GNU Affero General Public License v3.0`](LICENSE). Zmodyfikowana wersja
udostępniana użytkownikom przez sieć musi zapewniać im dostęp do odpowiadającego
jej kodu źródłowego zgodnie z AGPL-3.0.

Informację o autorze i źródłowym repozytorium zawiera plik [`NOTICE`](NOTICE).
Wyłączenia dotyczące nazw, znaków, grafik i innych materiałów osób trzecich
opisano w [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
